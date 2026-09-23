import React from 'react';
import {
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import {AppText} from '../common/AppText';
import {colors, radius, FONT_FAMILY} from '../../theme';

interface LabeledInputProps extends TextInputProps {
  label?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

/** Standard onboarding text field: bold label + rounded grey input. */
export function LabeledInput({
  label,
  containerStyle,
  style,
  ...rest
}: LabeledInputProps) {
  return (
    <View style={containerStyle}>
      {!!label && <AppText style={styles.label}>{label}</AppText>}
      <TextInput
        placeholderTextColor={colors.textFaint}
        style={[styles.input, style]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: FONT_FAMILY,
    fontWeight: '700',
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    padding: 14,
    fontFamily: FONT_FAMILY,
    fontWeight: '600',
    fontSize: 15,
    color: colors.inkStrong,
    backgroundColor: colors.fieldBg,
  },
});
