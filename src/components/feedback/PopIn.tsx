import React, {useEffect, useRef} from 'react';
import {Animated, Easing, StyleProp, ViewStyle} from 'react-native';

interface PopInProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  duration?: number;
}

/** CSS `@keyframes selPop` — scale 0.6 → 1.08 → 1 with fade-in. */
export function PopIn({children, style, duration = 500}: PopInProps) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.back(1.6)),
      useNativeDriver: true,
    }).start();
  }, [anim, duration]);
  return (
    <Animated.View
      style={[
        {
          opacity: anim,
          transform: [
            {
              scale: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.6, 1],
              }),
            },
          ],
        },
        style,
      ]}>
      {children}
    </Animated.View>
  );
}
