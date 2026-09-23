import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StyleSheet, TextInput, View} from 'react-native';
import {AppText} from '../common/AppText';
import {PopIn} from '../feedback/PopIn';
import {CrossIcon} from '../common/Icons';
import {BottomSheet} from './BottomSheet';
import {SheetHeading} from './SheetHeading';
import {RadioRow} from '../inputs/RadioRow';
import {PrimaryButton} from '../buttons/PrimaryButton';
import {OutlineButton} from '../buttons/OutlineButton';
import {useRider} from '../../store/RiderContext';
import {activeOrder} from '../../store/selectors';
import {CANCEL_REASONS} from '../../mock';
import {configApi} from '../../services/api/configApi';
import {orderApi} from '../../services/api/orderApi';
import {resetTo} from '../../navigation/navigationRef';
import type {CancelReasonId} from '../../types';
import {NOTE_MAX} from '../../utils/validation';
import {colors, radius, FONT_FAMILY} from '../../theme';

const CANCEL_LABELS: Record<string, string> = {
  unreachable: 'Customer not reachable',
  refused: 'Customer refused delivery',
  address: 'Wrong or incomplete address',
  asked: 'Customer asked to cancel',
  vehicle: 'Vehicle breakdown / safety issue',
  other: 'Other reason',
};

type ReasonRow = {id: CancelReasonId; label: string; sub: string};

/** Nav → "Cancel order" sheet (reason form + cancelled state). */
export function CancelOrderSheet() {
  const {state, actions} = useRider();
  const open = state.cancelStage === 'form' || state.cancelStage === 'done';
  const a = activeOrder(state);
  const num = a?.num ?? '—';
  const valid =
    !!state.cancelReason &&
    (state.cancelReason !== 'other' ||
      (state.cancelNote.trim().length > 0 &&
        state.cancelNote.trim().length <= NOTE_MAX));
  const [reasons, setReasons] = useState<ReasonRow[]>(
    CANCEL_REASONS as ReasonRow[],
  );
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  useEffect(() => {
    if (state.cancelStage !== 'form') {
      return;
    }
    let cancelled = false;
    (async () => {
      const result = await configApi.getCancelReasons('standard');
      if (cancelled || !result.ok || !result.data?.reasons?.length) {
        return;
      }
      setReasons(
        result.data.reasons.map(r => ({
          id: r.id as CancelReasonId,
          label: r.label,
          sub: r.subtitle ?? '',
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [state.cancelStage]);

  const reasonLabel =
    state.cancelReason === 'other'
      ? state.cancelNote || 'Other reason'
      : CANCEL_LABELS[state.cancelReason || ''] ||
        reasons.find(r => r.id === state.cancelReason)?.label ||
        '—';

  async function handleConfirm() {
    if (!state.activeId || !state.cancelReason || !valid) {
      return;
    }
    setCancelling(true);
    setCancelError('');
    try {
      const result = await orderApi.cancel(
        state.activeId,
        state.cancelReason,
        state.cancelNote || undefined,
      );
      if (result.ok) {
        actions.confirmCancel();
      } else {
        setCancelError(result.error || 'Could not cancel order');
      }
    } catch {
      setCancelError('Could not cancel order');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <BottomSheet visible={open} onClose={actions.closeCancel} scroll>
      {state.cancelStage === 'form' && (
        <>
          <SheetHeading
            title={`Cancel order ${num}?`}
            subtitle="Choose a reason. Frequent cancellations may affect your rating."
          />
          <View style={styles.list}>
            {reasons.map(r => (
              <RadioRow
                key={r.id}
                title={r.label}
                subtitle={r.sub}
                selected={state.cancelReason === r.id}
                onPress={() => actions.setCancelReason(r.id)}
              />
            ))}
          </View>
          {state.cancelReason === 'other' && (
            <TextInput
              value={state.cancelNote}
              onChangeText={v =>
                actions.setCancelNote(v.slice(0, NOTE_MAX))
              }
              placeholder="Add a short note for support (required)"
              placeholderTextColor={colors.textFaint}
              multiline
              maxLength={NOTE_MAX}
              style={styles.note}
            />
          )}
          {state.cancelReason === 'other' &&
            state.cancelNote.trim().length === 0 && (
              <AppText style={styles.cancelError}>
                A note is required for “Other reason”.
              </AppText>
            )}
          {!!cancelError && (
            <AppText style={styles.cancelError}>{cancelError}</AppText>
          )}
          <View style={styles.actionRow}>
            <OutlineButton
              label="Keep order"
              tone="neutral"
              onPress={actions.closeCancel}
              style={styles.half}
            />
            {cancelling ? (
              <View style={[styles.half, styles.loadingHalf]}>
                <ActivityIndicator color={colors.danger} />
              </View>
            ) : (
              <PrimaryButton
                label={cancelling ? 'Cancelling…' : 'Cancel order'}
                onPress={handleConfirm}
                disabled={!valid || cancelling}
                height={52}
                borderRadius={radius.lg}
                style={[
                  styles.half,
                  {
                    backgroundColor: valid
                      ? colors.danger
                      : colors.dangerDisabled,
                  },
                ]}
              />
            )}
          </View>
        </>
      )}

      {state.cancelStage === 'done' && (
        <View style={styles.doneWrap}>
          <PopIn style={styles.doneIcon}>
            <CrossIcon size={34} />
          </PopIn>
          <AppText style={styles.doneTitle}>Order cancelled</AppText>
          <AppText style={styles.doneBody}>
            {num} has been returned to the hub for reassignment.
          </AppText>
          <View style={styles.reasonCard}>
            <AppText style={styles.reasonLabel}>Reason</AppText>
            <AppText style={styles.reasonValue}>{reasonLabel}</AppText>
          </View>
          <PrimaryButton
            label="Back to Orders"
            onPress={() => {
              actions.finishCancel();
              resetTo('Main', {screen: 'Orders'});
            }}
            height={52}
            borderRadius={radius.lg}
            style={styles.cta}
          />
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: {gap: 9, marginTop: 16},
  note: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 13,
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    color: colors.ink,
    backgroundColor: colors.fieldBg,
    marginTop: 12,
    minHeight: 66,
    textAlignVertical: 'top',
  },
  cancelError: {
    fontWeight: '600',
    fontSize: 12,
    color: colors.danger,
    marginTop: 10,
    textAlign: 'center',
  },
  actionRow: {flexDirection: 'row', gap: 10, marginTop: 18},
  half: {flex: 1, width: undefined},
  loadingHalf: {alignItems: 'center', justifyContent: 'center', height: 52},
  doneWrap: {alignItems: 'center', paddingTop: 14},
  doneIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.dangerBg,
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
  reasonCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.fieldBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    marginTop: 18,
  },
  reasonLabel: {fontWeight: '400', fontSize: 12, color: colors.textMuted},
  reasonValue: {
    fontWeight: '700',
    fontSize: 13,
    color: colors.ink,
    marginTop: 2,
  },
  cta: {marginTop: 18},
});
