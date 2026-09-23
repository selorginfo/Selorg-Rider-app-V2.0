import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {AppText} from '../common/AppText';
import {EmojiIcon} from '../common/EmojiIcon';
import {colors, radius} from '../../theme';
import type {ShiftSlot} from '../../types';

interface SlotCardProps {
  slot: ShiftSlot;
  booked: boolean;
  onToggle: () => void;
  busy?: boolean;
}

/** Shifts → bookable slot card. */
export function SlotCard({slot, booked, onToggle, busy}: SlotCardProps) {
  return (
    <View
      style={[
        styles.card,
        {
          borderColor: booked ? colors.primary : colors.neutralTile,
          backgroundColor: booked ? colors.primaryTint06 : colors.white,
        },
      ]}>
      <View style={styles.top}>
        <View style={styles.textCol}>
          <AppText style={styles.time}>{slot.time}</AppText>
          <View style={styles.labelPill}>
            <AppText style={styles.labelPillText}>{slot.label}</AppText>
          </View>
        </View>
        <Pressable
          onPress={onToggle}
          disabled={busy}
          style={[
            styles.btn,
            {
              backgroundColor: booked ? colors.primaryTint12 : colors.primary,
              opacity: busy ? 0.6 : 1,
            },
          ]}>
          <AppText
            style={[
              styles.btnText,
              {color: booked ? colors.primary : colors.white},
            ]}>
            {booked ? 'Booked' : 'Book slot'}
          </AppText>
        </Pressable>
      </View>
      <View style={styles.payRow}>
        <EmojiIcon glyph="💰" size={12} />
        <AppText style={styles.pay}>{slot.pay}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {padding: 16, borderRadius: radius.lg, borderWidth: 1.5},
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  textCol: {flex: 1, minWidth: 0},
  time: {fontWeight: '700', fontSize: 15, color: colors.ink},
  labelPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryTint,
    borderRadius: 5,
    paddingVertical: 2,
    paddingHorizontal: 7,
    marginTop: 5,
  },
  labelPillText: {color: colors.primary, fontWeight: '700', fontSize: 10},
  btn: {paddingVertical: 8, paddingHorizontal: 16, borderRadius: radius.pill},
  btnText: {fontWeight: '700', fontSize: 12},
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  pay: {
    fontWeight: '400',
    fontSize: 12,
    color: colors.textMuted,
    flexShrink: 1,
  },
});
