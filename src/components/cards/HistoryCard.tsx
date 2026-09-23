import React from 'react';
import {StyleSheet, View} from 'react-native';
import {AppText} from '../common/AppText';
import {Card} from './Card';
import {StatusBadge} from '../feedback/StatusBadge';
import {colors} from '../../theme';
import type {HistoryEntry} from '../../types';

/** History → standard delivered card. */
export function HistoryCard({entry}: {entry: HistoryEntry}) {
  return (
    <Card>
      <View style={styles.top}>
        <StatusBadge label="✓ Delivered" />
        <AppText style={styles.time}>{entry.time}</AppText>
      </View>
      <AppText style={styles.addr}>{entry.addr}</AppText>
      <View style={styles.bottom}>
        <AppText style={styles.meta}>
          {entry.num} · {entry.items} items · {entry.dist}
        </AppText>
        <AppText style={styles.payout}>₹{entry.payout}</AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  time: {fontWeight: '500', fontSize: 11, color: colors.textFaint},
  addr: {fontWeight: '700', fontSize: 14, color: colors.ink, marginTop: 11},
  bottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 6,
  },
  meta: {fontWeight: '400', fontSize: 12, color: colors.textMuted, flex: 1},
  payout: {fontWeight: '800', fontSize: 15, color: colors.ink},
});
