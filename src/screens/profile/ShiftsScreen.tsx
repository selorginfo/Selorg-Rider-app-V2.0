import React, {useCallback, useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Screen} from '../../components/common/Screen';
import {AppText} from '../../components/common/AppText';
import {ScreenHeader} from '../../components/headers/ScreenHeader';
import {SlotCard} from '../../components/cards/SlotCard';
import {useAppNavigation} from '../../hooks/useAppNavigation';
import {useRider} from '../../store/RiderContext';
import {bookedCount, isSlotBooked} from '../../store/selectors';
import {riderApi} from '../../services/api';
import {colors} from '../../theme';

function assignmentShiftId(row: unknown): string {
  if (!row || typeof row !== 'object') {
    return '';
  }
  const r = row as {shiftId?: unknown; id?: unknown; _id?: unknown};
  if (typeof r.shiftId === 'string' && r.shiftId) {
    return r.shiftId;
  }
  if (r.shiftId && typeof r.shiftId === 'object') {
    const populated = r.shiftId as {_id?: unknown; id?: unknown};
    const id = populated.id || populated._id;
    return id ? String(id) : '';
  }
  if (r.id) {
    return String(r.id);
  }
  return r._id ? String(r._id) : '';
}

export function ShiftsScreen() {
  const nav = useAppNavigation();
  const {state, actions} = useRider();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [available, mine] = await Promise.all([
        riderApi.getShifts(),
        riderApi.getMyShifts(),
      ]);
      let shifts = available;
      if (mine.ok && mine.data) {
        const rows = Array.isArray(mine.data)
          ? mine.data
          : Array.isArray((mine.data as {shifts?: unknown[]}).shifts)
            ? (mine.data as {shifts: unknown[]}).shifts
            : [];
        const bookedIds = new Set(rows.map(assignmentShiftId).filter(Boolean));
        if (bookedIds.size > 0) {
          shifts = available.map(s =>
            bookedIds.has(s.id) ? {...s, booked: true} : s,
          );
        }
      }
      actions.patch({shifts});
      if (available.length === 0) {
        setError('No shifts available right now.');
      }
    } catch (err) {
      actions.patch({shifts: []});
      setError(
        err instanceof Error ? err.message : 'Could not load shifts. Retry.',
      );
    } finally {
      setLoading(false);
    }
  }, [actions]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onToggle = useCallback(
    async (id: string) => {
      if (!id || busyId) {
        return;
      }
      setBusyId(id);
      setError('');
      try {
        const result = await actions.toggleBooked(id);
        if (!result.ok) {
          setError(result.error || 'Could not update shift booking');
        }
      } catch {
        setError('Could not update shift booking');
      } finally {
        setBusyId(null);
      }
    },
    [actions, busyId],
  );

  return (
    <Screen background={colors.white} contentContainerStyle={styles.body}>
      <ScreenHeader title="Shifts" onBack={() => nav.goBack()} />
      <AppText style={styles.sub}>
        Booked {bookedCount(state)} · tap a slot to book or cancel
      </AppText>
      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <>
          {!!error && (
            <Pressable onPress={() => void load()}>
              <AppText style={styles.error}>{error} · Tap to retry</AppText>
            </Pressable>
          )}
          {state.shifts.length === 0 && !error ? (
            <AppText style={styles.empty}>No shifts available</AppText>
          ) : (
            state.shifts.map(s => (
              <SlotCard
                key={s.id}
                slot={s}
                booked={isSlotBooked(state, s.id)}
                busy={busyId === s.id}
                onToggle={() => void onToggle(s.id)}
              />
            ))
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24},
  sub: {
    fontWeight: '400',
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 14,
  },
  loader: {marginTop: 40},
  error: {
    fontWeight: '600',
    fontSize: 13,
    color: colors.danger,
    marginBottom: 12,
    textAlign: 'center',
  },
  empty: {
    fontWeight: '500',
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
  },
});
