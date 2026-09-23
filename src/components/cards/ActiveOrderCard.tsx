import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {AppText} from '../common/AppText';
import {StatusBadge} from '../feedback/StatusBadge';
import {colors, radius, shadow} from '../../theme';

interface ActiveOrderCardProps {
  statusLabel: string;
  num: string;
  deliver: string;
  meta: string;
  onPress: () => void;
}

/** Orders → "Active Order" resume card. */
export function ActiveOrderCard({
  statusLabel,
  num,
  deliver,
  meta,
  onPress,
}: ActiveOrderCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [
        styles.card,
        shadow('md'),
        pressed && {opacity: 0.94},
      ]}>
      <View style={styles.top}>
        <StatusBadge label={statusLabel} pulse />
        <AppText style={styles.num}>{num}</AppText>
      </View>
      <AppText style={styles.deliver}>{deliver}</AppText>
      <AppText style={styles.meta}>{meta}</AppText>
      <View style={styles.bar}>
        <AppText style={styles.barText}>Continue Delivery →</AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    padding: 15,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  num: {fontWeight: '600', fontSize: 12, color: colors.slate},
  deliver: {fontWeight: '700', fontSize: 14, color: colors.ink, marginTop: 12},
  meta: {
    fontWeight: '400',
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  bar: {
    marginTop: 13,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barText: {fontWeight: '700', fontSize: 14, color: colors.white},
});
