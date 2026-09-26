import React, {useState} from 'react';
import {ActivityIndicator, StyleSheet, TextInput, View} from 'react-native';
import {AppText} from '../common/AppText';
import {PopIn} from '../feedback/PopIn';
import {CheckIcon} from '../common/Icons';
import {BottomSheet} from './BottomSheet';
import {SheetHeading} from './SheetHeading';
import {RadioRow} from '../inputs/RadioRow';
import {PrimaryButton} from '../buttons/PrimaryButton';
import {TextButton} from '../buttons/TextButton';
import {useRider} from '../../store/RiderContext';
import {PAY_METHODS, depositBtnLabel, payMethodName} from '../../mock';
import {riderApi} from '../../services/api/riderApi';
import {colors, radius, FONT_FAMILY} from '../../theme';

/** FloatCash → "Deposit cash" sheet (form + recorded state). */
export function DepositSheet() {
  const {state, actions} = useRider();
  const open = state.depositStage === 'form' || state.depositStage === 'done';
  const cash = state.floatingCash.toLocaleString('en-IN');
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    const amt = Number(state.depositAmt);
    if (!(amt > 0)) {
      return;
    }
    if (amt > state.floatingCash) {
      actions.patch({depositError: 'Amount exceeds cash in hand'});
      return;
    }
    setSubmitting(true);
    actions.patch({depositError: ''});
    try {
      const result = await riderApi.recordDeposit(amt, state.payMethod);
      if (!result.ok || !result.data?.ref) {
        actions.patch({
          depositError: result.error || 'Could not record deposit',
        });
        return;
      }
      const ref = result.data.ref;
      const methodName =
        result.data.methodLabel ?? payMethodName(state.payMethod);
      actions.confirmDeposit(ref, amt, methodName);
      if (result.data?.cashInHand != null) {
        actions.patch({floatingCash: result.data.cashInHand});
      }
    } catch {
      actions.patch({depositError: 'Could not record deposit'});
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <BottomSheet visible={open} onClose={actions.closeDeposit} scroll>
      {state.depositStage === 'form' && (
        <>
          <SheetHeading
            title="Transfer COD to company"
            subtitle="Record the COD cash you transferred to Selorg (UPI / bank / cash at hub)"
          />
          <View style={styles.amountBox}>
            <AppText style={styles.rupee}>₹</AppText>
            <TextInput
              value={state.depositAmt}
              onChangeText={actions.setDepositAmt}
              keyboardType="number-pad"
              inputMode="numeric"
              placeholder="0"
              placeholderTextColor={colors.textFaint}
              style={styles.amountInput}
            />
          </View>
          <View style={styles.amountRow}>
            <AppText style={styles.cashHint}>Cash in hand: ₹{cash}</AppText>
            <TextButton
              label="Transfer full amount"
              onPress={actions.depositAll}
              weight="700"
              size={12}
            />
          </View>
          {!!state.depositError && (
            <AppText style={styles.error}>{state.depositError}</AppText>
          )}
          <AppText style={styles.methodLabel}>TRANSFER METHOD</AppText>
          <View style={styles.methods}>
            {PAY_METHODS.map(m => (
              <RadioRow
                key={m.id}
                title={m.label}
                subtitle={m.sub}
                icon={m.icon}
                iconBg={m.iconBg}
                selected={state.payMethod === m.id}
                onPress={() => actions.setPayMethod(m.id)}
              />
            ))}
          </View>
          {submitting ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <PrimaryButton
              label={depositBtnLabel(state.payMethod)}
              onPress={handleConfirm}
              disabled={
                !(Number(state.depositAmt) > 0) ||
                Number(state.depositAmt) > state.floatingCash ||
                submitting
              }
              height={52}
              borderRadius={radius.lg}
              style={styles.cta}
            />
          )}
        </>
      )}

      {state.depositStage === 'done' && (
        <View style={styles.doneWrap}>
          <PopIn style={styles.doneCheck}>
            <CheckIcon size={40} strokeWidth={3.6} />
          </PopIn>
          <AppText style={styles.doneTitle}>COD transfer recorded</AppText>
          <AppText style={styles.doneBody}>
            ₹{Number(state.depositedAmt || 0).toLocaleString('en-IN')} deposited
            via {state.depositMethodName}.{'\n'}A receipt has been sent to your
            app.
          </AppText>
          <View style={styles.remainCard}>
            <View>
              <AppText style={styles.remainLabel}>
                Remaining cash in hand
              </AppText>
              <AppText style={styles.remainValue}>₹{cash}</AppText>
            </View>
            <AppText style={styles.ref}>Ref {state.depositRef}</AppText>
          </View>
          <PrimaryButton
            label="Done"
            onPress={actions.closeDeposit}
            height={52}
            borderRadius={radius.lg}
            style={styles.cta}
          />
          <TextButton
            label="Deposit again"
            onPress={() => {
              if (submitting) {
                return;
              }
              actions.openDeposit();
            }}
            align="center"
            style={styles.again}
          />
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.fieldBg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 16,
    marginTop: 18,
  },
  rupee: {
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
    fontSize: 26,
    color: colors.inkStrong,
  },
  amountInput: {
    flex: 1,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
    fontSize: 26,
    color: colors.inkStrong,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  cashHint: {fontWeight: '400', fontSize: 12, color: colors.textFaint},
  error: {fontWeight: '600', fontSize: 12, color: colors.danger, marginTop: 10},
  methodLabel: {
    fontWeight: '700',
    fontSize: 12,
    color: colors.textFaint,
    letterSpacing: 0.6,
    marginTop: 18,
    marginBottom: 10,
  },
  methods: {gap: 9},
  loadingWrap: {marginTop: 18, alignItems: 'center'},
  cta: {marginTop: 18},
  again: {marginTop: 12},
  doneWrap: {alignItems: 'center', paddingTop: 14},
  doneCheck: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneTitle: {
    fontWeight: '800',
    fontSize: 20,
    color: colors.inkStrong,
    marginTop: 16,
  },
  doneBody: {
    fontWeight: '400',
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 5,
    lineHeight: 20,
    textAlign: 'center',
  },
  remainCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: colors.fieldBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    marginTop: 18,
  },
  remainLabel: {fontWeight: '400', fontSize: 12, color: colors.textMuted},
  remainValue: {
    fontWeight: '800',
    fontSize: 18,
    color: colors.primary,
    marginTop: 2,
  },
  ref: {fontWeight: '600', fontSize: 11, color: colors.textFaint},
});
