import React from 'react';
import {Pressable, ScrollView, StyleSheet} from 'react-native';
import {AppText} from '../common/AppText';
import {colors, radius} from '../../theme';

export interface FilterTab {
  id: string;
  label: string;
}

interface FilterTabsProps {
  tabs: FilterTab[];
  value: string;
  onChange: (id: string) => void;
  /** active-pill colour: 'dark' (History) or 'green' (bulk all-stops) */
  activeTone?: 'dark' | 'green';
}

/** Horizontal scrolling pill filter strip (History filters, bulk all-stops filters). */
export function FilterTabs({
  tabs,
  value,
  onChange,
  activeTone = 'dark',
}: FilterTabsProps) {
  const activeBg = activeTone === 'green' ? colors.primary : colors.ink;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      {tabs.map(t => {
        const on = t.id === value;
        return (
          <Pressable
            key={t.id}
            onPress={() => onChange(t.id)}
            style={[
              styles.pill,
              activeTone === 'green' ? styles.pillSm : styles.pillMd,
              {backgroundColor: on ? activeBg : colors.fieldBg2},
            ]}>
            <AppText
              style={[styles.label, {color: on ? colors.white : colors.slate}]}>
              {t.label}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {gap: 8, paddingRight: 8},
  pill: {borderRadius: radius.pill},
  pillMd: {paddingVertical: 8, paddingHorizontal: 16},
  pillSm: {paddingVertical: 7, paddingHorizontal: 13},
  label: {fontWeight: '700', fontSize: 12},
});
