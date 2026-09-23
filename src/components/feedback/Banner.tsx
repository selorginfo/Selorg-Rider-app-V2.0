import React from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {AppText} from '../common/AppText';
import {colors, radius} from '../../theme';

type Tone = 'info' | 'success' | 'warning' | 'danger';

interface BannerProps {
  tone?: Tone;
  /** leading glyph — emoji or a node */
  icon?: React.ReactNode;
  text: string;
  align?: 'center' | 'flex-start';
  style?: StyleProp<ViewStyle>;
}

const toneMap: Record<Tone, {bg: string; border: string; text: string}> = {
  info: {
    bg: colors.primaryTint08,
    border: colors.primaryBorder,
    text: colors.greenText,
  },
  success: {
    bg: colors.primaryTint06,
    border: 'rgba(35,114,39,.16)',
    text: colors.greenText,
  },
  warning: {
    bg: colors.warnBg,
    border: colors.warnBorder,
    text: colors.warnText,
  },
  danger: {
    bg: colors.dangerBg,
    border: colors.dangerBorder,
    text: colors.danger,
  },
};

/** Info / warning / success / contact-note banner. */
export function Banner({
  tone = 'info',
  icon,
  text,
  align = 'flex-start',
  style,
}: BannerProps) {
  const t = toneMap[tone];
  return (
    <View
      style={[
        styles.wrap,
        {backgroundColor: t.bg, borderColor: t.border, alignItems: align},
        style,
      ]}>
      {icon != null &&
        (typeof icon === 'string' ? (
          <AppText style={styles.icon}>{icon}</AppText>
        ) : (
          icon
        ))}
      <AppText style={[styles.text, {color: t.text}]}>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  icon: {fontSize: 14, marginTop: 1},
  text: {flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 17},
});
