import React, {useCallback, useId, useState} from 'react';
import {
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  View,
  ViewProps,
  ViewStyle,
} from 'react-native';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';

interface GradientViewProps extends ViewProps {
  /** gradient colour stops, e.g. ['#237227', '#1B5A1F'] */
  colors: string[];
  /** angle in degrees (CSS-like, 0 = to top, 90 = to right, 135 = to bottom-right) */
  angle?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * CSS `linear-gradient(...)` replacement built on `react-native-svg` — no extra
 * native dependency.
 *
 * The SVG layer is sized from a real `onLayout` measurement rather than
 * `"100%"`: react-native-svg resolves percentage viewports unreliably, which
 * painted the gradient smaller than its container and left white gaps.
 * The wrapper also carries `colors[0]` as a solid background so the first
 * frame (before measurement) is already the brand colour, never white.
 */
export function GradientView({
  colors,
  angle = 135,
  style,
  children,
  onLayout,
  ...rest
}: GradientViewProps) {
  const [size, setSize] = useState({width: 0, height: 0});

  // SVG `id`s are document-global — give every instance its own so two
  // gradients mounted at the same time can't resolve to each other's defs.
  const gradientId = `sel-grad-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const {width, height} = e.nativeEvent.layout;
      setSize(prev =>
        prev.width === width && prev.height === height
          ? prev
          : {width, height},
      );
      onLayout?.(e);
    },
    [onLayout],
  );

  // CSS gradient angle: 0deg points up. Convert to an x/y unit vector for SVG.
  const rad = (angle * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const x1 = 0.5 - dx / 2;
  const y1 = 0.5 - dy / 2;
  const x2 = 0.5 + dx / 2;
  const y2 = 0.5 + dy / 2;

  const measured = size.width > 0 && size.height > 0;

  return (
    <View
      style={[styles.wrap, {backgroundColor: colors[0]}, style]}
      onLayout={handleLayout}
      {...rest}>
      {measured && (
        <Svg
          style={StyleSheet.absoluteFill}
          width={size.width}
          height={size.height}
          pointerEvents="none">
          <Defs>
            <LinearGradient id={gradientId} x1={x1} y1={y1} x2={x2} y2={y2}>
              {colors.map((c, i) => (
                <Stop
                  key={`${c}-${i}`}
                  offset={`${
                    colors.length === 1 ? 0 : (i / (colors.length - 1)) * 100
                  }%`}
                  stopColor={c}
                />
              ))}
            </LinearGradient>
          </Defs>
          <Rect
            x={0}
            y={0}
            width={size.width}
            height={size.height}
            fill={`url(#${gradientId})`}
          />
        </Svg>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {overflow: 'hidden'},
});
