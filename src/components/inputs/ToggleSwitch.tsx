import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {colors} from '../../theme';

interface ToggleSwitchProps {
  value: boolean;
  onToggle: () => void;
  /** 'lg' = Home online toggle (50×30), 'sm' = Settings rows (44×26) */
  size?: 'lg' | 'sm';
}

/** The custom pill switch used for online status and settings toggles. */
export function ToggleSwitch({
  value,
  onToggle,
  size = 'sm',
}: ToggleSwitchProps) {
  const dims =
    size === 'lg'
      ? {w: 50, h: 30, thumb: 24, pad: 3}
      : {w: 44, h: 26, thumb: 20, pad: 3};
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{checked: value}}
      onPress={onToggle}
      style={[
        styles.track,
        {
          width: dims.w,
          height: dims.h,
          borderRadius: dims.h / 2,
          padding: dims.pad,
          backgroundColor: value ? colors.primary : colors.neutralTile,
          alignItems: value ? 'flex-end' : 'flex-start',
        },
      ]}>
      <View
        style={[
          styles.thumb,
          {width: dims.thumb, height: dims.thumb, borderRadius: dims.thumb / 2},
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {justifyContent: 'center'},
  thumb: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 2,
    shadowOffset: {width: 0, height: 1},
    elevation: 2,
  },
});
