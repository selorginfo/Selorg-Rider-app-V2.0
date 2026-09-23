import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import {AppText} from '../common/AppText';
import {colors, glow, radius} from '../../theme';

type Variant = 'green' | 'purple' | 'white';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  /** override height (design uses 56 default, 52 in sheets) */
  height?: number;
  /** override border radius (design uses pill 999 or 14 in sheets) */
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

const bg: Record<Variant, string> = {
  green: colors.primary,
  purple: colors.bulk,
  white: colors.white,
};
const fg: Record<Variant, string> = {
  green: colors.white,
  purple: colors.white,
  white: colors.primary,
};

/** Green/purple/white pill CTA — mirrors the HTML `primaryBtn(enabled)` helper. */
export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'green',
  height = 56,
  borderRadius = radius.pill,
  style,
}: PrimaryButtonProps) {
  const blocked = disabled || loading;
  const showAsDisabled = disabled && !loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{disabled: blocked}}
      disabled={blocked}
      onPress={onPress}
      style={({pressed}) => [
        styles.base,
        {
          height,
          borderRadius,
          backgroundColor: showAsDisabled
            ? variant === 'white'
              ? '#E9EEE9'
              : colors.primaryDisabled
            : bg[variant],
          opacity: pressed && !blocked ? 0.9 : 1,
        },
        !showAsDisabled && !loading && variant !== 'white'
          ? glow(variant === 'purple' ? colors.bulk : colors.primary)
          : null,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator
          color={variant === 'white' ? colors.primary : colors.white}
        />
      ) : (
        <AppText
          style={[
            styles.label,
            {
              color:
                showAsDisabled && variant === 'white'
                  ? colors.textFaint
                  : fg[variant],
            },
          ]}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {fontWeight: '700', fontSize: 16},
});
