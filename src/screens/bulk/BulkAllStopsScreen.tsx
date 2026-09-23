import React from 'react';
import {Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AppText} from '../../components/common/AppText';
import {SearchBar} from '../../components/inputs/SearchBar';
import {FilterTabs} from '../../components/buttons/FilterTabs';
import {EmptyState} from '../../components/feedback/EmptyState';
import {useAppNavigation} from '../../hooks/useAppNavigation';
import {useRider} from '../../store/RiderContext';
import {BULK_STATUS_META, selectBulk} from '../../store/selectors';
import {colors} from '../../theme';

const FILTERS = [
  {id: 'all', label: 'All'},
  {id: 'current', label: 'Current'},
  {id: 'pending', label: 'Upcoming'},
  {id: 'delivered', label: 'Delivered'},
  {id: 'failed', label: 'Failed'},
];

export function BulkAllStopsScreen() {
  const nav = useAppNavigation();
  const {state, actions} = useRider();
  const b = selectBulk(state);

  const statusFor = (
    idx: number,
    status: 'pending' | 'delivered' | 'failed',
  ) => {
    if (idx === b.currentIdx) {
      return {label: 'Current', color: colors.ink, bg: colors.fieldBg2};
    }
    const m = BULK_STATUS_META[status];
    return {label: m.label, color: m.color, bg: m.bg};
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => nav.navigate(state.bulkReturnTo as never)}
          hitSlop={10}>
          <AppText style={styles.back}>‹</AppText>
        </Pressable>
        <AppText style={styles.title}>All Stops · {b.total}</AppText>
      </View>

      <View style={styles.controls}>
        <SearchBar
          value={state.bulkSearch}
          onChangeText={actions.setBulkSearch}
          placeholder="Search order, customer, or address"
        />
        <View style={styles.tabs}>
          <FilterTabs
            tabs={FILTERS}
            value={state.bulkFilter}
            onChange={id => actions.setBulkFilter(id as never)}
            activeTone="green"
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {b.total === 0 ? (
          <EmptyState
            title="No active batch"
            subtitle="Stops will appear here once a batch is assigned."
          />
        ) : b.filteredStops.length === 0 ? (
          <AppText style={styles.empty}>No stops match</AppText>
        ) : null}
        {b.filteredStops.map(st => {
          const meta = statusFor(st.idx, st.status);
          const badgeBg =
            st.idx === b.currentIdx
              ? colors.ink
              : st.status === 'delivered'
              ? colors.primary
              : st.status === 'failed'
              ? colors.danger
              : colors.fieldBg2;
          const badgeFg =
            st.idx === b.currentIdx || st.status !== 'pending'
              ? colors.white
              : colors.textFaint;
          return (
            <Pressable
              key={st.id ?? st.idx}
              onPress={() => {
                actions.openStopDetail(st.idx, 'BulkAllStops');
                nav.navigate('BulkStopDetail');
              }}
              style={styles.row}>
              <View style={[styles.numBadge, {backgroundColor: badgeBg}]}>
                <AppText style={[styles.numBadgeText, {color: badgeFg}]}>
                  {st.idx + 1}
                </AppText>
              </View>
              <View style={styles.rowText}>
                <AppText style={styles.customer}>{st.customer}</AppText>
                <AppText style={styles.meta} numberOfLines={1}>
                  {st.num} · {st.addr}
                </AppText>
              </View>
              <View style={[styles.statusPill, {backgroundColor: meta.bg}]}>
                <AppText style={[styles.statusPillText, {color: meta.color}]}>
                  {meta.label}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.white},
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
  controls: {paddingHorizontal: 16, paddingTop: 14},
  tabs: {marginTop: 10},
  list: {paddingHorizontal: 16, paddingVertical: 14, gap: 9},
  empty: {
    textAlign: 'center',
    paddingVertical: 30,
    fontWeight: '600',
    fontSize: 13,
    color: colors.textFaint,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  numBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numBadgeText: {fontWeight: '700', fontSize: 12},
  rowText: {flex: 1, minWidth: 0},
  customer: {fontWeight: '700', fontSize: 13, color: colors.ink},
  meta: {fontWeight: '400', fontSize: 11, color: colors.textFaint},
  statusPill: {borderRadius: 999, paddingVertical: 4, paddingHorizontal: 9},
  statusPillText: {fontWeight: '700', fontSize: 11},
});
