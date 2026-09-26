import React, {useCallback, useState} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Screen} from '../../components/common/Screen';
import {AppText} from '../../components/common/AppText';
import {ScreenHeader} from '../../components/headers/ScreenHeader';
import {GradientHeroCard} from '../../components/cards/GradientHeroCard';
import {OutlineButton} from '../../components/buttons/OutlineButton';
import {useAppNavigation} from '../../hooks/useAppNavigation';
import {useRider} from '../../store/RiderContext';
import {riderApi} from '../../services/api';
import {useAppConfig} from '../../hooks/useAppConfig';
import {mapCashTxnToFloat} from '../../services/api/mappers';
import type {FloatTxn} from '../../types';
import {colors, radius} from '../../theme';

export function FloatCashScreen() {
  const nav = useAppNavigation();
  const {state, actions} = useRider();
  const cfg = useAppConfig();
  const [txns, setTxns] = useState<FloatTxn[]>([]);
  const [limitText, setLimitText] = useState(
    `Deposit limit: ₹${cfg.codDepositLimit.toLocaleString(
      'en-IN',
    )} · Transfer COD before end of shift`,
  );
  const [mustTransfer, setMustTransfer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [summary, rawTxns] = await Promise.all([
        riderApi.getCashSummary(),
        riderApi.getCashTransactions(),
      ]);
      if (summary.ok && summary.data) {
        actions.patch({floatingCash: summary.data.cashInHand});
        const limit = summary.data.depositLimit;
        const due = summary.data.depositDueDisplay;
        const transferRequired = Boolean(summary.data.codTransferRequired);
        if (transferRequired) {
          setLimitText(
            summary.data.transferMessage ||
              `Transfer ₹${summary.data.cashInHand.toLocaleString('en-IN')} COD to the company before going online tomorrow`,
          );
        } else if (limit != null) {
          setLimitText(
            `Deposit limit: ₹${limit.toLocaleString('en-IN')}${
              due ? ` · Due ${due}` : ' · Transfer COD before end of shift'
            }`,
          );
        }
        setMustTransfer(transferRequired);
      } else if (!summary.ok) {
        setError(summary.error || 'Could not load cash summary');
      }
      const mapped = rawTxns.map(mapCashTxnToFloat);
      setTxns(mapped);
      actions.patch({extraTxns: mapped});
    } catch (err) {
      setTxns([]);
      setError(err instanceof Error ? err.message : 'Could not load cash data');
    } finally {
      setLoading(false);
    }
  }, [actions]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const displayTxns = txns.length > 0 ? txns : state.extraTxns;

  return (
    <Screen background={colors.white} contentContainerStyle={styles.body}>
      <ScreenHeader title="Floating Cash" onBack={() => nav.goBack()} />

      <GradientHeroCard style={styles.hero}>
        <AppText style={styles.kicker}>CASH IN HAND (COD)</AppText>
        <AppText style={styles.value}>
          ₹{state.floatingCash.toLocaleString('en-IN')}
        </AppText>
        <AppText style={styles.limit}>{limitText}</AppText>
      </GradientHeroCard>

      {mustTransfer ? (
        <View style={styles.warnBanner}>
          <AppText style={styles.warnText}>
            Transfer this COD to the company to end your shift and to go online
            tomorrow.
          </AppText>
        </View>
      ) : null}

      <OutlineButton
        label={mustTransfer ? 'Transfer COD to company' : 'Deposit cash to Selorg'}
        onPress={actions.openDeposit}
        height={50}
        borderRadius={radius.md}
        style={styles.depositBtn}
      />

      <AppText style={styles.section}>Recent transactions</AppText>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : error ? (
        <AppText style={styles.empty}>{error}</AppText>
      ) : displayTxns.length === 0 ? (
        <AppText style={styles.empty}>No transactions yet</AppText>
      ) : (
        <View>
          {displayTxns.map((t, i) => (
            <View key={`${t.label}-${t.time}-${i}`} style={styles.row}>
              <View style={styles.rowLeft}>
                <AppText style={styles.rowLabel}>{t.label}</AppText>
                <AppText style={styles.rowTime}>{t.time}</AppText>
              </View>
              <AppText
                style={[
                  styles.rowAmt,
                  {color: t.pos ? colors.primary : colors.danger},
                ]}>
                {t.amt}
              </AppText>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24},
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
  warnBanner: {
    marginTop: 12,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.warnBg,
    borderWidth: 1,
    borderColor: colors.warnBorder,
  },
  warnText: {
    fontWeight: '600',
    fontSize: 13,
    color: colors.warnText,
    textAlign: 'center',
  },
  depositBtn: {marginTop: 14},
  section: {
    fontWeight: '700',
    fontSize: 15,
    color: colors.ink,
    marginTop: 22,
    marginBottom: 12,
  },
  empty: {fontWeight: '500', fontSize: 13, color: colors.textMuted},
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  rowLeft: {flex: 1},
  rowLabel: {fontWeight: '600', fontSize: 13, color: colors.ink},
  rowTime: {fontWeight: '400', fontSize: 11, color: colors.textFaint},
  rowAmt: {fontWeight: '800', fontSize: 14},
});
