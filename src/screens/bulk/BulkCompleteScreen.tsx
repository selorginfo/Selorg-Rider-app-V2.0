import React, {useCallback} from 'react';
import {StyleSheet, View} from 'react-native';
import {AppText} from '../../components/common/AppText';
import {SuccessScreen} from '../../components/feedback/SuccessScreen';
import {PrimaryButton} from '../../components/buttons/PrimaryButton';
import {useHardwareBack} from '../../hooks/useHardwareBack';
import {resetTo} from '../../navigation/navigationRef';
import {useRider} from '../../store/RiderContext';
import {selectBulk} from '../../store/selectors';
import {colors} from '../../theme';

export function BulkCompleteScreen() {
  const {state, actions} = useRider();
  const b = selectBulk(state);
  const s = b.summary;

  const exitToHome = useCallback(() => {
    actions.resetBulkBatch();
    resetTo('Main', {screen: 'Home'});
  }, [actions]);

  useHardwareBack(
    useCallback(() => {
      exitToHome();
      return true;
    }, [exitToHome]),
  );

  return (
    <SuccessScreen
      gradient={[colors.bulkDark, colors.bulk]}
      title="Batch Completed!"
      subtitle={`Batch #${b.batchId} finished`}
      body={
        <View style={styles.card}>
          <View style={styles.row}>
            <Cell value={String(s.total)} label="Orders" />
            <Cell value={String(s.completed)} label="Delivered" />
            <Cell value={String(s.failed)} label="Failed" />
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <Cell value={s.distance} label="Distance" small />
            <Cell value={s.duration} label="Duration" small />
            <Cell value={s.earning ? `₹${s.earning}` : '—'} label="Earned" small />
          </View>
        </View>
      }
      footer={
        <PrimaryButton
          label="Back to Home"
          variant="white"
          onPress={exitToHome}
          style={{backgroundColor: colors.white}}
        />
      }
    />
  );
}

function Cell({
  value,
  label,
  small,
}: {
  value: string;
  label: string;
  small?: boolean;
}) {
  return (
    <View style={styles.cell}>
      <AppText style={[styles.value, small && styles.valueSmall]}>
        {value}
      </AppText>
      <AppText style={styles.label}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 16,
    padding: 20,
    marginTop: 26,
    width: '100%',
  },
  row: {flexDirection: 'row', justifyContent: 'space-around'},
  rowBorder: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
  },
  cell: {alignItems: 'center'},
  value: {fontWeight: '800', fontSize: 20, color: colors.white},
  valueSmall: {fontWeight: '700', fontSize: 15},
  label: {
    fontWeight: '400',
    fontSize: 11,
    color: colors.bulkOnDark,
    marginTop: 2,
  },
});
