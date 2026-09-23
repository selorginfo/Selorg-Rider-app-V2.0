import React from 'react';
import {StyleSheet} from 'react-native';
import {AppText} from '../common/AppText';
import {colors} from '../../theme';

export function SheetHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <>
      <AppText style={styles.title}>{title}</AppText>
      {!!subtitle && <AppText style={styles.sub}>{subtitle}</AppText>}
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    fontWeight: '800',
    fontSize: 19,
    color: colors.inkStrong,
    letterSpacing: -0.3,
  },
  sub: {fontWeight: '400', fontSize: 13, color: colors.textMuted, marginTop: 3},
});
