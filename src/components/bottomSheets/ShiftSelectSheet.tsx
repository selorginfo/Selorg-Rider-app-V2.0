import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, View} from 'react-native';
import {AppText} from '../common/AppText';
import {BottomSheet} from './BottomSheet';
import {SheetHeading} from './SheetHeading';
import {RadioDot} from '../inputs/RadioDot';
import {PrimaryButton} from '../buttons/PrimaryButton';
import {OutlineButton} from '../buttons/OutlineButton';
import {useRider} from '../../store/RiderContext';
import {isSlotBooked} from '../../store/selectors';
import {riderApi} from '../../services/api/riderApi';
import {enableAndReadGps} from '../../services/location/locationTracker';
import {colors, radius} from '../../theme';

/**
 * Home online toggle → pick a published shift, book if needed, then start.
 * Rider stays offline until Start Working succeeds against the backend.
 * Undeposited COD from a prior shift blocks start until transferred.
 */
export function ShiftSelectSheet() {
  const {state, actions} = useRider();
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [codBlocked, setCodBlocked] = useState(false);
  const [codMessage, setCodMessage] = useState('');
  const [cashInHand, setCashInHand] = useState(0);

  useEffect(() => {
    if (!state.shiftSheetOpen) {
      return;
    }
    setError('');
    setCodBlocked(false);
    setCodMessage('');
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [available, mine, cash] = await Promise.all([
          riderApi.getShifts(),
          riderApi.getMyShifts().catch(() => ({ok: false as const, data: null})),
          riderApi.getCashSummary().catch(() => ({ok: false as const, data: null})),
        ]);

        if (cash.ok && cash.data) {
          const amount = cash.data.cashInHand ?? 0;
          const blocked =
            Boolean(cash.data.codTransferRequired) ||
            cash.data.canGoOnline === false;
          if (!cancelled) {
            setCashInHand(amount);
            actions.patch({floatingCash: amount});
            if (blocked) {
              setCodBlocked(true);
              setCodMessage(
                cash.data.transferMessage ||
                  `Transfer your COD cash (₹${amount.toLocaleString(
                    'en-IN',
                  )}) to the company before going online.`,
              );
            }
          }
        }

        let shifts = available;
        if (mine.ok && mine.data) {
          const rows = Array.isArray(mine.data)
            ? mine.data
            : Array.isArray((mine.data as {shifts?: unknown[]}).shifts)
              ? (mine.data as {shifts: unknown[]}).shifts
              : [];
          const bookedIds = new Set(
            rows
              .map(row => {
                if (!row || typeof row !== 'object') {
                  return '';
                }
                const r = row as {
                  shiftId?: unknown;
                  id?: unknown;
                  _id?: unknown;
                };
                if (typeof r.shiftId === 'string') {
                  return r.shiftId;
                }
                if (r.shiftId && typeof r.shiftId === 'object') {
                  const p = r.shiftId as {id?: unknown; _id?: unknown};
                  return String(p.id || p._id || '');
                }
                return String(r.id || r._id || '');
              })
              .filter(Boolean),
          );
          if (bookedIds.size > 0) {
            shifts = available.map(s =>
              bookedIds.has(s.id) ? {...s, booked: true} : s,
            );
          }
        }
        if (!cancelled) {
          const bookedFirst =
            shifts.find(sl => sl.booked)?.id || shifts[0]?.id || null;
          actions.patch({
            shifts,
            pickedShiftId:
              state.pickedShiftId &&
              shifts.some(s => s.id === state.pickedShiftId)
                ? state.pickedShiftId
                : bookedFirst,
          });
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
    // Only reload when the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.shiftSheetOpen, actions]);

  async function handleStartWorking() {
    const shiftId = state.pickedShiftId;
    if (!shiftId) {
      return;
    }
    if (codBlocked) {
      setError(
        codMessage ||
          'Transfer your COD cash to the company before starting your shift.',
      );
      return;
    }
    setStarting(true);
    setError('');
    try {
      if (!isSlotBooked(state, shiftId)) {
        const booked = await riderApi.bookShift(shiftId, true);
        if (!booked.ok) {
          setError(booked.error || 'Could not book this shift');
          return;
        }
        actions.patch({
          booked: {...state.booked, [shiftId]: true},
          shifts: state.shifts.map(sl =>
            sl.id === shiftId ? {...sl, booked: true} : sl,
          ),
        });
      }

      let location: {latitude: number; longitude: number} | undefined;
      try {
        const point = await enableAndReadGps();
        location = {latitude: point.latitude, longitude: point.longitude};
      } catch {
        // GPS optional — backend skips geofence when omitted.
      }

      const result = await riderApi.startShift(shiftId, location);
      if (!result.ok) {
        if (
          result.appCode === 'COD_TRANSFER_REQUIRED' ||
          result.appCode === 'UNDEPOSITED_CASH'
        ) {
          setCodBlocked(true);
          setCodMessage(result.error || '');
        }
        setError(result.error || 'Could not start shift');
        return;
      }
      const slot = state.shifts.find(sl => sl.id === shiftId);
      actions.startShift({
        shiftId: result.data?.shiftId || shiftId,
        startedAt: result.data?.startedAt || new Date().toISOString(),
        timeDisplay: result.data?.shift?.timeDisplay || slot?.time || null,
      });
    } catch {
      setError('Could not start shift');
    } finally {
      setStarting(false);
    }
  }

  function openDeposit() {
    actions.closeShiftSheet();
    actions.openDeposit();
  }

  const noShifts = !loading && state.shifts.length === 0;

  return (
    <BottomSheet
      visible={state.shiftSheetOpen}
      onClose={actions.closeShiftSheet}>
      <SheetHeading
        title={codBlocked ? 'Transfer COD first' : 'Select a shift to start'}
        subtitle={
          codBlocked
            ? codMessage ||
              `You still hold ₹${cashInHand.toLocaleString(
                'en-IN',
              )} COD. Transfer it to the company to go online.`
            : noShifts
              ? 'No published shifts right now. Book a slot first, then try again.'
              : "Pick the slot you're working now to go online"
        }
      />
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : codBlocked ? (
        <View style={styles.blockCard}>
          <AppText style={styles.blockAmt}>
            ₹{cashInHand.toLocaleString('en-IN')}
          </AppText>
          <AppText style={styles.blockHint}>
            COD cash still with you — transfer to company before starting
          </AppText>
          <PrimaryButton
            label="Transfer COD now"
            onPress={openDeposit}
            height={52}
            borderRadius={radius.lg}
            style={styles.cta}
          />
          <OutlineButton
            label="Close"
            onPress={actions.closeShiftSheet}
            height={48}
            borderRadius={radius.lg}
            style={styles.secondary}
          />
        </View>
      ) : noShifts ? (
        <AppText style={styles.empty}>
          No shifts available. Open Book More Slots on Home to schedule a
          shift, then turn the toggle on again.
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
      {!!error && !codBlocked && <AppText style={styles.error}>{error}</AppText>}
      {!codBlocked ? (
        <PrimaryButton
          label="Start Working"
          onPress={handleStartWorking}
          disabled={noShifts || !state.pickedShiftId || starting || loading}
          height={52}
          borderRadius={radius.lg}
          style={styles.cta}
        />
      ) : null}
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
  secondary: {marginTop: 10},
  blockCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.warnBg,
    borderWidth: 1,
    borderColor: colors.warnBorder,
    alignItems: 'center',
  },
  blockAmt: {
    fontWeight: '800',
    fontSize: 28,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  blockHint: {
    fontWeight: '500',
    fontSize: 13,
    color: colors.warnText,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 4,
  },
});
