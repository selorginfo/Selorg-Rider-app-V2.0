import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Screen} from '../../components/common/Screen';
import {AppText} from '../../components/common/AppText';
import {ScreenHeader} from '../../components/headers/ScreenHeader';
import {useAppNavigation} from '../../hooks/useAppNavigation';
import type {LegalSection} from '../../types';
import {colors} from '../../theme';

interface LegalScreenProps {
  title: string;
  dateLine: string;
  sections: LegalSection[];
}

/** Shared layout for Privacy Policy + Terms of Service. */
export function LegalScreen({title, dateLine, sections}: LegalScreenProps) {
  const nav = useAppNavigation();
  return (
    <Screen background={colors.white} contentContainerStyle={styles.body}>
      <ScreenHeader title={title} onBack={() => nav.goBack()} />
      <AppText style={styles.date}>{dateLine}</AppText>
      <View style={styles.list}>
        {sections.map(s => (
          <View key={s.h}>
            <AppText style={styles.h}>{s.h}</AppText>
            <AppText style={styles.b}>{s.b}</AppText>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {paddingHorizontal: 20, paddingTop: 8, paddingBottom: 30},
  date: {
    fontWeight: '400',
    fontSize: 12,
    color: colors.textFaint,
    marginTop: 8,
  },
  list: {gap: 18, marginTop: 18},
  h: {fontWeight: '700', fontSize: 14, color: colors.ink, marginBottom: 6},
  b: {fontWeight: '400', fontSize: 13, color: colors.slate, lineHeight: 21},
});
