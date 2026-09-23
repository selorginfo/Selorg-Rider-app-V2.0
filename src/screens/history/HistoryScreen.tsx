import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Screen} from '../../components/common/Screen';
import {AppText} from '../../components/common/AppText';
import {FilterTabs} from '../../components/buttons/FilterTabs';
import {HistoryCard} from '../../components/cards/HistoryCard';
import {Card} from '../../components/cards/Card';
import {useAppNavigation} from '../../hooks/useAppNavigation';
import {useRider} from '../../store/RiderContext';
import {bulkApi, mapBulkHistory, riderApi} from '../../services/api';
import type {HistoryEntry} from '../../types';
import {colors} from '../../theme';

const TABS = [
  {id: 'all', label: 'All'},
  {id: 'standard', label: 'Standard'},
  {id: 'bulk', label: 'Bulk'},
];

type BulkRow = ReturnType<typeof mapBulkHistory>[number];

export function HistoryScreen() {
  const nav = useAppNavigation();
  const {state, actions} = useRider();
  const [standard, setStandard] = useState<
    Array<HistoryEntry & {id?: string}>
  >([]);
  const [bulk, setBulk] = useState<BulkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const filter = state.historyFilter;
    try {
      if (filter === 'bulk') {
        setStandard([]);
        const batches = await bulkApi.listBatches();
        if (!batches.ok) {
          throw new Error(batches.error || 'Could not load bulk history');
        }
        setBulk(mapBulkHistory(batches.data ?? []));
      } else if (filter === 'standard') {
        setBulk([]);
        setStandard(await riderApi.getHistory('standard'));
      } else {
        const [std, batches] = await Promise.all([
          riderApi.getHistory('standard'),
          bulkApi.listBatches(),
        ]);
        if (!batches.ok) {
          throw new Error(batches.error || 'Could not load bulk history');
        }
        setStandard(std);
        setBulk(mapBulkHistory(batches.data ?? []));
      }
    } catch (err) {
      setStandard([]);
      setBulk([]);
      setError(err instanceof Error ? err.message : 'Could not load history');
    } finally {
      setLoading(false);
    }
  }, [state.historyFilter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    load();
  }, [state.historyFilter, load]);

  const showBulk = state.historyFilter !== 'standard';
  const showStandard = state.historyFilter !== 'bulk';
  const empty =
    !loading &&
    (showBulk ? bulk.length === 0 : true) &&
    (showStandard ? standard.length === 0 : true);

  return (
    <Screen contentContainerStyle={styles.body}>
      <AppText style={styles.title}>History</AppText>
      <AppText style={styles.sub}>Your completed deliveries</AppText>

      <View style={styles.tabs}>
        <FilterTabs
          tabs={TABS}
          value={state.historyFilter}
          onChange={id => actions.setHistoryFilter(id as never)}
        />
      </View>

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={colors.primary}
        />
      ) : error ? (
        <View style={styles.emptyWrap}>
          <AppText style={styles.emptyTitle}>{error}</AppText>
          <Pressable onPress={() => void load()}>
            <AppText style={styles.emptySub}>Tap to retry</AppText>
          </Pressable>
        </View>
      ) : empty ? (
        <View style={styles.emptyWrap}>
          <AppText style={styles.emptyTitle}>No completed deliveries</AppText>
          <AppText style={styles.emptySub}>
            Finished orders will show up here
          </AppText>
        </View>
      ) : (
        <View style={styles.list}>
          {showBulk &&
            bulk.map(b => (
              <Pressable
                key={b.id}
                onPress={() =>
                  nav.navigate('BulkHistoryDetail', {batchId: b.id})
                }>
                <Card borderColor={colors.bulkBorder}>
                  <View style={styles.bulkTop}>
                    <View style={styles.bulkPill}>
                      <AppText style={styles.bulkPillText}>
                        🛺 Bulk Batch
                      </AppText>
                    </View>
                    <AppText style={styles.time}>{b.time}</AppText>
                  </View>
                  <AppText style={styles.bulkTitle}>
                    Batch #{b.num} · {b.addr}
                  </AppText>
                  <View style={styles.bulkBottom}>
                    <AppText style={styles.meta}>
                      {b.items} orders · {b.dist}
                    </AppText>
                    <AppText style={styles.payout}>₹{b.payout}</AppText>
                  </View>
                </Card>
              </Pressable>
            ))}

          {showStandard &&
            standard.map(h => (
              <HistoryCard key={h.id ?? h.num} entry={h} />
            ))}
        </View>
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
  tabs: {marginTop: 16},
  loader: {marginTop: 40},
  emptyWrap: {alignItems: 'center', paddingVertical: 48, gap: 6},
  emptyTitle: {fontWeight: '700', fontSize: 15, color: colors.ink},
  emptySub: {fontWeight: '400', fontSize: 13, color: colors.textMuted},
  list: {gap: 12, marginTop: 16},
  bulkTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bulkPill: {
    backgroundColor: colors.bulkTint,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  bulkPillText: {fontWeight: '700', fontSize: 11, color: colors.bulk},
  time: {fontWeight: '500', fontSize: 11, color: colors.textFaint},
  bulkTitle: {
    fontWeight: '700',
    fontSize: 14,
    color: colors.ink,
    marginTop: 11,
  },
  bulkBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 6,
  },
  meta: {fontWeight: '400', fontSize: 12, color: colors.textMuted, flex: 1},
  payout: {fontWeight: '800', fontSize: 15, color: colors.ink},
});
