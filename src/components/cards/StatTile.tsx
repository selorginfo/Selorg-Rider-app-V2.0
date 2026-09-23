import React from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {AppText} from '../common/AppText';
import {colors, radius, shadow} from '../../theme';

interface StatTileProps {
  value: string;
  label: string;
  valueColor?: string;
  /** 'card' = white raised (Profile); 'flat' = grey (BulkHistoryDetail / BulkOverview) */
  tone?: 'card' | 'flat';
  style?: StyleProp<ViewStyle>;
}

/** Small 3-up stat tile (Profile stats, Bulk history/overview counts). */
export function StatTile({
  value,
  label,
  valueColor = colors.ink,
  tone = 'card',
  style,
}: StatTileProps) {
  return (
    <View
      style={[
        styles.base,
        tone === 'card' ? [styles.card, shadow('md')] : styles.flat,
        style,
      ]}>
      <AppText style={[styles.value, {color: valueColor}]}>{value}</AppText>
      <AppText style={styles.label}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  flat: {
    backgroundColor: colors.fieldBg,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  value: {fontWeight: '800', fontSize: 18},
  label: {
    fontWeight: '500',
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
});
