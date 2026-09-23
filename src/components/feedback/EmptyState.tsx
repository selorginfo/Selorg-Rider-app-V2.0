import React from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {AppText} from '../common/AppText';
import {colors, radius, shadow} from '../../theme';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  /** render as a bordered card (default) or plain text block */
  card?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** "No new orders", offline card, "No stops match" etc. */
export function EmptyState({
  title,
  subtitle,
  card = true,
  style,
}: EmptyStateProps) {
  return (
    <View
      style={[card ? styles.card : styles.plain, card && shadow('sm'), style]}>
      <AppText style={styles.title}>{title}</AppText>
      {!!subtitle && <AppText style={styles.sub}>{subtitle}</AppText>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  plain: {paddingVertical: 30, alignItems: 'center'},
  title: {
    fontWeight: '700',
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  sub: {
    fontWeight: '400',
    fontSize: 12,
    color: colors.textFaint,
    marginTop: 6,
    textAlign: 'center',
  },
});
