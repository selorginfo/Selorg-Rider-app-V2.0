import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {AppText} from '../common/AppText';
import {colors, radius} from '../../theme';

export interface SegOption {
  id: string;
  label: string;
}

interface SegmentedControlProps {
  options: SegOption[];
  value: string;
  onChange: (id: string) => void;
}

/** Login-method switcher — light track, soft green active pill (no dark fill). */
export function SegmentedControl({
  options,
  value,
  onChange,
}: SegmentedControlProps) {
  return (
    <View style={styles.track}>
      {options.map(o => {
        const on = o.id === value;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            style={[styles.pill, on && styles.pillOn]}>
            <AppText
              numberOfLines={1}
              style={[
                styles.label,
                {
                  color: on ? colors.primary : colors.textMuted,
                  fontWeight: on ? '700' : '600',
                },
              ]}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: colors.fieldBg2,
    borderRadius: radius.lg,
    padding: 4,
  },
  pill: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  pillOn: {
    backgroundColor: colors.white,
  },
  label: {fontSize: 13, minWidth: 0},
});
