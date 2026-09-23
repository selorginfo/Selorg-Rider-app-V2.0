import React from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors, radius} from '../../theme';
import {useLayout} from '../../theme/layout';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** allow the body to scroll (cancel sheet has many reasons) */
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

/** Shared sheet shell: scrim + slide-up panel + grabber. Mirrors the HTML overlay. */
export function BottomSheet({
  visible,
  onClose,
  children,
  scroll,
  contentStyle,
}: BottomSheetProps) {
  const anim = React.useRef(new Animated.Value(0)).current;
  const {height, isTablet, contentMaxWidth} = useLayout();
  const maxSheet = Math.round(height * 0.9);

  React.useEffect(() => {
    if (visible) {
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, anim]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheet,
            {
              opacity: anim,
              transform: [{translateY}],
              maxHeight: maxSheet,
              maxWidth: isTablet ? contentMaxWidth : undefined,
              alignSelf: isTablet ? 'center' : 'stretch',
              width: isTablet ? '100%' : undefined,
            },
          ]}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.grabber} />
            {scroll ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={contentStyle}
                style={{maxHeight: maxSheet - 48}}
                keyboardShouldPersistTaps="handled">
                {children}
              </ScrollView>
            ) : (
              <View style={contentStyle}>{children}</View>
            )}
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end'},
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xxl + 2,
    borderTopRightRadius: radius.xxl + 2,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 26,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutralTile,
    alignSelf: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
});
