import React from 'react';
import {StyleSheet, View} from 'react-native';
import {colors} from '../../theme';

interface RadioDotProps {
  selected: boolean;
  /** accent colour (green default; red for the bulk-exception sheet) */
  color?: string;
  size?: number;
}

/** The 22px radio circle used in every selection list / bottom sheet. */
export function RadioDot({
  selected,
  color = colors.primary,
  size = 22,
}: RadioDotProps) {
  return (
    <View
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: selected ? color : '#D1D5DB',
          backgroundColor: selected ? color : colors.white,
        },
      ]}>
      {selected && <View style={styles.inner} />}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {alignItems: 'center', justifyContent: 'center'},
  inner: {width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff'},
});
