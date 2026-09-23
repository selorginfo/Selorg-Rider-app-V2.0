import React from 'react';
import {Platform, Pressable, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {AppText} from '../common/AppText';
import {AppIcon, type AppIconName} from '../common/AppIcon';
import {colors} from '../../theme';

const CIRCLE = 46;

const TAB_ICONS: Record<string, AppIconName> = {
  Home: 'home',
  Orders: 'orders',
  Earnings: 'earnings',
  History: 'history',
  Profile: 'profile',
};

/** Custom tab bar — circular green chip + vector icons on every active tab. */
export function BottomTabBar({state, navigation}: BottomTabBarProps) {
  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const iconName = TAB_ICONS[route.name] || 'home';
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.item}
              hitSlop={6}
              android_ripple={{
                color: colors.primaryTint12,
                borderless: true,
                radius: 28,
              }}
              accessibilityRole="button"
              accessibilityState={{selected: focused}}>
              <View
                style={[
                  styles.iconCircle,
                  focused ? styles.iconCircleOn : styles.iconCircleOff,
                ]}>
                <AppIcon
                  name={iconName}
                  size={20}
                  color={focused ? colors.white : colors.textFaint}
                />
              </View>
              <AppText
                style={[
                  styles.label,
                  {color: focused ? colors.primary : colors.textFaint},
                ]}
                numberOfLines={1}>
                {route.name}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {backgroundColor: colors.white},
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 76,
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 52,
  },
  iconCircle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconCircleOff: {
    backgroundColor: 'transparent',
  },
  iconCircleOn: {
    backgroundColor: colors.primary,
    borderRadius: CIRCLE / 2,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOpacity: 0.3,
        shadowRadius: 6,
        shadowOffset: {width: 0, height: 3},
      },
      android: {
        elevation: 3,
      },
      default: {},
    }),
  },
  label: {fontWeight: '600', fontSize: 11},
});
