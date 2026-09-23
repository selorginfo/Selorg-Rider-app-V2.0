import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, View} from 'react-native';
import {AppText} from '../common/AppText';
import {BottomSheet} from './BottomSheet';
import {SheetHeading} from './SheetHeading';
import {RadioDot} from '../inputs/RadioDot';
import {PrimaryButton} from '../buttons/PrimaryButton';
import {useRider} from '../../store/RiderContext';
import {riderApi} from '../../services/api/riderApi';
import {colors, radius} from '../../theme';

/** Home → shift picker, or 24h go-online when no slots are published. */
export function ShiftSelectSheet() {
  const {state, actions} = useRider();
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!state.shiftSheetOpen) {
      return;
    }
    setError('');
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const shifts = await riderApi.getShifts();
        if (!cancelled) {
          actions.patch({shifts});
        }
      } catch {
        if (!cancelled) {
          setError('Could not load shifts');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.shiftSheetOpen, actions]);

  async function handleStartShift() {
    if (!state.pickedShiftId) {
      return;
    }
    setStarting(true);
    setError('');
    try {
      const result = await riderApi.startShift(state.pickedShiftId);
      if (result.ok) {
        actions.startShift();
        actions.closeShiftSheet();
      } else {
        setError(result.error || 'Could not start shift');
      }
    } catch {
      setError('Could not start shift');
    } finally {
      setStarting(false);
    }
  }

  async function handleGoOnline() {
    setStarting(true);
    setError('');
    try {
      const result = await actions.goOnline();
      if (result.ok) {
        actions.closeShiftSheet();
      } else {
        setError(result.error || 'Could not go online');
      }
    } catch {
      setError('Could not go online');
    } finally {
      setStarting(false);
    }
  }

  const noShifts = !loading && state.shifts.length === 0;

  return (
    <BottomSheet
      visible={state.shiftSheetOpen}
      onClose={actions.closeShiftSheet}>
      <SheetHeading
        title={noShifts ? 'Go online' : 'Select a shift to start'}
        subtitle={
          noShifts
            ? 'You can go online any time — 24 hour availability'
            : "Pick the slot you're working now to go online"
        }
      />
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : noShifts ? (
        <AppText style={styles.empty}>
          No published shifts right now. Tap below to start taking orders.
        </AppText>
      ) : (
        <View style={styles.list}>
          {state.shifts.map(sl => {
            const sel = state.pickedShiftId === sl.id;
            return (
              <Pressable
                key={sl.id}
                onPress={() => actions.pickShift(sl.id)}
                style={[
                  styles.row,
                  {
                    borderColor: sel ? colors.primary : colors.border,
                    backgroundColor: sel ? colors.primaryTint06 : colors.white,
                  },
                ]}>
                <View style={styles.textCol}>
                  <AppText style={styles.time}>{sl.time}</AppText>
                  <AppText style={styles.pay}>{sl.pay}</AppText>
                </View>
                <RadioDot selected={sel} />
              </Pressable>
            );
          })}
        </View>
      )}
      {!!error && <AppText style={styles.error}>{error}</AppText>}
      <PrimaryButton
        label={noShifts ? 'Go Online' : 'Start Working'}
        onPress={noShifts ? handleGoOnline : handleStartShift}
        disabled={(!noShifts && !state.pickedShiftId) || starting || loading}
        height={52}
        borderRadius={radius.lg}
        style={styles.cta}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: {gap: 10, marginTop: 16},
  loadingWrap: {paddingVertical: 24, alignItems: 'center'},
  empty: {
    fontWeight: '500',
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
  },
  error: {
    fontWeight: '600',
    fontSize: 12,
    color: colors.danger,
    marginTop: 12,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1.5,
  },
  textCol: {flex: 1, minWidth: 0},
  time: {fontWeight: '700', fontSize: 14, color: colors.ink},
  pay: {fontWeight: '400', fontSize: 11, color: colors.textFaint, marginTop: 2},
  cta: {marginTop: 18},
});
