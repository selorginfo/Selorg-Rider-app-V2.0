import React from 'react';
import {StyleProp, StyleSheet, ViewStyle} from 'react-native';
import {GradientView} from '../common/GradientView';
import {colors, radius, glow} from '../../theme';

interface GradientHeroCardProps {
  colors?: string[];
  angle?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glowColor?: string;
}

/** Earnings "THIS WEEK" / FloatCash "CASH IN HAND" style gradient panel. */
export function GradientHeroCard({
  colors: grad = [colors.primary, colors.primaryDark],
  angle = 120,
  children,
  style,
  glowColor = colors.primary,
}: GradientHeroCardProps) {
  return (
    <GradientView
      colors={grad}
      angle={angle}
      style={[styles.card, glow(glowColor), style]}>
      {children}
    </GradientView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: 22,
  },
});
