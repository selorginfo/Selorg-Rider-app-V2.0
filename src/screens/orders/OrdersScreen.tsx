import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Alert, Pressable, StyleSheet, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Screen} from '../../components/common/Screen';
import {AppText} from '../../components/common/AppText';
import {OrderCard} from '../../components/cards/OrderCard';
import {ActiveOrderCard} from '../../components/cards/ActiveOrderCard';
import {EmptyState} from '../../components/feedback/EmptyState';
import {useAppNavigation} from '../../hooks/useAppNavigation';
import {useRider} from '../../store/RiderContext';
import {
  activeOrder,
  availableOrders,
  deliveryMode,
  FLOW_LABELS,
  selectBulk,
} from '../../store/selectors';
import {orderApi} from '../../services/api/orderApi';
import {profileApi} from '../../services/api/profileApi';
import {bulkApi} from '../../services/api/bulkApi';
import {riderSocketService} from '../../services/realtime/riderSocketService';
import {clearedOrderPatch} from '../../constants/vehicles';
import type {BulkBatchStatus, FlowScreen} from '../../types';
import {colors} from '../../theme';

const FLOW_ROUTE: Record<
  string,
  keyof import('../../types/navigation').RootStackParamList
> = {
  accept: 'Accept',
  travel: 'Travel',
  bag: 'Bag',
  nav: 'Nav',
  photo: 'Photo',
  complete: 'Complete',
};

function mapBulkStatus(status: string): BulkBatchStatus {
  const s = status.toLowerCase();
  if (s === 'loading') {
    return 'loading';
  }
  if (s === 'ready') {
    return 'ready';
  }
  if (s === 'dispatched' || s === 'in_transit') {
    return 'dispatched';
  }
  if (s === 'completed') {
    return 'completed';
  }
  return 'assigned';
}

