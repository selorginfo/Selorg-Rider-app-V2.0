import React from 'react';
import {Pressable, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {AppText} from '../common/AppText';
import {colors} from '../../theme';
import {MIN_TOUCH} from '../../theme/layout';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  /** right-aligned accessory */
  right?: React.ReactNode;
  /** hairline divider under the header */
  bordered?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** "‹ + title (+ subtitle)" bar used on most secondary screens. */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
  bordered,
  style,
}: ScreenHeaderProps) {
  return (
    <View style={[styles.wrap, bordered && styles.bordered, style]}>
      {onBack && (
        <Pressable
          onPress={onBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.backBtn}>
          <AppText style={styles.backGlyph}>‹</AppText>
        </Pressable>
      )}
      <View style={styles.textCol}>
        <AppText style={styles.title} numberOfLines={2}>
          {title}
        </AppText>
        {!!subtitle && (
          <AppText style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </AppText>
        )}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 4,
    minHeight: MIN_TOUCH,
  },
  bordered: {
    paddingHorizontal: 0,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backBtn: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backGlyph: {fontWeight: '700', fontSize: 22, color: colors.textSecondary},
  textCol: {flex: 1, minWidth: 0},
  title: {fontWeight: '800', fontSize: 20, color: colors.inkStrong},
  subtitle: {
    fontWeight: '400',
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});
