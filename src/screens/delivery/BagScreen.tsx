import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AppText} from '../../components/common/AppText';
import {Checkbox} from '../../components/inputs/Checkbox';
import {PrimaryButton} from '../../components/buttons/PrimaryButton';
import {useAppNavigation} from '../../hooks/useAppNavigation';
import {useHardwareBack} from '../../hooks/useHardwareBack';
import {resetTo} from '../../navigation/navigationRef';
import {useRider} from '../../store/RiderContext';
import {
  activeOrder,
  allItemsChecked,
  checkedCount,
} from '../../store/selectors';
import {orderApi} from '../../services/api/orderApi';
import {colors} from '../../theme';

export function BagScreen() {
  const nav = useAppNavigation();
  const {state, actions} = useRider();
  const a = activeOrder(state);
  const items = state.bagItems;
  const done = checkedCount(state);
  const allDone = allItemsChecked(state);

  useHardwareBack(
    useCallback(() => {
      resetTo('Main', {screen: 'Orders'});
      return true;
    }, []),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!state.activeId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [bagItems, detail] = await Promise.all([
          orderApi.getBagItems(state.activeId!),
          orderApi.getOrderDetail(state.activeId!),
        ]);
        if (!cancelled) {
          actions.patch({bagItems});
          if (detail.ok && detail.data) {
            const d = detail.data;
            const pickupName =
              typeof d.pickup === 'string' ? d.pickup : d.pickup?.name;
            actions.patch({
              orders: state.orders.map(o =>
                o.id === state.activeId
                  ? {
                      ...o,
                      ...(d.bagCode ? {bagCode: d.bagCode} : {}),
                      ...(d.bay ? {bay: d.bay} : {}),
                      ...(pickupName ? {pickup: pickupName} : {}),
                    }
                  : o,
              ),
            });
          }
        }
      } catch {
        if (!cancelled) {
          setError('Could not load bag items');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.activeId, actions]);

  async function handleConfirmPickup() {
    if (!state.activeId) {
      return;
    }
    setConfirming(true);
    setError('');
    try {
      const result = await orderApi.confirmPickup(state.activeId);
      if (result.ok) {
        actions.setFlow('nav');
        nav.replace('Nav');
      } else {
        setError(result.error || 'Could not confirm pickup');
      }
    } catch {
      setError('Could not confirm pickup');
    } finally {
      setConfirming(false);
    }
  }

  if (!a) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={[styles.flex, styles.centered]}>
          <AppText style={styles.errorText}>No active order</AppText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => resetTo('Main', {screen: 'Orders'})}
          hitSlop={10}>
          <AppText style={styles.back}>‹</AppText>
        </Pressable>
        <View>
          <AppText style={styles.title}>Verify & Collect</AppText>
          <AppText style={styles.sub}>
            {a.num} · {a.bay}
          </AppText>
        </View>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.body}>
        <View style={styles.bagBanner}>
          <View style={styles.bagIcon}>
            <AppText style={styles.bagEmoji}>🛍</AppText>
          </View>
          <View style={styles.bagText}>
            <AppText style={styles.bagTitle}>
              {a.bagCode ? `Bag ${a.bagCode}` : a.bay ? `Rack ${a.bay}` : a.num}
            </AppText>
            <AppText style={styles.bagSub}>
              {[a.pickup, a.bay].filter(Boolean).join(' · ') ||
                'Check each item before confirming'}
            </AppText>
          </View>
          <AppText style={styles.count}>
            {done}/{items.length}
          </AppText>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : error && items.length === 0 ? (
          <View style={styles.centered}>
            <AppText style={styles.errorText}>{error}</AppText>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((it, i) => {
              const checked = !!state.checked[i];
              return (
                <Pressable
                  key={`${it.name}-${i}`}
                  onPress={() => actions.toggleItem(i)}
                  style={[
                    styles.row,
                    {
                      borderColor: checked
                        ? 'rgba(35,114,39,.3)'
                        : colors.neutralTile,
                      backgroundColor: checked
                        ? colors.primaryTint06
                        : colors.white,
                    },
                  ]}>
                  <Checkbox
                    checked={checked}
                    onToggle={() => actions.toggleItem(i)}
                    boxOnly
                  />
                  <View style={styles.rowText}>
                    <AppText style={styles.itemName}>{it.name}</AppText>
                    <AppText style={styles.itemQty}>{it.qty}</AppText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
        {!!error && items.length > 0 && (
          <AppText style={styles.errorText}>{error}</AppText>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {confirming ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <PrimaryButton
            label={allDone ? 'Confirm Pickup' : 'Check all items to continue'}
            onPress={handleConfirmPickup}
            disabled={!allDone || loading}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.white},
  flex: {flex: 1},
  centered: {paddingVertical: 32, alignItems: 'center'},
  errorText: {
    fontWeight: '500',
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  back: {fontWeight: '700', fontSize: 22, color: colors.textSecondary},
  title: {fontWeight: '800', fontSize: 18, color: colors.ink},
  sub: {fontWeight: '400', fontSize: 12, color: colors.textMuted},
  body: {padding: 16},
  bagBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primaryTint06,
    borderWidth: 1,
    borderColor: 'rgba(35,114,39,.16)',
    borderRadius: 12,
    padding: 14,
  },
  bagIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bagEmoji: {fontSize: 18},
  bagText: {flex: 1},
  bagTitle: {fontWeight: '700', fontSize: 14, color: colors.ink},
  bagSub: {fontWeight: '400', fontSize: 12, color: colors.textMuted},
  count: {fontWeight: '800', fontSize: 15, color: colors.primary},
  list: {gap: 10, marginTop: 16},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
  rowText: {flex: 1},
  itemName: {fontWeight: '700', fontSize: 13, color: colors.ink},
  itemQty: {fontWeight: '400', fontSize: 11, color: colors.textMuted},
  footer: {padding: 16, borderTopWidth: 1, borderTopColor: colors.divider},
});