export function OrdersScreen() {
  const nav = useAppNavigation();
  const {state, actions} = useRider();
  const bulk = selectBulk(state);
  const isBulk = deliveryMode(state) === 'bulk';
  const avail = availableOrders(state);
  const a = activeOrder(state);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const prevVehicleRef = useRef(state.vehicleType);

  const fetchOrders = useCallback(async () => {
    const mode = deliveryMode(stateRef.current);
    actions.patch({ordersLoading: true, ordersError: ''});
    try {
      if (mode === 'bulk') {
        // Bulk vehicles: never show normal available orders.
        actions.patch({orders: []});
        const batchResult = await bulkApi.getBatch(
          stateRef.current.bulkBatchId || undefined,
        );
        if (batchResult.ok && batchResult.data) {
          const batch = batchResult.data;
          actions.patch({
            bulkBatchId: batch.id,
            bulkOrders: bulkApi.mapOrders(batch),
            bulkBatchStatus: mapBulkStatus(batch.status),
            ordersLoading: false,
            ordersError: '',
          });
        } else {
          actions.patch({
            bulkBatchId: '',
            bulkOrders: [],
            ordersLoading: false,
            ordersError: batchResult.error || 'Could not load bulk orders',
          });
        }
        return;
      }

      // Standard vehicles: never show bulk batch data.
      actions.patch({
        bulkBatchId: '',
        bulkOrders: [],
        bulkBatchStatus: 'assigned',
      });
      let hubId = stateRef.current.epHubId || stateRef.current.obHub;
      if (!hubId) {
        const profileRes = await profileApi.getProfile();
        hubId = profileRes.ok ? profileRes.data?.hub?.id ?? null : null;
      }
      const listed = await orderApi.listAvailable('all', hubId);
      if (!listed.ok) {
        const offlineish =
          listed.status === 0 ||
          listed.appCode === 'NETWORK_UNAVAILABLE' ||
          listed.appCode === 'TIMEOUT' ||
          /network|timeout|unavailable/i.test(listed.error || '');
        actions.patch({
          ordersLoading: false,
          ordersError: offlineish
            ? listed.error ||
              'Network unavailable. Check your connection and try again.'
            : listed.error || 'Could not load orders',
        });
        return;
      }
      const orders = listed.data ?? [];
      const prev = stateRef.current;
      const restored =
        orders.find(
          o =>
            o.assignedToMe ||
            o.riderStage === 'accepted' ||
            o.riderStage === 'picked_up',
        ) ?? null;
      const restore: {
        activeId?: string | null;
        flowScreen?: FlowScreen;
      } = {};
      if (restored) {
        restore.activeId = restored.id;
        if (prev.activeId === restored.id && prev.flowScreen) {
          if (
            restored.riderStage === 'picked_up' &&
            (prev.flowScreen === 'accept' ||
              prev.flowScreen === 'travel' ||
              prev.flowScreen === 'bag')
          ) {
            restore.flowScreen = 'nav';
          }
        } else {
          restore.flowScreen =
            restored.riderStage === 'picked_up' ? 'nav' : 'accept';
        }
      } else if (prev.activeId && !orders.some(o => o.id === prev.activeId)) {
        restore.activeId = null;
        restore.flowScreen = null;
      }
      actions.patch({
        orders,
        ordersLoading: false,
        ordersError: '',
        ...(hubId ? {epHubId: hubId} : {}),
        ...restore,
      });
    } catch (e) {
      actions.patch({
        ordersLoading: false,
        ordersError:
          e instanceof Error ? e.message : 'Could not load orders',
      });
    }
  }, [actions]);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
      // Fallback only — primary refresh is socket-driven (handover events).
      const iv = setInterval(fetchOrders, 30000);
      const refresh = () => {
        void fetchOrders();
      };
      const offs = [
        riderSocketService.on('order:ready_for_dispatch', refresh),
        riderSocketService.on('order.handed_over', refresh),
        riderSocketService.on('order.hhd_scanned', refresh),
        riderSocketService.on('order.picked', refresh),
      ];
      return () => {
        clearInterval(iv);
        offs.forEach(off => off());
      };
    }, [fetchOrders]),
  );

  // Vehicle change: clear stale lists immediately, then reload for the new mode.
  useEffect(() => {
    if (prevVehicleRef.current === state.vehicleType) {
      return;
    }
    prevVehicleRef.current = state.vehicleType;
    actions.patch(clearedOrderPatch());
    fetchOrders();
  }, [state.vehicleType, actions, fetchOrders]);

  const resume = () => {
    const target =
      FLOW_ROUTE[(state.flowScreen as Exclude<FlowScreen, null>) || 'accept'];
    nav.navigate(target as never);
  };

  const openBulk = () => {
    if (state.bulkBatchStatus === 'assigned') {
      nav.navigate('BulkOverview');
    } else if (state.bulkBatchStatus === 'loading') {
      nav.navigate('BulkLoading');
    } else {
      nav.navigate('BulkActive');
    }
  };

  const handleAccept = async (id: string) => {
    if (acceptingId) {
      return;
    }
    setAcceptingId(id);
    actions.patch({ordersError: ''});
    try {
      const result = await orderApi.accept(id);
      if (result.ok) {
        const accept = result.data;
        const pickupName =
          typeof accept?.pickup === 'string'
            ? accept.pickup
            : accept?.pickup?.name;
        const pickupAddress =
          typeof accept?.pickup === 'object'
            ? accept?.pickup?.address || undefined
            : undefined;
        const fee = accept?.deliveryFee ?? accept?.payout;
        const enriched = {
          ...(fee != null ? {payout: fee, deliveryFee: fee} : {}),
          ...(pickupName ? {pickup: pickupName} : {}),
          ...(pickupAddress ? {pickupAddress} : {}),
          ...(accept?.bay != null && accept.bay !== ''
            ? {bay: accept.bay}
            : {}),
          ...(accept?.bagCode ? {bagCode: accept.bagCode} : {}),
          ...(accept?.deliver ? {deliver: accept.deliver} : {}),
          ...(accept?.num
            ? {
                num: accept.num.startsWith('#')
                  ? accept.num
                  : `#${accept.num}`,
              }
            : {}),
          ...(accept?.raw ? {raw: accept.raw} : {}),
          riderStage: accept?.riderStage || 'accepted',
          assignedToMe: true,
        };

        // Prefer detail for complete rack/bag when accept payload is thin.
        const detail = await orderApi.getOrderDetail(id);
        if (detail.ok && detail.data) {
          const d = detail.data;
          const dPickup =
            typeof d.pickup === 'string' ? d.pickup : d.pickup?.name;
          const dAddr =
            typeof d.pickup === 'object' ? d.pickup?.address || undefined : undefined;
          const dFee = d.deliveryFee ?? d.payout;
          Object.assign(enriched, {
            ...(dFee != null ? {payout: dFee, deliveryFee: dFee} : {}),
            ...(dPickup ? {pickup: dPickup} : {}),
            ...(dAddr ? {pickupAddress: dAddr} : {}),
            ...(d.bay ? {bay: d.bay} : {}),
            ...(d.bagCode ? {bagCode: d.bagCode} : {}),
            ...(typeof d.deliver === 'string' && d.deliver
              ? {deliver: d.deliver}
              : d.delivery?.address
                ? {deliver: d.delivery.address}
                : {}),
          });
        }

        actions.patch({
          orders: stateRef.current.orders.map(o =>
            o.id === id ? {...o, ...enriched} : o,
          ),
        });
        actions.acceptOrder(id);
        nav.navigate('Accept');
      } else {
        const msg =
          result.appCode === 'ORDER_ALREADY_ASSIGNED'
            ? 'Another rider has already accepted this order.'
            : result.appCode === 'ORDER_OUT_OF_RADIUS'
              ? 'This order is outside your 5 km delivery radius.'
              : result.error || 'Could not accept order';
        actions.patch({ordersError: msg});
        Alert.alert('Could not accept', msg);
        void fetchOrders();
      }
    } catch {
      const msg = 'Could not accept order';
      actions.patch({ordersError: msg});
      Alert.alert('Error', msg);
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <Screen contentContainerStyle={styles.body}>
      <AppText style={styles.title}>Live Orders</AppText>
      <AppText style={styles.sub}>
        {isBulk
          ? 'Bulk batch assignments for your Auto'
          : 'New assignments and deliveries in progress'}
      </AppText>
      {!isBulk && !state.isOnline && (
        <View style={styles.offlineBanner}>
          <AppText style={styles.offlineBannerText}>
            You are offline. Go online from Home to see available orders after
            HSD handoff.
          </AppText>
        </View>
      )}

      {isBulk ? (
        <>
          {state.ordersLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : state.ordersError ? (
            <EmptyState
              title="Could not load bulk orders"
              subtitle={state.ordersError}
            />
          ) : bulk.notDone && bulk.total > 0 ? (
            <Pressable onPress={openBulk} style={styles.bulkBanner}>
              <View style={styles.bulkBannerTop}>
                <AppText style={styles.bulkBannerKicker}>
                  BULK BATCH · #{bulk.batchId}
                </AppText>
                <AppText style={styles.bulkBannerLink}>
                  {bulk.homeCardLabel} ›
                </AppText>
              </View>
              <AppText style={styles.bulkBannerLine}>
                {bulk.completed} delivered · {bulk.remaining} remaining ·{' '}
                {bulk.failed} failed
              </AppText>
            </Pressable>
          ) : (
            <EmptyState
              title="No bulk orders right now"
              subtitle="New bulk batches will appear here."
            />
          )}
        </>
      ) : (
        <>
          {!!state.activeId && a && (
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <AppText style={styles.sectionTitle}>Active Order</AppText>
                <View style={styles.countBadge}>
                  <AppText style={styles.countBadgeText}>1</AppText>
                </View>
              </View>
              <ActiveOrderCard
                statusLabel={
                  FLOW_LABELS[state.flowScreen || ''] || 'In progress'
                }
                num={a.num}
                deliver={a.deliver}
                meta={`${a.distance} · ${a.items} items · ₹${a.payout}`}
                onPress={resume}
              />
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <AppText style={styles.sectionTitle}>Available to Accept</AppText>
              <View style={styles.countBadge}>
                <AppText style={styles.countBadgeText}>{avail.length}</AppText>
              </View>
            </View>
            {state.ordersLoading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : state.ordersError ? (
              <EmptyState
                title="Could not load orders"
                subtitle={state.ordersError}
              />
            ) : avail.length > 0 ? (
              <View style={styles.list}>
                {avail.map(o => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    onAccept={() => handleAccept(o.id)}
                  />
                ))}
              </View>
            ) : (
              <EmptyState
                title="No new orders right now"
                subtitle="New assignments will appear here."
              />
            )}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {padding: 16, paddingBottom: 24},
  title: {
    fontWeight: '800',
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  sub: {fontWeight: '400', fontSize: 13, color: colors.textMuted, marginTop: 2},
  bulkBanner: {
    backgroundColor: colors.bulkDark,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  bulkBannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bulkBannerKicker: {
    fontWeight: '700',
    fontSize: 11,
    color: colors.bulkOnDark,
    letterSpacing: 0.6,
  },
  bulkBannerLink: {fontWeight: '700', fontSize: 12, color: colors.white},
  bulkBannerLine: {
    fontWeight: '700',
    fontSize: 13,
    color: colors.white,
    marginTop: 6,
  },
  section: {marginTop: 22},
  offlineBanner: {
    marginTop: 12,
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 12,
  },
  offlineBannerText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {fontWeight: '700', fontSize: 16, color: colors.ink},
  countBadge: {
    backgroundColor: colors.primaryTint,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  countBadgeText: {color: colors.primary, fontWeight: '700', fontSize: 11},
  loadingWrap: {paddingVertical: 32, alignItems: 'center'},
  list: {gap: 12},
});
