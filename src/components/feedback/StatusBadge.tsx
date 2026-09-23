import React from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {AppText} from '../common/AppText';
import {colors, radius} from '../../theme';
import {PulseDot} from './PulseDot';

interface StatusBadgeProps {
  label: string;
  color?: string;
  bg?: string;
  /** show a leading pulsing dot (live status) */
  pulse?: boolean;
  /** show a leading static dot */
  dot?: boolean;
  /** corner ribbon style (PRIORITY) */
  ribbon?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Status pill / priority ribbon / verified chip / order-status label. */
export function StatusBadge({
  label,
  color = colors.primary,
  bg = colors.primaryTint,
  pulse,
  dot,
  ribbon,
  style,
}: StatusBadgeProps) {
  if (ribbon) {
    return (
      <View style={[styles.ribbon, style]}>
        <AppText style={styles.ribbonText}>{label}</AppText>
      </View>
    );
  }
  return (
    <View style={[styles.pill, {backgroundColor: bg}, style]}>
      {pulse && <PulseDot color={color} size={7} />}
      {dot && <View style={[styles.dot, {backgroundColor: color}]} />}
      <AppText style={[styles.text, {color}]}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  text: {fontWeight: '700', fontSize: 11},
  dot: {width: 6, height: 6, borderRadius: 3},
  ribbon: {
    backgroundColor: colors.dangerBright,
    borderTopRightRadius: 9,
    borderBottomLeftRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  ribbonText: {color: colors.white, fontWeight: '800', fontSize: 10},
});
