import React, {useCallback, useEffect, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AppText} from '../../components/common/AppText';
import {ContentColumn} from '../../components/common/ContentColumn';
import {ChatIcon, PhoneIcon} from '../../components/common/Icons';
import {LiveMap} from '../../components/feedback/LiveMap';
import {
  MapChromeBack,
  MapChromePill,
} from '../../components/headers/MapChrome';
import {PrimaryButton} from '../../components/buttons/PrimaryButton';
import {OutlineButton} from '../../components/buttons/OutlineButton';
import {useAppNavigation} from '../../hooks/useAppNavigation';
import {useHardwareBack} from '../../hooks/useHardwareBack';
import {resetTo} from '../../navigation/navigationRef';
import {useRider} from '../../store/RiderContext';
import {activeOrder} from '../../store/selectors';
import {orderApi} from '../../services/api/orderApi';
import {applyDetailCoords, deliverDestination} from '../../utils/mapCoords';
import {openDialer} from '../../utils/phone';
import {colors} from '../../theme';
import {MIN_TOUCH} from '../../theme/layout';
import type {LatLng} from 'react-native-maps';

function toLatLng(
  point?: {latitude: number; longitude: number} | null,
): LatLng | null {
  if (
    !point ||
    !Number.isFinite(point.latitude) ||
    !Number.isFinite(point.longitude)
  ) {
    return null;
  }
  return {latitude: point.latitude, longitude: point.longitude};
}

export function NavScreen() {
  const nav = useAppNavigation();
  const {state, actions} = useRider();
  const a = activeOrder(state);

  useHardwareBack(
    useCallback(() => {
      resetTo('Main', {screen: 'Orders'});
      return true;
    }, []),
  );
  const [destination, setDestination] = useState<LatLng | null>(
    toLatLng(a?.deliverCoords),
  );
  const [routeLabel, setRouteLabel] = useState<string | null>(null);

  useEffect(() => {
    setDestination(toLatLng(a?.deliverCoords));
    if (!a?.id) {
      return;
    }
    let cancelled = false;
    (async () => {
      const detail = await orderApi.getOrderDetail(a.id);
      if (cancelled || !detail.ok || !detail.data) {
        return;
      }
      const enriched = applyDetailCoords(a, detail.data);
      const drop = deliverDestination(enriched, detail.data);
      if (drop) {
        setDestination(drop);
      }
      const delivery = detail.data.delivery;
      const deliverLabel =
        (delivery && typeof delivery === 'object' && delivery.address) ||
        detail.data.deliver ||
        enriched.deliver ||
        a.deliver;
      actions.patch({
        orders: state.orders.map(o =>
          o.id === a.id
            ? {
                ...o,
                ...enriched,
                ...(deliverLabel ? {deliver: deliverLabel} : {}),
              }
            : o,
        ),
      });
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally depend on order id only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a?.id]);

  if (!a) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={[styles.flex, styles.empty]}>
          <AppText style={styles.emptyText}>No active order</AppText>
        </View>
      </SafeAreaView>
    );
  }

  // Live GPS → customer. Never fall back to hardcoded hub→drop figures.
  const etaText = routeLabel || (destination ? 'Getting route…' : 'ETA unavailable');

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.flex}>
        <View style={styles.mapArea}>
          <LiveMap
            fill
            animateBike
            direction="toCustomer"
            accent={colors.primary}
            destination={destination}
            onRouteInfo={info => {
              if (!info) {
                setRouteLabel('ETA unavailable');
                return;
              }
              if (info.etaUnavailable) {
                setRouteLabel(
                  info.distanceText
                    ? `${info.distanceText} · ETA unavailable`
                    : 'ETA unavailable',
                );
                return;
              }
              if (info.distanceText && info.durationText) {
                setRouteLabel(`${info.distanceText} · ${info.durationText}`);
              }
            }}
          />

          {/* Chrome and Call/Chat sit above the map tree so Android SurfaceView
              / lite map children cannot swallow presses meant for these controls. */}
          <View style={styles.mapChrome} pointerEvents="box-none">
            <MapChromeBack
              onPress={() => resetTo('Main', {screen: 'Orders'})}
            />
            <MapChromePill style={styles.statusPill}>
              <AppText style={styles.statusPillText}>Out for delivery</AppText>
            </MapChromePill>
            <View style={styles.floatCard}>
              <View style={styles.floatTop}>
                <View style={styles.floatIcon}>
                  <AppText style={styles.floatEmoji}>📍</AppText>
                </View>
                <View style={styles.floatText}>
                  <AppText style={styles.floatTitle} numberOfLines={2}>
                    {a.deliver || 'Delivery address'}
                  </AppText>
                  <AppText style={styles.floatSub} numberOfLines={1}>
                    {etaText}
                  </AppText>
                </View>
              </View>
              <View style={styles.callRow}>
                <Pressable
                  onPress={() => {
                    void openDialer(a.customerPhone);
                  }}
                  style={styles.callBtn}
                  hitSlop={8}>
                  <PhoneIcon size={15} color={colors.primary} />
                  <AppText style={styles.callBtnText}>Call</AppText>
                </Pressable>
                <Pressable
                  onPress={() =>
                    nav.navigate('OrderChat', {
                      orderId: a.id,
                      customerName: a.customerName,
                    })
                  }
                  style={styles.callBtn}
                  hitSlop={8}>
                  <ChatIcon size={15} color={colors.primary} />
                  <AppText style={styles.callBtnText}>Chat</AppText>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        <ContentColumn style={styles.footer}>
          <PrimaryButton
            label="I've Reached the Customer"
            onPress={() => {
              actions.setFlow('photo');
              nav.replace('Photo');
            }}
          />
          <OutlineButton
            label="Cancel order"
            tone="danger"
            height={46}
            borderRadius={999}
            onPress={actions.openCancel}
          />
        </ContentColumn>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.white},
  flex: {flex: 1},
  mapArea: {flex: 1, position: 'relative'},
  empty: {alignItems: 'center', justifyContent: 'center'},
  emptyText: {fontWeight: '600', fontSize: 14, color: colors.textMuted},
  mapChrome: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
    elevation: 16,
  },
  statusPill: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  statusPillText: {fontWeight: '700', fontSize: 12, color: colors.white},
  floatCard: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    elevation: 12,
    zIndex: 5,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: {width: 0, height: 8},
  },
  floatTop: {flexDirection: 'row', alignItems: 'center', gap: 12},
  floatIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.infoBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatEmoji: {fontSize: 18},
  floatText: {flex: 1, minWidth: 0},
  floatTitle: {fontWeight: '700', fontSize: 14, color: colors.ink},
  floatSub: {fontWeight: '400', fontSize: 12, color: colors.textMuted},
  callRow: {flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap'},
  callBtn: {
    flex: 1,
    minWidth: 120,
    minHeight: MIN_TOUCH,
    borderRadius: 10,
    backgroundColor: colors.fieldBg,
    borderWidth: 1,
    borderColor: colors.neutralTile,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  callBtnText: {fontWeight: '700', fontSize: 13, color: colors.primary},
  footer: {
    padding: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: 10,
    width: '100%',
    zIndex: 20,
    elevation: 24,
  },
});
