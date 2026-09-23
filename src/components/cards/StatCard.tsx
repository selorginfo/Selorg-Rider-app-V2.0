import React from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {AppText} from '../common/AppText';
import {Card} from './Card';
import {colors} from '../../theme';

interface StatCardProps {
  /** icon node (SVG) or emoji/₹ glyph inside the coloured tile */
  icon: React.ReactNode;
  iconBg: string;
  value: string;
  label: string;
  style?: StyleProp<ViewStyle>;
}

/** Home "Today's Performance" 2×2 cards. */
export function StatCard({icon, iconBg, value, label, style}: StatCardProps) {
  return (
    <Card style={style} padded={false}>
      <View style={styles.inner}>
        <View style={[styles.iconTile, {backgroundColor: iconBg}]}>{icon}</View>
        <AppText style={styles.value}>{value}</AppText>
        <AppText style={styles.label}>{label}</AppText>
      </View>
    </Card>
  );
}

interface MiniStatProps {
  value: string;
  label: string;
  valueColor?: string;
}

/** Accept-screen 3-up plain stat cards + Complete summary cells. */
export function MiniStat({
  value,
  label,
  valueColor = colors.ink,
}: MiniStatProps) {
  return (
    <Card style={styles.mini}>
      <AppText style={[styles.miniValue, {color: valueColor}]}>{value}</AppText>
      <AppText style={styles.miniLabel}>{label}</AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  inner: {padding: 15},
  iconTile: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  value: {fontWeight: '800', fontSize: 18, color: colors.ink},
  label: {fontWeight: '400', fontSize: 12, color: colors.textMuted},
  mini: {flex: 1, alignItems: 'center', paddingVertical: 13},
  miniValue: {fontWeight: '800', fontSize: 15},
  miniLabel: {
    fontWeight: '400',
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
});
