import React from 'react';
import {StyleSheet} from 'react-native';
import {AppText} from '../common/AppText';
import {Card} from './Card';
import {colors} from '../../theme';

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
  mini: {flex: 1, alignItems: 'center', paddingVertical: 13},
  miniValue: {fontWeight: '800', fontSize: 15},
  miniLabel: {
    fontWeight: '400',
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
});
