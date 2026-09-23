import React from 'react';
import {StyleSheet, TextInput, View} from 'react-native';
import {AppText} from '../common/AppText';
import {colors, radius, FONT_FAMILY} from '../../theme';

interface PhoneInputProps {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  invalid?: boolean;
}

/** "+91" prefix + numeric field (Login / phone method). */
export function PhoneInput({
  value,
  onChangeText,
  placeholder = '10-digit number',
  invalid,
}: PhoneInputProps) {
  return (
    <View style={[styles.wrap, invalid && styles.invalid]}>
      <AppText style={styles.prefix}>+91</AppText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        inputMode="numeric"
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        maxLength={10}
        underlineColorAndroid="transparent"
        selectionColor={colors.primary}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    backgroundColor: colors.white,
  },
  invalid: {borderColor: colors.danger},
  prefix: {
    fontFamily: FONT_FAMILY,
    fontWeight: '700',
    fontSize: 15,
    color: colors.textSecondary,
  },
  input: {
    flex: 1,
    fontFamily: FONT_FAMILY,
    fontWeight: '600',
    fontSize: 16,
    color: colors.ink,
    paddingVertical: 14,
    letterSpacing: 1,
    backgroundColor: 'transparent',
  },
});
