import React from 'react';
import {Pressable, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {CheckIcon} from '../common/Icons';
import {colors} from '../../theme';

interface CheckboxProps {
  checked: boolean;
  onToggle: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
  /** render only the box (no Pressable) when the row itself is pressable */
  boxOnly?: boolean;
}

/** Square check used in the bag / kit / bulk-load checklists. */
export function Checkbox({
  checked,
  onToggle,
  size = 24,
  style,
  boxOnly,
}: CheckboxProps) {
  const box = (
    <View
      style={[
        styles.box,
        {
          width: size,
          height: size,
          borderWidth: checked ? 0 : 2,
          borderColor: '#D1D5DB',
          backgroundColor: checked ? colors.primary : colors.white,
        },
        style,
      ]}>
      {checked && <CheckIcon size={size * 0.58} />}
    </View>
  );
  if (boxOnly) {
    return box;
  }
  return (
    <Pressable onPress={onToggle} hitSlop={8}>
      {box}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
