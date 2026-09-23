import React from 'react';
import {Pressable, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AppText} from '../common/AppText';
import {colors} from '../../theme';
import {MIN_TOUCH} from '../../theme/layout';

type MapChromeBackProps = {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Absolute map/header back chip that respects top (and left) safe areas.
 * Use on Travel / Nav / Accept-style overlays.
 */
export function MapChromeBack({onPress, style}: MapChromeBackProps) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Back"
      style={[
        styles.back,
        {
          top: Math.max(insets.top, 8) + 6,
          left: Math.max(insets.left, 8) + 6,
        },
        style,
      ]}>
      <AppText style={styles.glyph}>‹</AppText>
    </Pressable>
  );
}

type MapChromePillProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Top-right status pill inset-aware for map screens. */
export function MapChromePill({children, style}: MapChromePillProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.pill,
        {
          top: Math.max(insets.top, 8) + 6,
          right: Math.max(insets.right, 8) + 6,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  back: {
    position: 'absolute',
    zIndex: 2,
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 4,
  },
  glyph: {fontWeight: '700', fontSize: 22, color: colors.inkStrong, marginTop: -2},
  pill: {
    position: 'absolute',
    zIndex: 2,
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(17,24,39,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
