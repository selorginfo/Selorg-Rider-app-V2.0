import React from 'react';
import {StyleSheet, TextInput} from 'react-native';
import {colors, radius, FONT_FAMILY} from '../../theme';

interface SearchBarProps {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}

/** Plain search field (Bulk All-Stops). */
export function SearchBar({value, onChangeText, placeholder}: SearchBarProps) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textFaint}
      style={styles.input}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 11,
    paddingHorizontal: 14,
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    color: colors.ink,
    backgroundColor: colors.fieldBg,
  },
});
