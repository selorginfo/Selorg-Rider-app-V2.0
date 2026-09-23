import React from 'react';
import {Pressable, StyleProp, StyleSheet, ViewStyle} from 'react-native';
import {AppText} from '../common/AppText';
import {colors, radius} from '../../theme';

type Tone = 'green' | 'danger' | 'neutral';

interface OutlineButtonProps {
  label: string;
  onPress: () => void;
  tone?: Tone;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  leading?: React.ReactNode;
}

const toneMap: Record<Tone, {border: string; text: string; bg: string}> = {
  green: {
    border: colors.primary,
    text: colors.primary,
    bg: colors.primaryTint06,
  },
  danger: {
    border: colors.dangerBorder,
    text: colors.danger,
    bg: colors.dangerBg,
  },
  neutral: {
    border: colors.borderStrong,
    text: colors.textSecondary,
    bg: colors.white,
  },
};

/** Bordered secondary button (e.g. "Deposit cash to Selorg", "Cancel order"). */
export function OutlineButton({
  label,
  onPress,
  tone = 'green',
  height = 52,
  borderRadius = radius.lg,
  style,
  leading,
}: OutlineButtonProps) {
  const t = toneMap[tone];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [
        styles.base,
        {
          height,
          borderRadius,
          borderColor: t.border,
          backgroundColor: t.bg,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}>
      {leading}
      <AppText style={[styles.label, {color: t.text}]}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
  },
  label: {fontWeight: '700', fontSize: 15},
});
