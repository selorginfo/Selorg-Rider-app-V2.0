import {useEffect, useRef} from 'react';
import {Animated, Easing} from 'react-native';

/**
 * Reproduces the CSS `@keyframes selUp` (`.selscreen`) — fade in + 10px rise
 * over 0.28s ease. Falls back to fully visible if the animation never starts.
 */
export function useScreenEnter() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
    // Never leave screens stuck at opacity 0 (white blank).
    const failSafe = setTimeout(() => anim.setValue(1), 400);
    return () => clearTimeout(failSafe);
  }, [anim]);
  return {
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 0],
        }),
      },
    ],
  };
}
