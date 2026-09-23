import React, {useEffect, useState} from 'react';
import {StyleSheet, TextInput, View} from 'react-native';
import {AppText} from '../common/AppText';
import {PopIn} from '../feedback/PopIn';
import {CheckIcon} from '../common/Icons';
import {BottomSheet} from './BottomSheet';
import {SheetHeading} from './SheetHeading';
import {RadioRow} from '../inputs/RadioRow';
import {PrimaryButton} from '../buttons/PrimaryButton';
import {OutlineButton} from '../buttons/OutlineButton';
import {useRider} from '../../store/RiderContext';
import {bulkApi} from '../../services/api/bulkApi';
import {configApi} from '../../services/api/configApi';
import {BULK_EXCEPTION_REASONS} from '../../mock';
import {replace} from '../../navigation/navigationRef';
import {NOTE_MAX} from '../../utils/validation';
import {colors, radius, FONT_FAMILY} from '../../theme';

type Stage = 'form' | 'done';

/** BulkActive / BulkStopDetail → "Delivery issue" sheet. */
export function BulkExceptionSheet() {
  const {state, actions} = useRider();
  const valid =
    !!state.bulkExceptionReason &&
    (state.bulkExceptionReason !== 'other' ||
      (state.bulkExceptionNote.trim().length > 0 &&
        state.bulkExceptionNote.trim().length <= NOTE_MAX));
  const [reasons, setReasons] = useState(BULK_EXCEPTION_REASONS);
  const [failError, setFailError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<Stage>('form');
  const [wasCurrent, setWasCurrent] = useState(false);
  const [successReason, setSuccessReason] = useState('');

  useEffect(() => {
    if (!state.bulkExceptionOpen) {
      setStage('form');
      setFailError('');
      setSubmitting(false);
      setWasCurrent(false);
      setSuccessReason('');
      return;
    }
    let cancelled = false;
    (async () => {
      const result = await configApi.getCancelReasons('bulk');
      if (cancelled || !result.ok || !result.data?.reasons?.length) {
        return;
      }
      setReasons(
        result.data.reasons.map(r => ({
          id: r.id as (typeof BULK_EXCEPTION_REASONS)[number]['id'],
          label: r.label,
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [state.bulkExceptionOpen]);

  const reasonLabel =
    successReason ||
    reasons.find(r => r.id === state.bulkExceptionReason)?.label ||
    state.bulkExceptionReason;

  return (
    <BottomSheet
      visible={state.bulkExceptionOpen}
      onClose={
        stage === 'done'
          ? () => {
              actions.closeException();
              if (wasCurrent) {
                replace('BulkActive');
              }
            }
          : actions.closeException
      }
      scroll>
      {stage === 'form' && (
        <>
          <SheetHeading
            title="Delivery issue"
            subtitle="This stop will be marked failed and skipped for now"
          />
          <View style={styles.list}>
            {reasons.map(r => (
              <RadioRow
                key={r.id}
                title={r.label}
                selected={state.bulkExceptionReason === r.id}
                onPress={() => actions.setExceptionReason(r.id)}
                accent={colors.danger}
                titleWeight="700"
              />
            ))}
          </View>
          {state.bulkExceptionReason === 'other' && (
            <TextInput
              value={state.bulkExceptionNote}
              onChangeText={v =>
                actions.setExceptionNote(v.slice(0, NOTE_MAX))
              }
              placeholder="Add a short note (required)"
              placeholderTextColor={colors.textFaint}
              multiline
              maxLength={NOTE_MAX}
              style={styles.note}
            />
          )}
          {state.bulkExceptionReason === 'other' &&
            state.bulkExceptionNote.trim().length === 0 && (
              <AppText style={styles.failError}>
                A note is required for “Other”.
              </AppText>
            )}
          <View style={styles.actionRow}>
            <OutlineButton
              label="Cancel"
              tone="neutral"
              onPress={() => {
                if (submitting) {
                  return;
                }
                actions.closeException();
              }}
              style={styles.half}
            />
            <PrimaryButton
              label={submitting ? 'Saving…' : 'Mark Failed'}
              onPress={async () => {
                const target = state.bulkExceptionTarget;
                if (target == null || !valid || submitting) {
                  return;
                }
                const stopId = state.bulkOrders[target]?.id;
                if (!stopId || !state.bulkExceptionReason) {
                  return;
                }
                setSubmitting(true);
                setFailError('');
                try {
                  const current = target === bulkCurrentIdx(state);
                  const label =
                    reasons.find(r => r.id === state.bulkExceptionReason)
                      ?.label || state.bulkExceptionReason;
                  const result = await bulkApi.markFailed(
                    stopId,
                    state.bulkExceptionReason,
                    state.bulkExceptionNote.trim() || undefined,
                  );
                  if (!result.ok) {
                    setFailError(
                      result.error || 'Could not mark this stop as failed',
                    );
                    return;
                  }
                  actions.patch({
                    bulkStatuses: {
                      ...state.bulkStatuses,
                      [target]: 'failed',
                    },
                    bulkStopPhase: 'toNav',
                  });
                  setWasCurrent(current);
                  setSuccessReason(label);
                  setStage('done');
                } finally {
                  setSubmitting(false);
                }
              }}
              disabled={!valid || submitting}
              height={52}
              borderRadius={radius.lg}
              style={[
                styles.half,
                {
                  backgroundColor:
                    valid && !submitting ? colors.danger : colors.dangerDisabled2,
                },
              ]}
            />
          </View>
          {!!failError && <AppText style={styles.failError}>{failError}</AppText>}
        </>
      )}

      {stage === 'done' && (
        <View style={styles.doneWrap}>
          <PopIn style={styles.doneIcon}>
            <CheckIcon size={34} strokeWidth={3.2} />
          </PopIn>
          <AppText style={styles.doneTitle}>Stop marked failed</AppText>
          <AppText style={styles.doneBody}>
            This delivery stop was skipped and reported to the hub.
          </AppText>
          <View style={styles.reasonCard}>
            <AppText style={styles.reasonLabel}>Reason</AppText>
            <AppText style={styles.reasonValue}>{reasonLabel}</AppText>
          </View>
          <PrimaryButton
            label="Continue"
            onPress={() => {
              actions.closeException();
              if (wasCurrent) {
                replace('BulkActive');
              }
            }}
            height={52}
            borderRadius={radius.lg}
            style={styles.cta}
          />
        </View>
      )}
      <AppText style={styles.spacer} />
    </BottomSheet>
  );
}

function bulkCurrentIdx(s: ReturnType<typeof useRider>['state']): number {
  const total = s.bulkOrders.length || 0;
  for (let i = 0; i < total; i += 1) {
    if (!s.bulkStatuses[i]) {
      return i;
    }
  }
  return -1;
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
    minHeight: 60,
    textAlignVertical: 'top',
  },
  actionRow: {flexDirection: 'row', gap: 10, marginTop: 18},
  half: {flex: 1, width: undefined},
  failError: {
    fontWeight: '600',
    fontSize: 12,
    color: colors.danger,
    marginTop: 10,
    textAlign: 'center',
  },
  spacer: {height: 4},
  doneWrap: {alignItems: 'center', paddingTop: 14},
  doneIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primaryTint,
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
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  reasonCard: {
    width: '100%',
    backgroundColor: colors.fieldBg,
    borderRadius: radius.lg,
    padding: 14,
    marginTop: 18,
    marginBottom: 8,
  },
  reasonLabel: {fontWeight: '600', fontSize: 11, color: colors.textFaint},
  reasonValue: {
    fontWeight: '700',
    fontSize: 14,
    color: colors.ink,
    marginTop: 4,
  },
  cta: {width: '100%', marginTop: 12},
});
