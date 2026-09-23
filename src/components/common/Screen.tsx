import React from 'react';
import {
  Animated,
  ScrollView,
  ScrollViewProps,
  StatusBar,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import {SafeAreaView, Edge} from 'react-native-safe-area-context';
import {useScreenEnter} from '../../hooks/useScreenEnter';
import {colors} from '../../theme';

interface ScreenProps {
  children: React.ReactNode;
  /** wrap content in a ScrollView (default true) */
  scroll?: boolean;
  /** background colour of the screen (default pure white) */
  background?: string;
  /** status-bar content colour */
  statusBarStyle?: 'light-content' | 'dark-content';
  /** disable the fade+rise enter animation */
  noAnim?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  edges?: Edge[];
  scrollProps?: ScrollViewProps;
}

/**
 * Common screen wrapper: SafeAreaView + status-bar tint + optional scroll +
 * the `.selscreen` enter animation.
 */
export function Screen({
  children,
  scroll = true,
  background = colors.white,
  statusBarStyle = 'dark-content',
  noAnim = false,
  contentContainerStyle,
  style,
  edges = ['top'],
  scrollProps,
}: ScreenProps) {
  const enter = useScreenEnter();
  const animStyle = noAnim ? undefined : enter;

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={contentContainerStyle}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      {...scrollProps}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, contentContainerStyle]}>{children}</View>
  );

  return (
    <SafeAreaView
      style={[styles.flex, {backgroundColor: background}, style]}
      edges={edges}>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={background}
        translucent={false}
      />
      <Animated.View style={[styles.flex, animStyle]}>{body}</Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
});
