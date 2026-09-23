import React, {useCallback} from 'react';
import {Pressable, ScrollView, StatusBar, StyleSheet, View} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {AppText} from '../../components/common/AppText';
import {ContentColumn} from '../../components/common/ContentColumn';
import {GradientView} from '../../components/common/GradientView';
import {PopIn} from '../../components/feedback/PopIn';
import {BigCheckIcon} from '../../components/common/Icons';
import {PickupDropTimeline} from '../../components/cards/PickupDropTimeline';
import {MiniStat} from '../../components/cards/StatCard';
import {PrimaryButton} from '../../components/buttons/PrimaryButton';
import {useAppNavigation} from '../../hooks/useAppNavigation';
import {useHardwareBack} from '../../hooks/useHardwareBack';
import {resetTo} from '../../navigation/navigationRef';
import {useRider} from '../../store/RiderContext';
import {activeOrder} from '../../store/selectors';
import {colors} from '../../theme';
import {MIN_TOUCH, useLayout} from '../../theme/layout';

export function AcceptScreen() {
  const nav = useAppNavigation();
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const {state, actions} = useRider();
  const a = activeOrder(state);

  const exitToOrders = useCallback(() => {
    resetTo('Main', {screen: 'Orders'});
    return true;
  }, []);
  useHardwareBack(exitToOrders);

  if (!a) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={[styles.flex, styles.empty]}>
          <AppText style={styles.emptyText}>No active order</AppText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.flex}>
        <GradientView
          colors={[colors.primary, colors.primaryDark]}
          angle={135}
          style={[styles.header, {paddingTop: insets.top + 26}]}>
          <Pressable
            onPress={() => resetTo('Main', {screen: 'Orders'})}
            accessibilityRole="button"
            accessibilityLabel="Back to Orders"
            style={[
              styles.backChip,
              {
                top: Math.max(insets.top, 8) + 6,
                left: Math.max(insets.left, 8) + 6,
              },
            ]}>
            <AppText style={styles.backGlyph}>‹</AppText>
          </Pressable>
          <PopIn style={styles.checkTile}>
            <BigCheckIcon size={38} />
          </PopIn>
          <AppText style={styles.title}>Order Accepted!</AppText>
          <AppText style={styles.sub} numberOfLines={2}>
            Head to the darkstore to pick up {a.num}
          </AppText>
        </GradientView>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.bodyScroll}
          showsVerticalScrollIndicator={false}>
          <ContentColumn style={styles.body}>
            <View style={styles.card}>
              <View style={styles.payoutRow}>
                <AppText style={styles.payoutLabel}>Delivery fee</AppText>
                <AppText style={styles.payoutValue}>
                  ₹{a.deliveryFee ?? a.payout}
                </AppText>
              </View>
              <View style={styles.divider} />
              <AppText style={styles.orderId}>{a.num}</AppText>
              <View style={styles.pickupBlock}>
                <AppText style={styles.pickupLabel}>Pickup</AppText>
                <AppText style={styles.pickupValue}>{a.pickup || '—'}</AppText>
                {!!a.pickupAddress && (
                  <AppText style={styles.pickupAddr}>{a.pickupAddress}</AppText>
                )}
              </View>
              {!!a.bay && (
                <View style={styles.metaRow}>
                  <AppText style={styles.metaLabel}>Rack</AppText>
                  <AppText style={styles.metaValue}>{a.bay}</AppText>
                </View>
              )}
              {!!a.bagCode && (
                <View style={styles.metaRow}>
                  <AppText style={styles.metaLabel}>Bag</AppText>
                  <AppText style={styles.metaValue}>{a.bagCode}</AppText>
                </View>
              )}
              <View style={styles.divider} />
              <PickupDropTimeline
                pickup={a.pickup}
                pickupSub={
                  [a.bay, a.bagCode].filter(Boolean).join(' · ') || undefined
                }
                deliver={a.deliver}
                minConnector={30}
              />
            </View>

            <View
              style={[
                styles.stats,
                layout.isCompact && styles.statsWrap,
              ]}>
              <View style={styles.statItem}>
                <MiniStat
                  value={a.distance || '—'}
                  label="Pickup→Customer"
                />
              </View>
              <View style={styles.statItem}>
                <MiniStat
                  value={a.time || 'ETA unavailable'}
                  label="Est. time"
                />
              </View>
              <View style={styles.statItem}>
                <MiniStat value={String(a.items)} label="Items" />
              </View>
            </View>
          </ContentColumn>
        </ScrollView>

        <ContentColumn style={styles.footer}>
          <PrimaryButton
            label="Start Navigation to Store →"
            onPress={() => {
              actions.setFlow('travel');
              nav.replace('Travel');
            }}
          />
        </ContentColumn>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.white},
  flex: {flex: 1},
  empty: {alignItems: 'center', justifyContent: 'center'},
  emptyText: {fontWeight: '600', fontSize: 14, color: colors.textMuted},
  header: {paddingHorizontal: 20, paddingBottom: 30},
  backChip: {
    position: 'absolute',
    zIndex: 2,
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backGlyph: {fontWeight: '700', fontSize: 20, color: colors.white},
  checkTile: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  title: {
    fontWeight: '800',
    fontSize: 24,
    color: colors.white,
    marginTop: 16,
    letterSpacing: -0.4,
  },
  sub: {
    fontWeight: '400',
    fontSize: 14,
    color: colors.onPrimarySoft,
    marginTop: 4,
  },
  bodyScroll: {flexGrow: 1},
  body: {flexGrow: 1, padding: 16, gap: 14, width: '100%'},
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
  payoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  payoutLabel: {fontWeight: '400', fontSize: 12, color: colors.textMuted},
  payoutValue: {fontWeight: '800', fontSize: 18, color: colors.primary},
  divider: {height: 1, backgroundColor: colors.divider, marginVertical: 14},
  orderId: {
    fontWeight: '800',
    fontSize: 18,
    color: colors.ink,
    marginBottom: 12,
  },
  pickupBlock: {marginBottom: 10, gap: 2},
  pickupLabel: {fontWeight: '600', fontSize: 11, color: colors.textMuted},
  pickupValue: {fontWeight: '700', fontSize: 15, color: colors.ink},
  pickupAddr: {fontWeight: '500', fontSize: 13, color: colors.textMuted},
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  metaLabel: {fontWeight: '600', fontSize: 12, color: colors.textMuted},
  metaValue: {fontWeight: '700', fontSize: 14, color: colors.ink, flexShrink: 1},
  stats: {flexDirection: 'row', gap: 11},
  statsWrap: {flexWrap: 'wrap'},
  statItem: {flex: 1, minWidth: 96},
  footer: {
    padding: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    width: '100%',
  },
});
