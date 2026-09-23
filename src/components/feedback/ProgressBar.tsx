import React from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {colors} from '../../theme';

interface ProgressBarProps {
  /** 0–100 */
  percent: number;
  height?: number;
  trackColor?: string;
  fillColor?: string;
  style?: StyleProp<ViewStyle>;
}

/** Incentive / bulk-batch progress bar. */
export function ProgressBar({
  percent,
  height = 7,
  trackColor = 'rgba(0,0,0,0.2)',
  fillColor = colors.white,
  style,
}: ProgressBarProps) {
  return (
    <View
      style={[
        styles.track,
        {height, borderRadius: 999, backgroundColor: trackColor},
        style,
      ]}>
      <View
        style={{
          width: `${Math.max(0, Math.min(100, percent))}%`,
          height: '100%',
          borderRadius: 999,
          backgroundColor: fillColor,
        }}
      />
    </View>
  );
}

interface SegmentedProgressProps {
  total: number;
  /** number of completed segments */
  filled: number;
}

/** Onboarding 5-segment progress bar. */
export function SegmentedProgress({total, filled}: SegmentedProgressProps) {
  return (
    <View style={styles.segRow}>
      {Array.from({length: total}).map((_, i) => (
        <View
          key={i}
          style={[
            styles.seg,
            {backgroundColor: i < filled ? colors.primary : colors.neutralTile},
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {width: '100%', overflow: 'hidden'},
  segRow: {flexDirection: 'row', gap: 6},
  seg: {flex: 1, height: 5, borderRadius: 3},
});
