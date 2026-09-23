import React from 'react';
import {Pressable, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {AppText} from '../common/AppText';
import {EmojiIcon} from '../common/EmojiIcon';
import {RadioDot} from './RadioDot';
import {colors, radius} from '../../theme';

interface RadioRowProps {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  /** leading emoji tile (pay-method rows) */
  icon?: string;
  iconBg?: string;
  /** trailing accessory shown right of the radio (e.g. hub distance) */
  trailing?: React.ReactNode;
  /** accent for selection (green default, red for bulk exception) */
  accent?: string;
  /** put the radio on the left (hub list) instead of the right */
  radioLeft?: boolean;
  style?: StyleProp<ViewStyle>;
  titleWeight?: '600' | '700';
}

/** Selectable row used across hub / pay-method / cancel / language / shift / exception lists. */
export function RadioRow({
  title,
  subtitle,
  selected,
  onPress,
  icon,
  iconBg = colors.primaryTint,
  trailing,
  accent = colors.primary,
  radioLeft = false,
  style,
  titleWeight = '700',
}: RadioRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [
        styles.row,
        {
          borderColor: selected ? accent : colors.border,
          backgroundColor: selected
            ? accent === colors.danger
              ? colors.dangerBg
              : colors.primaryTint06
            : colors.white,
          opacity: pressed ? 0.9 : 1,
        },
        style,
      ]}>
      {radioLeft && <RadioDot selected={selected} color={accent} />}
      {icon && (
        <EmojiIcon
          glyph={icon}
          size={17}
          tile={{size: 38, radius: 11, bg: iconBg}}
        />
      )}
      <View style={styles.textCol}>
        <AppText style={[styles.title, {fontWeight: titleWeight}]}>
          {title}
        </AppText>
        {!!subtitle && <AppText style={styles.sub}>{subtitle}</AppText>}
      </View>
      {trailing}
      {!radioLeft && <RadioDot selected={selected} color={accent} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: radius.lg,
    borderWidth: 1.5,
  },
  textCol: {flex: 1, minWidth: 0},
  title: {fontSize: 13, color: colors.ink},
  sub: {fontSize: 11, color: colors.textFaint, marginTop: 2},
});
