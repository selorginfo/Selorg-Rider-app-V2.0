import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AppText} from '../../components/common/AppText';
import {GradientView} from '../../components/common/GradientView';
import {BackChip} from '../../components/headers/GradientHeader';
import {PrimaryButton} from '../../components/buttons/PrimaryButton';
import {EmptyState} from '../../components/feedback/EmptyState';
import {useAppNavigation} from '../../hooks/useAppNavigation';
import {useHardwareBack} from '../../hooks/useHardwareBack';
import {resetTo} from '../../navigation/navigationRef';
import {useRider} from '../../store/RiderContext';
import {selectBulk} from '../../store/selectors';
import {batchToStatePatch, bulkApi} from '../../services/api/bulkApi';
import {colors, radius, shadow} from '../../theme';

function formatEstMinutes(m?: number): string {
  if (m == null) {
    return '—';
  }
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

export function BulkOverviewScreen() {
  const nav = useAppNavigation();
  const {state, actions} = useRider();
  const b = selectBulk(state);
  const [loading, setLoading] = useState(true);
  const [noBatch, setNoBatch] = useState(false);
  const [distance, setDistance] = useState('—');
  const [estTime, setEstTime] = useState('—');
  const [hubName, setHubName] = useState('Koramangala');

  useHardwareBack(
    useCallback(() => {
      resetTo('Main', {screen: 'Orders'});
      return true;
    }, []),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const result = await bulkApi.getBatch(state.bulkBatchId || undefined);
      if (cancelled) {
        return;
      }
      setLoading(false);
      if (
        !result.ok ||
        !result.data ||
        result.appCode === 'NO_ACTIVE_BATCH'
      ) {
        setNoBatch(true);
        return;
      }
      const batch = result.data;
      const orders = bulkApi.mapOrders(batch);
      if (orders.length === 0) {
        setNoBatch(true);
        return;
      }
      setNoBatch(false);
      actions.patch(batchToStatePatch(batch));
      const t = batch.totals;
      if (t?.distanceKm != null) {
        setDistance(`${t.distanceKm} km`);
      }
      if (t?.estimatedMinutes != null) {
        setEstTime(formatEstMinutes(t.estimatedMinutes));
      }
      if (batch.hub?.name) {
        setHubName(batch.hub.name);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch active batch once on mount
  }, []);

  const cells = [
    ['Total Orders', String(b.total), colors.ink],
    ['Completed', String(b.completed), colors.primary],
    ['Remaining', String(b.remaining), colors.ink],
    ['Failed', String(b.failed), colors.danger],
    ['Distance', distance, colors.ink],
    ['Est. Time', estTime, colors.ink],
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}>
        <GradientView
          colors={[colors.bulkDark, colors.bulk]}
          angle={150}
          style={styles.header}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerRow}>
              <BackChip
                onPress={() => resetTo('Main', {screen: 'Orders'})}
              />
              <AppText style={styles.headerTitle}>Bulk Delivery</AppText>
            </View>
            <AppText style={styles.batch}>Batch #{b.batchId}</AppText>
            <AppText style={styles.batchSub}>
              {b.vehicleLabel} · {b.vehicleNo} · {hubName}
            </AppText>
          </SafeAreaView>
        </GradientView>

        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator
              color={colors.bulk}
              style={styles.loader}
            />
          ) : noBatch || b.total === 0 ? (
            <EmptyState
              title="No active batch"
              subtitle="You don't have a bulk delivery assigned right now."
            />
          ) : (
            <>
              <View style={styles.summary}>
                <AppText style={styles.summaryKicker}>Batch Summary</AppText>
                <View style={styles.grid}>
                  {cells.map(([label, value, color]) => (
                    <View key={label} style={styles.cell}>
                      <AppText style={styles.cellLabel}>{label}</AppText>
                      <AppText style={[styles.cellValue, {color}]}>
                        {value}
                      </AppText>
                    </View>
                  ))}
                </View>
              </View>

              <Pressable
                onPress={() => {
                  actions.setBulkReturn('BulkOverview');
                  nav.navigate('BulkAllStops');
                }}
                style={styles.routeRow}>
                <View style={styles.routeIcon}>
                  <AppText style={styles.routeEmoji}>🗺</AppText>
                </View>
                <View style={styles.routeText}>
                  <AppText style={styles.routeTitle}>View Route</AppText>
                  <AppText style={styles.routeSub}>
                    All {b.total} stops in delivery order
                  </AppText>
                </View>
                <AppText style={styles.chev}>›</AppText>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>

      {!loading && !noBatch && b.total > 0 && (
        <View style={styles.footer}>
          <PrimaryButton
            label="Go to Dark Store · Load Orders"
            variant="purple"
            onPress={() => {
              actions.setBulkStatus('loading');
              nav.replace('BulkLoading');
            }}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.white},
  scroll: {paddingBottom: 16},
  header: {paddingHorizontal: 20, paddingBottom: 20},
  headerRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  headerTitle: {
    fontWeight: '800',
    fontSize: 19,
    color: colors.white,
    letterSpacing: -0.3,
  },
  batch: {
    fontWeight: '800',
    fontSize: 22,
    color: colors.white,
    marginTop: 16,
    letterSpacing: -0.4,
  },
  batchSub: {
    fontWeight: '400',
    fontSize: 13,
    color: colors.bulkOnDark,
    marginTop: 3,
  },
  content: {padding: 16},
  loader: {marginVertical: 40},
  summary: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 16,
    ...shadow('sm'),
  },
  summaryKicker: {
    fontWeight: '700',
    fontSize: 13,
    color: colors.textFaint,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  grid: {flexDirection: 'row', flexWrap: 'wrap'},
  cell: {width: '50%', marginBottom: 12},
  cellLabel: {fontWeight: '400', fontSize: 11, color: colors.textFaint},
  cellValue: {fontWeight: '800', fontSize: 18},
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 15,
    marginTop: 12,
    ...shadow('sm'),
  },
  routeIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: colors.bulkTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeEmoji: {fontSize: 17},
  routeText: {flex: 1},
  routeTitle: {fontWeight: '700', fontSize: 14, color: colors.ink},
  routeSub: {fontWeight: '400', fontSize: 12, color: colors.textMuted},
  chev: {fontWeight: '700', fontSize: 18, color: '#D1D5DB'},
  footer: {
    padding: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
