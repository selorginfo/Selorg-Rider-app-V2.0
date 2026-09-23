import React from 'react';
import {Pressable, StyleProp, StyleSheet, ViewStyle} from 'react-native';
import {AppText} from '../common/AppText';
import {GradientView} from '../common/GradientView';
import {colors} from '../../theme';

interface GradientHeaderProps {
  colors?: string[];
  angle?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** extra bottom padding (Profile header overlaps the stat row) */
}

/** Coloured gradient header block (Profile / Accept / BulkOverview / BulkActive). */
export function GradientHeader({
  colors: grad = [colors.primary, colors.primaryDark],
  angle = 150,
  children,
  style,
}: GradientHeaderProps) {
  return (
    <GradientView colors={grad} angle={angle} style={[styles.wrap, style]}>
      {children}
    </GradientView>
  );
}

interface BackChipProps {
  onPress: () => void;
  tone?: 'light' | 'dark';
}

/** Rounded translucent ‹ back chip used inside gradient headers. */
export function BackChip({onPress}: BackChipProps) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={styles.chip}>
      <AppText style={styles.chipGlyph}>‹</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20},
  chip: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipGlyph: {fontWeight: '700', fontSize: 18, color: colors.white},
});

export const gradientHeaderStyles = styles;
