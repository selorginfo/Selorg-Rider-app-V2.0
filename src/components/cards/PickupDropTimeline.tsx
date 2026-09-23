import React from 'react';
import {StyleSheet, View} from 'react-native';
import {AppText} from '../common/AppText';
import {colors} from '../../theme';

interface PickupDropTimelineProps {
  pickup: string;
  pickupSub?: string;
  deliver: string;
  minConnector?: number;
}

/** Green-dot → red-dot vertical route with PICKUP / DELIVER labels. */
export function PickupDropTimeline({
  pickup,
  pickupSub,
  deliver,
  minConnector = 34,
}: PickupDropTimelineProps) {
  return (
    <View style={styles.row}>
      <View style={styles.gutter}>
        <View style={[styles.dot, {backgroundColor: colors.primary}]} />
        <View style={[styles.line, {minHeight: minConnector}]} />
        <View style={[styles.dot, {backgroundColor: colors.dangerBright}]} />
      </View>
      <View style={styles.col}>
        <View>
          <AppText style={styles.kicker}>PICKUP</AppText>
          <AppText style={styles.value}>{pickup}</AppText>
          {!!pickupSub && <AppText style={styles.sub}>{pickupSub}</AppText>}
        </View>
        <View>
          <AppText style={styles.kicker}>DELIVER</AppText>
          <AppText style={styles.value}>{deliver}</AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', gap: 11},
  gutter: {width: 8, alignItems: 'center', paddingTop: 5},
  dot: {width: 8, height: 8, borderRadius: 4},
  line: {
    width: 2,
    flex: 1,
    backgroundColor: colors.neutralTile,
    marginVertical: 4,
  },
  col: {flex: 1, gap: 12},
  kicker: {
    fontWeight: '400',
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.4,
  },
  value: {fontWeight: '700', fontSize: 13, color: colors.ink},
  sub: {fontWeight: '400', fontSize: 11, color: colors.textMuted},
});
