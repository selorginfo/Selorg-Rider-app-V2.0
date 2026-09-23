import React, {useRef, useState} from 'react';
import {
  NativeSyntheticEvent,
  StyleSheet,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from 'react-native';
import {colors, radius, FONT_FAMILY} from '../../theme';
import {useLayout} from '../../theme/layout';

interface OtpInputProps {
  value: string;
  onChange: (next: string) => void;
  length?: number;
}

/** OTP entry with paste support, focus polish, and auto-advance. */
export function OtpInput({value, onChange, length = 4}: OtpInputProps) {
  const refs = useRef<Array<TextInput | null>>([]);
  const [focused, setFocused] = useState<number | null>(null);
  const {isCompact, width} = useLayout();
  const boxHeight = isCompact || length >= 6 ? 50 : 58;
  const fontSize = isCompact || length >= 6 ? 20 : 24;
  const gap = width < 360 ? 8 : 12;

  const applyDigits = (raw: string, startIndex = 0) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) {
      if (!raw) {
        const chars = value.split('');
        chars[startIndex] = '';
        onChange(chars.join('').slice(0, length));
      }
      return;
    }

    if (digits.length > 1) {
      const next = digits.slice(0, length);
      onChange(next);
      const focusAt = Math.min(next.length, length - 1);
      refs.current[focusAt]?.focus();
      return;
    }

    const chars = value.padEnd(length, ' ').split('');
    chars[startIndex] = digits;
    const next = chars.join('').replace(/ /g, '').slice(0, length);
    onChange(next);
    if (startIndex < length - 1) {
      refs.current[startIndex + 1]?.focus();
    }
  };

  const onKeyPress = (
    i: number,
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
  ) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (value[i]) {
        const chars = value.split('');
        chars[i] = '';
        onChange(chars.join('').slice(0, length));
        return;
      }
      if (refs.current[i - 1]) {
        const chars = value.split('');
        chars[i - 1] = '';
        onChange(chars.join('').slice(0, length));
        refs.current[i - 1]?.focus();
      }
    }
  };

  return (
    <View style={[styles.row, {gap}]}>
      {[...Array(length)].map((_, i) => {
        const filled = Boolean(value[i]);
        const isFocused = focused === i;
        return (
          <TextInput
            key={i}
            ref={el => {
              refs.current[i] = el;
            }}
            value={value[i] || ''}
            onChangeText={t => applyDigits(t, i)}
            onKeyPress={e => onKeyPress(i, e)}
            onFocus={() => setFocused(i)}
            onBlur={() => setFocused(prev => (prev === i ? null : prev))}
            keyboardType="number-pad"
            inputMode="numeric"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            maxLength={length}
            selectionColor={colors.primary}
            caretHidden={false}
            style={[
              styles.box,
              {
                height: boxHeight,
                fontSize,
                borderColor: isFocused
                  ? colors.primary
                  : filled
                    ? colors.primaryBorder
                    : colors.borderStrong,
                backgroundColor: isFocused
                  ? colors.primaryTint06
                  : filled
                    ? colors.primaryTint06
                    : colors.white,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', width: '100%'},
  box: {
    flex: 1,
    minWidth: 0,
    textAlign: 'center',
    fontFamily: FONT_FAMILY,
    fontWeight: '700',
    color: colors.ink,
    borderWidth: 1.5,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
  },
});
