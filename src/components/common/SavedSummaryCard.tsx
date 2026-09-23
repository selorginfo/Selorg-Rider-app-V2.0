import React from 'react';
import {StyleSheet, View} from 'react-native';
import {AppText} from './AppText';
import {CheckIcon} from './Icons';
import {colors, radius} from '../../theme';

interface SavedField {
  label: string;
  value: string;
}

interface SavedSummaryCardProps {
  title?: string;
  fields: SavedField[];
  /** Show green check header */
  confirmed?: boolean;
}

/** Read-only confirmation card after a successful save. */
export function SavedSummaryCard({
  title = 'Saved',
  fields,
  confirmed = true,
}: SavedSummaryCardProps) {
  return (
    <View style={styles.card}>
      {confirmed ? (
        <View style={styles.head}>
          <View style={styles.check}>
            <CheckIcon size={16} strokeWidth={3} />
          </View>
          <AppText style={styles.title}>{title}</AppText>
        </View>
      ) : (
        <AppText style={styles.title}>{title}</AppText>
      )}
      {fields.map((f, i) => (
        <View
          key={f.label}
          style={[styles.row, i < fields.length - 1 && styles.rowBorder]}>
          <AppText style={styles.label}>{f.label}</AppText>
          <AppText style={styles.value} numberOfLines={3}>
            {f.value || '—'}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primaryTint06,
    borderWidth: 1,
    borderColor: 'rgba(35,114,39,.22)',
    borderRadius: radius.xl,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    paddingBottom: 8,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '800',
    fontSize: 15,
    color: colors.ink,
    paddingTop: 12,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
  },
  rowBorder: {borderBottomWidth: 1, borderBottomColor: 'rgba(35,114,39,.12)'},
  label: {fontWeight: '400', fontSize: 13, color: colors.textMuted},
  value: {
    fontWeight: '700',
    fontSize: 13,
    color: colors.ink,
    flex: 1,
    textAlign: 'right',
  },
});
