import React from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {AppText} from '../common/AppText';
import {colors} from '../../theme';
import type {BulkStop} from '../../types';

interface StopRailProps {
  stops: BulkStop[];
  currentIdx: number;
}

/** BulkActive header — horizontal numbered chip rail of every stop. */
export function StopRail({stops, currentIdx}: StopRailProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      {stops.map(st => {
        const isCurrent = st.idx === currentIdx;
        const bg =
          st.status === 'delivered'
            ? colors.primary
            : st.status === 'failed'
            ? colors.danger
            : isCurrent
            ? colors.ink
            : colors.fieldBg2;
        const fg =
          st.status === 'delivered' || st.status === 'failed' || isCurrent
            ? colors.white
            : colors.textFaint;
        const icon =
          st.status === 'delivered'
            ? '✓'
            : st.status === 'failed'
            ? '✕'
            : String(st.idx + 1);
        return (
          <View key={st.idx} style={[styles.chip, {backgroundColor: bg}]}>
            <AppText style={[styles.chipText, {color: fg}]}>{icon}</AppText>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {gap: 5, paddingBottom: 2},
  chip: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {fontWeight: '700', fontSize: 11},
});
