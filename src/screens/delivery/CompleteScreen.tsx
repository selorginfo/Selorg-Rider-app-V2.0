import React, {useCallback} from 'react';
import {StyleSheet, View} from 'react-native';
import {AppText} from '../../components/common/AppText';
import {SuccessScreen} from '../../components/feedback/SuccessScreen';
import {PrimaryButton} from '../../components/buttons/PrimaryButton';
import {useHardwareBack} from '../../hooks/useHardwareBack';
import {resetTo} from '../../navigation/navigationRef';
import {useRider} from '../../store/RiderContext';
import {activeOrder} from '../../store/selectors';
import {colors} from '../../theme';

export function CompleteScreen() {
  const {state, actions} = useRider();
  const a = activeOrder(state);

  const exitToOrders = useCallback(() => {
    actions.finishFlow();
    resetTo('Main', {screen: 'Orders'});
  }, [actions]);

  // Block hardware back into proof-of-delivery after success.
  useHardwareBack(
    useCallback(() => {
      exitToOrders();
      return true;
    }, [exitToOrders]),
  );

  if (!a) {
    return (
      <SuccessScreen
        gradient={[colors.primary, colors.primaryDark]}
        title="Delivered!"
        subtitle="Order completed"
        body={null}
        footer={
          <PrimaryButton
            label="Back to Orders"
            variant="white"
            onPress={exitToOrders}
          />
        }
      />
    );
  }

  return (
    <SuccessScreen
      gradient={[colors.primary, colors.primaryDark]}
      title="Delivered!"
      subtitle={`${a.num} handed over successfully`}
      body={
        <View style={styles.card}>
          <AppText style={styles.earnLabel}>You earned</AppText>
          <AppText style={styles.earnValue}>₹{a.payout}</AppText>
          <View style={styles.stats}>
            <Stat value={a.time || '—'} label="Trip time" />
            <Stat value={a.distance || '—'} label="Distance" />
          </View>
        </View>
      }
      footer={
        <PrimaryButton
          label="Back to Orders"
          variant="white"
          onPress={exitToOrders}
        />
      }
    />
  );
}

function Stat({value, label}: {value: string; label: string}) {
  return (
    <View>
      <AppText style={styles.statValue}>{value}</AppText>
      <AppText style={styles.statLabel}>{label}</AppText>
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
  earnLabel: {fontWeight: '400', fontSize: 12, color: colors.onPrimarySoft},
  earnValue: {
    fontWeight: '800',
    fontSize: 40,
    color: colors.white,
    marginTop: 2,
    letterSpacing: -1,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
  },
  statValue: {
    fontWeight: '700',
    fontSize: 15,
    color: colors.white,
    textAlign: 'center',
  },
  statLabel: {
    fontWeight: '400',
    fontSize: 11,
    color: colors.onPrimarySoft,
    textAlign: 'center',
  },
});
