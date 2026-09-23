import React from 'react';
import {StyleSheet, View} from 'react-native';
import {AppText} from '../common/AppText';
import {Card} from './Card';
import {PickupDropTimeline} from './PickupDropTimeline';
import {StatusBadge} from '../feedback/StatusBadge';
import {PrimaryButton} from '../buttons/PrimaryButton';
import {colors, radius} from '../../theme';
import type {Order} from '../../types';

interface OrderCardProps {
  order: Order;
  onAccept: () => void;
}

/** Orders → "Available to Accept" card. */
export function OrderCard({order, onAccept}: OrderCardProps) {
  return (
    <Card padded={false}>
      {order.priority && (
        <StatusBadge label="PRIORITY" ribbon style={styles.ribbon} />
      )}
      <View style={styles.body}>
        <View style={[styles.topRow, order.priority && {paddingTop: 10}]}>
          <View>
            <AppText style={styles.payout}>₹{order.deliveryFee ?? order.payout}</AppText>
            <AppText style={styles.payoutLabel}>Delivery Fee</AppText>
          </View>
          <View style={styles.numChip}>
            <AppText style={styles.numText}>{order.num}</AppText>
          </View>
        </View>

        <View style={styles.timelineWrap}>
          <PickupDropTimeline
            pickup={order.pickup}
            pickupSub={order.bay}
            deliver={order.deliver}
          />
        </View>

        <View style={styles.pills}>
          <View style={styles.pill}>
            <AppText style={styles.pillText}>📍 {order.distance}</AppText>
          </View>
          <View style={styles.pill}>
            <AppText style={styles.pillText}>⏱ {order.time}</AppText>
          </View>
          <View style={styles.pill}>
            <AppText style={styles.pillText}>🛍 {order.items} items</AppText>
          </View>
        </View>

        <PrimaryButton
          label="Accept Order"
          onPress={onAccept}
          height={52}
          style={styles.cta}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  ribbon: {position: 'absolute', top: 0, right: 0, zIndex: 2},
  body: {padding: 15},
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  payout: {fontWeight: '800', fontSize: 17, color: colors.ink},
  payoutLabel: {fontWeight: '400', fontSize: 11, color: colors.textMuted},
  numChip: {
    backgroundColor: colors.fieldBg,
    borderRadius: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  numText: {fontWeight: '500', fontSize: 11, color: colors.textSecondary},
  timelineWrap: {marginTop: 14},
  pills: {flexDirection: 'row', gap: 7, marginTop: 14},
  pill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fieldBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
    paddingVertical: 6,
  },
  pillText: {fontWeight: '500', fontSize: 11, color: colors.textSecondary},
  cta: {marginTop: 14, borderRadius: radius.pill},
});
