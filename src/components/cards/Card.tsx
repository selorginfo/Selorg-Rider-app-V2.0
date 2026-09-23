import React from 'react';
import {Pressable, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {colors, radius, shadow} from '../../theme';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  elevation?: 'sm' | 'md' | 'lg' | 'none';
  borderColor?: string;
}

/** White rounded surface with hairline border + soft shadow. */
export function Card({
  children,
  onPress,
  style,
  padded = true,
  elevation = 'sm',
  borderColor = colors.border,
}: CardProps) {
  const base: StyleProp<ViewStyle> = [
    styles.card,
    {borderColor},
    padded && styles.padded,
    elevation !== 'none' && shadow(elevation),
    style,
  ];
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({pressed}) => [base, pressed && {opacity: 0.92}]}>
        {children}
      </Pressable>
    );
  }
  return <View style={base}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderRadius: radius.xl,
  },
  padded: {padding: 15},
});
