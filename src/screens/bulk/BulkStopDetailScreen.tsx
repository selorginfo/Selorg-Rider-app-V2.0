import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AppText} from '../../components/common/AppText';
import {PrimaryButton} from '../../components/buttons/PrimaryButton';
import {useAppNavigation} from '../../hooks/useAppNavigation';
import {useRider} from '../../store/RiderContext';
import {BULK_STATUS_META, selectBulk} from '../../store/selectors';
import {openDialer} from '../../utils/phone';
import {colors, radius} from '../../theme';

export function BulkStopDetailScreen() {
  const nav = useAppNavigation();
  const {state, actions} = useRider();
  const b = selectBulk(state);
  const d = b.detailStop;
  if (!d) {
    return null;
  }
  const isCurrent = d.idx === b.currentIdx;
  const meta = isCurrent
    ? {label: 'Current', color: colors.ink, bg: colors.fieldBg2}
    : BULK_STATUS_META[d.status];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => nav.navigate(state.bulkReturnTo as never)}
          hitSlop={10}>
          <AppText style={styles.back}>‹</AppText>
        </Pressable>
        <AppText style={styles.title}>
          Stop {d.idx + 1} of {b.total}
        </AppText>
      </View>

      <View style={styles.body}>
        <View style={[styles.statusPill, {backgroundColor: meta.bg}]}>
          <AppText style={[styles.statusPillText, {color: meta.color}]}>
            {meta.label}
          </AppText>
        </View>
        <AppText style={styles.customer}>{d.customer}</AppText>
        <AppText style={styles.meta}>
          {d.num} · {d.items} items · Bag {d.bag}
        </AppText>

        <View style={styles.addrCard}>
          <AppText style={styles.addrKicker}>DELIVERY ADDRESS</AppText>
          <AppText style={styles.addr}>{d.addr}</AppText>
          <View style={styles.addrMeta}>
            <AppText style={styles.addrMetaText}>📍 {d.dist}</AppText>
            <AppText style={styles.addrMetaText}>⏱ {d.eta}</AppText>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => {
              void openDialer(d.phone);
            }}
            style={styles.callBtn}>
            <AppText style={styles.callBtnText}>📞 Call</AppText>
          </Pressable>
          <Pressable
            onPress={() => actions.openException(d.idx)}
            style={styles.reportBtn}>
            <AppText style={styles.reportBtnText}>Report Issue</AppText>
          </Pressable>
        </View>
      </View>

      {isCurrent && (
        <View style={styles.footer}>
          <PrimaryButton
            label="Navigate to This Stop"
            variant="purple"
            onPress={() => {
              actions.setBulkPhase('navigating');
              nav.navigate('BulkActive');
            }}
          />
        </View>
      )}
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
  body: {flex: 1, padding: 16},
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 11,
  },
  statusPillText: {fontWeight: '700', fontSize: 11},
  customer: {fontWeight: '800', fontSize: 19, color: colors.ink, marginTop: 12},
  meta: {
    fontWeight: '400',
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 3,
  },
  addrCard: {
    backgroundColor: colors.fieldBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    marginTop: 16,
  },
  addrKicker: {fontWeight: '400', fontSize: 11, color: colors.textFaint},
  addr: {fontWeight: '700', fontSize: 14, color: colors.ink, marginTop: 4},
  addrMeta: {flexDirection: 'row', gap: 16, marginTop: 10},
  addrMetaText: {fontWeight: '600', fontSize: 12, color: colors.textSecondary},
  actions: {flexDirection: 'row', gap: 10, marginTop: 16},
  callBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.fieldBg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtnText: {fontWeight: '700', fontSize: 13, color: colors.primary},
  reportBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportBtnText: {fontWeight: '700', fontSize: 13, color: colors.danger},
  footer: {padding: 16, borderTopWidth: 1, borderTopColor: colors.divider},
});
