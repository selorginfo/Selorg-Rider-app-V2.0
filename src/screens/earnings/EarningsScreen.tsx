import React, {useCallback, useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Screen} from '../../components/common/Screen';
import {AppText} from '../../components/common/AppText';
import {GradientHeroCard} from '../../components/cards/GradientHeroCard';
import {Card} from '../../components/cards/Card';
import {riderApi, type EarningsSummary} from '../../services/api';
import type {EarningsDay} from '../../types';
import {colors} from '../../theme';

export function EarningsScreen() {
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [daily, setDaily] = useState<EarningsDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [s, d] = await Promise.all([
        riderApi.getEarningsSummary(),
        riderApi.getDailyBreakdown(),
      ]);
      setSummary(s);
      setDaily(d);
    } catch {
      setError('Could not load earnings. Pull to retry.');
      setSummary(null);
      setDaily([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading && !summary) {
    return (
      <Screen contentContainerStyle={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  if (error && !summary) {
    return (
      <Screen contentContainerStyle={styles.center}>
        <AppText style={styles.errorText}>{error}</AppText>
        <Pressable onPress={load} style={styles.retryBtn}>
          <AppText style={styles.retryLabel}>Retry</AppText>
        </Pressable>
      </Screen>
    );
  }

  const w = summary!;
  const empty = w.orders === 0 && daily.length === 0;

  return (
    <Screen contentContainerStyle={styles.body}>
      <AppText style={styles.title}>Earnings</AppText>

      <GradientHeroCard style={styles.hero}>
        <AppText style={styles.heroKicker}>THIS WEEK</AppText>
        <AppText style={styles.heroValue} numberOfLines={1}>
          {w.total}
        </AppText>
        <View style={styles.heroStats}>
          <HeroStat value={String(w.orders)} label="Deliveries" />
          <HeroStat value={w.avgPerOrder} label="Avg / order" />
          <HeroStat value={w.hours} label="Online" />
        </View>
      </GradientHeroCard>

      {!!w.nextPayoutSchedule && (
        <Card style={styles.payoutCard}>
          <View>
            <AppText style={styles.payoutTitle}>Next payout</AppText>
            <AppText style={styles.payoutSub}>{w.nextPayoutSchedule}</AppText>
          </View>
          <View style={styles.payoutRight}>
            <AppText style={styles.payoutValue}>{w.nextPayout}</AppText>
            {!!w.nextPayoutWhen && (
              <AppText style={styles.payoutWhen}>{w.nextPayoutWhen}</AppText>
            )}
          </View>
        </Card>
      )}

      <AppText style={styles.section}>Earnings breakdown</AppText>
      {w.breakdown.length === 0 ? (
        <Card style={styles.emptyCard}>
          <AppText style={styles.emptyText}>No earnings this week yet</AppText>
        </Card>
      ) : (
        <Card padded={false}>
          {w.breakdown.map((b, i) => (
            <View
              key={b.label}
              style={[
                styles.row,
                i < w.breakdown.length - 1 && styles.rowBorder,
              ]}>
              <AppText
                style={[styles.rowLabel, b.purple && {color: colors.bulk}]}>
                {b.label}
              </AppText>
              <AppText style={styles.rowValue}>{b.amount}</AppText>
            </View>
          ))}
        </Card>
      )}

      <AppText style={styles.section}>Daily breakdown</AppText>
      {daily.length === 0 ? (
        <Card style={styles.emptyCard}>
          <AppText style={styles.emptyText}>
            {empty ? 'No delivery activity this week' : 'No daily breakdown available'}
          </AppText>
        </Card>
      ) : (
        <Card padded={false}>
          {daily.map((d, i) => (
            <View
              key={`${d.day}-${d.date}`}
              style={[
                styles.dayRow,
                i < daily.length - 1 && styles.rowBorder,
              ]}>
              <View style={styles.dayLeft}>
                <View style={styles.dayChip}>
                  <AppText style={styles.dayChipText}>{d.day}</AppText>
                </View>
                <View>
                  <AppText style={styles.dayDate}>{d.date}</AppText>
                  <AppText style={styles.dayMeta}>
                    {d.orders} orders · {d.hours}
                  </AppText>
                </View>
              </View>
              <AppText style={styles.dayAmount}>
                {d.amount.startsWith('₹') ? d.amount : `₹${d.amount}`}
              </AppText>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

function HeroStat({value, label}: {value: string; label: string}) {
  return (
    <View style={styles.heroStat}>
      <AppText style={styles.heroStatValue} numberOfLines={1}>
        {value}
      </AppText>
      <AppText style={styles.heroStatLabel} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {padding: 16, paddingBottom: 24},
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  errorText: {
    fontWeight: '500',
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  retryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: colors.primaryTint08,
  },
  retryLabel: {fontWeight: '700', fontSize: 14, color: colors.primary},
  title: {
    fontWeight: '800',
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  hero: {marginTop: 16},
  heroKicker: {
    fontWeight: '500',
    fontSize: 12,
    color: colors.onPrimarySoft,
    letterSpacing: 0.4,
  },
  heroValue: {
    fontWeight: '800',
    fontSize: 34,
    color: colors.white,
    marginTop: 4,
    letterSpacing: -1,
  },
  heroStats: {flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginTop: 16},
  heroStat: {minWidth: 0, flexGrow: 1},
  heroStatValue: {
    fontWeight: '700',
    fontSize: 16,
    color: colors.white,
    minWidth: 0,
  },
  heroStatLabel: {
    fontWeight: '400',
    fontSize: 11,
    color: colors.onPrimarySoft,
    minWidth: 0,
  },
  payoutCard: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  payoutTitle: {fontWeight: '700', fontSize: 14, color: colors.ink},
  payoutSub: {fontWeight: '400', fontSize: 12, color: colors.textMuted},
  payoutRight: {alignItems: 'flex-end', minWidth: 0, flexShrink: 0},
  payoutValue: {fontWeight: '800', fontSize: 18, color: colors.primary},
  payoutWhen: {fontWeight: '400', fontSize: 11, color: colors.textMuted},
  section: {
    fontWeight: '700',
    fontSize: 15,
    color: colors.ink,
    marginTop: 22,
    marginBottom: 12,
  },
  emptyCard: {padding: 20, alignItems: 'center'},
  emptyText: {fontWeight: '500', fontSize: 13, color: colors.textMuted},
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  rowBorder: {borderBottomWidth: 1, borderBottomColor: colors.divider},
  rowLabel: {
    fontWeight: '600',
    fontSize: 13,
    color: colors.ink,
    flex: 1,
    minWidth: 0,
  },
  rowValue: {fontWeight: '800', fontSize: 15, color: colors.ink},
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  dayLeft: {flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0},
  dayChip: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primaryTint08,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipText: {fontWeight: '700', fontSize: 12, color: colors.primary},
  dayDate: {fontWeight: '700', fontSize: 13, color: colors.ink},
  dayMeta: {fontWeight: '400', fontSize: 11, color: colors.textMuted},
  dayAmount: {fontWeight: '800', fontSize: 15, color: colors.ink},
});
