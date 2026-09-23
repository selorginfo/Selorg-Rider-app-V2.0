import React from 'react';
import {Pressable, StyleProp, StyleSheet, TextStyle} from 'react-native';
import {AppText} from '../common/AppText';
import {colors} from '../../theme';

interface TextButtonProps {
  label: string;
  onPress: () => void;
  color?: string;
  weight?: TextStyle['fontWeight'];
  size?: number;
  style?: StyleProp<TextStyle>;
  align?: 'flex-start' | 'center' | 'flex-end';
}

/** Link-style text button ("‹ Back", "Autofill demo code", "Switch (demo)"…). */
export function TextButton({
  label,
  onPress,
  color = colors.primary,
  weight = '600',
  size = 13,
  style,
  align = 'flex-start',
}: TextButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={8}
      style={({pressed}) => [
        styles.wrap,
        {alignSelf: align, opacity: pressed ? 0.6 : 1},
      ]}>
      <AppText style={[{color, fontWeight: weight, fontSize: size}, style]}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {paddingVertical: 4},
});
