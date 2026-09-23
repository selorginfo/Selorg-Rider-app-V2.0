import React, {useCallback, useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Screen} from '../../components/common/Screen';
import {AppText} from '../../components/common/AppText';
import {ScreenHeader} from '../../components/headers/ScreenHeader';
import {GradientHeroCard} from '../../components/cards/GradientHeroCard';
import {useAppNavigation} from '../../hooks/useAppNavigation';
import {riderApi} from '../../services/api';
import type {WalletBalanceDto, WalletTransactionDto} from '../../types/api';
import {colors, radius} from '../../theme';

function formatAmt(n?: number, fallback?: string): string {
  if (fallback) {
    return fallback;
  }
  if (n == null) {
    return '—';
  }
  return `₹${n.toLocaleString('en-IN')}`;
}

export function WalletScreen() {
  const nav = useAppNavigation();
  const [wallet, setWallet] = useState<WalletBalanceDto | null>(null);
  const [txns, setTxns] = useState<WalletTransactionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [w, t] = await Promise.all([
      riderApi.getWallet(),
      riderApi.getWalletTransactions(),
    ]);
    if (!w.ok) {
      setWallet(null);
      setTxns([]);
      setError(w.error || 'Could not load wallet');
      setLoading(false);
      return;
    }
    setWallet(w.data);
    if (!t.ok) {
      setTxns([]);
      setError(t.error || 'Could not load transactions');
    } else {
      setTxns(Array.isArray(t.data) ? t.data : []);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <Screen background={colors.white} contentContainerStyle={styles.body}>
      <ScreenHeader title="Wallet" onBack={() => nav.goBack()} />
      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : error && !wallet ? (
        <Pressable onPress={() => void load()}>
          <AppText style={styles.empty}>{error} · Retry</AppText>
        </Pressable>
      ) : (
        <>
          <GradientHeroCard style={styles.hero}>
            <AppText style={styles.kicker}>AVAILABLE BALANCE</AppText>
            <AppText style={styles.value}>
              {formatAmt(wallet?.availableBalance)}
            </AppText>
            <AppText style={styles.limit}>
              {wallet?.currency || 'INR'} · payouts land here
            </AppText>
          </GradientHeroCard>
          <View style={styles.tiles}>
            <Tile label="Pending" value={formatAmt(wallet?.pendingBalance)} />
            <Tile label="Reserved" value={formatAmt(wallet?.reservedBalance)} />
            <Tile label="Lifetime" value={formatAmt(wallet?.totalEarnings)} />
          </View>
          <AppText style={styles.section}>Transactions</AppText>
          {error ? <AppText style={styles.warn}>{error}</AppText> : null}
          {txns.length === 0 ? (
            <AppText style={styles.empty}>No wallet transactions yet</AppText>
          ) : (
            txns.map(txn => {
              const id = txn.id || txn._id || `${txn.createdAt}-${txn.amount}`;
              const credit = (txn.type || '').toLowerCase() === 'credit';
              return (
                <View key={id} style={styles.row}>
                  <View style={styles.rowLeft}>
                    <AppText style={styles.rowLabel}>
                      {txn.description || txn.mode || txn.type || 'Transaction'}
                    </AppText>
                    <AppText style={styles.rowTime}>
                      {txn.date || txn.createdAt || txn.status || ''}
                    </AppText>
                  </View>
                  <AppText
                    style={[
                      styles.rowAmt,
                      {color: credit ? colors.primary : colors.danger},
                    ]}>
                    {txn.amt || formatAmt(txn.amount)}
                  </AppText>
                </View>
              );
            })
          )}
        </>
      )}
    </Screen>
  );
}

function Tile({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.tile}>
      <AppText style={styles.tileValue}>{value}</AppText>
      <AppText style={styles.tileLabel}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24},
  loader: {marginTop: 40},
  hero: {marginTop: 16},
  kicker: {
    fontWeight: '500',
    fontSize: 12,
    color: colors.onPrimarySoft,
    letterSpacing: 0.4,
  },
  value: {
    fontWeight: '800',
    fontSize: 34,
    color: colors.white,
    marginTop: 4,
    letterSpacing: -1,
  },
  limit: {
    fontWeight: '400',
    fontSize: 12,
    color: colors.onPrimarySoft,
    marginTop: 6,
  },
  tiles: {flexDirection: 'row', gap: 8, marginTop: 14},
  tile: {
    flex: 1,
    backgroundColor: colors.fieldBg,
    borderRadius: radius.lg,
    padding: 12,
  },
  tileValue: {fontWeight: '800', fontSize: 13, color: colors.ink},
  tileLabel: {fontWeight: '400', fontSize: 11, color: colors.textMuted, marginTop: 2},
  section: {
    fontWeight: '700',
    fontSize: 15,
    color: colors.ink,
    marginTop: 22,
    marginBottom: 12,
  },
  empty: {
    fontWeight: '500',
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 24,
    textAlign: 'center',
  },
  warn: {fontWeight: '600', fontSize: 12, color: colors.danger, marginBottom: 8},
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  rowLeft: {flex: 1, paddingRight: 12},
  rowLabel: {fontWeight: '600', fontSize: 13, color: colors.ink},
  rowTime: {fontWeight: '400', fontSize: 11, color: colors.textFaint},
  rowAmt: {fontWeight: '800', fontSize: 14},
});
