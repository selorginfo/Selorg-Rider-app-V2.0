import React, {useEffect, useRef} from 'react';
import {Animated, Easing} from 'react-native';
import {colors} from '../../theme';

interface PulseDotProps {
  color?: string;
  size?: number;
}

/** CSS `@keyframes selPulse` — opacity 1 ↔ 0.45, 1.4–1.6s loop. */
export function PulseDot({color = colors.primary, size = 7}: PulseDotProps) {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 0.45,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: anim,
      }}
    />
  );
}
