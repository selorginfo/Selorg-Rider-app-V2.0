import React from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import Svg, {Circle, Path, Rect} from 'react-native-svg';
import {colors} from '../../theme';

interface MapPlaceholderProps {
  height?: number;
  /** route accent colour (green standard, purple bulk) */
  accent?: string;
  /** 'toStore' green dot → red square; 'toCustomer' green square → red dot */
  direction?: 'toStore' | 'toCustomer';
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * The gradient panel + dashed-route SVG used on Travel / Nav / BulkActive.
 * (A real map view would replace this; the design ships a stylised placeholder.)
 */
export function MapPlaceholder({
  height,
  accent = colors.primary,
  direction = 'toStore',
  children,
  style,
}: MapPlaceholderProps) {
  return (
    <View
      style={[
        styles.wrap,
        height != null ? {height} : styles.fill,
        style,
      ]}>
      {/* Size comes from `absoluteFill` + the viewBox — percentage width/height
          props resolve unreliably in react-native-svg and paint short. */}
      <Svg
        viewBox="0 0 380 300"
        preserveAspectRatio="xMidYMid slice"
        pointerEvents="none"
        style={StyleSheet.absoluteFill}>
        {direction === 'toStore' ? (
          <>
            <Path
              d="M40 260 C120 220 140 140 220 120 S330 70 350 40"
              stroke={accent}
              strokeWidth={5}
              strokeDasharray="2 12"
              strokeLinecap="round"
              fill="none"
            />
            <Circle
              cx={40}
              cy={260}
              r={9}
              fill={accent}
              stroke="#fff"
              strokeWidth={3}
            />
            <Rect
              x={338}
              y={26}
              width={26}
              height={26}
              rx={6}
              fill={colors.dangerBright}
              stroke="#fff"
              strokeWidth={3}
            />
          </>
        ) : (
          <>
            <Path
              d="M50 40 C130 90 150 180 240 200 S330 250 350 260"
              stroke={accent}
              strokeWidth={5}
              strokeDasharray="2 12"
              strokeLinecap="round"
              fill="none"
            />
            <Rect
              x={38}
              y={26}
              width={26}
              height={26}
              rx={6}
              fill={accent}
              stroke="#fff"
              strokeWidth={3}
            />
            <Circle
              cx={350}
              cy={260}
              r={9}
              fill={colors.dangerBright}
              stroke="#fff"
              strokeWidth={3}
            />
          </>
        )}
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    backgroundColor: '#e6ede6',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutralTile,
  },
  fill: {flex: 1},
});
