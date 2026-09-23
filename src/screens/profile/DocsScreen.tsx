import React, {useCallback, useMemo, useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Screen} from '../../components/common/Screen';
import {AppText} from '../../components/common/AppText';
import {EmojiIcon} from '../../components/common/EmojiIcon';
import {ChevronRightIcon} from '../../components/common/Icons';
import {ScreenHeader} from '../../components/headers/ScreenHeader';
import {Banner} from '../../components/feedback/Banner';
import {useAppNavigation} from '../../hooks/useAppNavigation';
import {profileApi} from '../../services/api';
import {
  type KycDocumentSide,
  type KycDocumentType,
} from '../../services/api/profileApi';
import {DOC_LIST, TWO_SIDED_DOC_CODES} from '../../mock';
import type {DocumentDto} from '../../types/api';
import {colors, radius} from '../../theme';

type DocUiStatus = 'missing' | 'partial' | 'pending' | 'approved' | 'rejected';
type SlotSide = KycDocumentSide | 'file';

const TWO_SIDED = new Set<string>(TWO_SIDED_DOC_CODES);

function isTwoSided(code: string): boolean {
  return TWO_SIDED.has(code);
}

function slotKey(code: string, side: SlotSide): string {
  return `${code}:${side}`;
}

function findDocRow(
  docs: DocumentDto[],
  code: string,
  side: SlotSide,
): DocumentDto | undefined {
  const rows = docs.filter(d => d.type.toLowerCase() === code);
  if (side === 'file') {
    return rows[0];
  }
  return (
    rows.find(d => d.side === side) ||
    (side === 'front' ? rows.find(d => !d.side) : undefined)
  );
}

function mapStatus(raw: string | undefined, partial: boolean): DocUiStatus {
  const s = (raw || 'missing').toLowerCase();
  if (s === 'approved' || s === 'verified') {
    return 'approved';
  }
  if (s === 'pending' || s === 'under_review') {
    return 'pending';
  }
  if (s === 'rejected') {
    return 'rejected';
  }
  if (partial) {
    return 'partial';
  }
  return 'missing';
}

function statusLabel(status: DocUiStatus, hasAny: boolean): {
  text: string;
  tone: 'success' | 'warn' | 'neutral';
} {
  if (status === 'approved') {
    return {text: 'Verified', tone: 'success'};
  }
  if (status === 'rejected') {
    return {text: 'Rejected', tone: 'warn'};
  }
  if (status === 'partial') {
    return {text: 'Partial', tone: 'warn'};
  }
  if (status === 'pending' || hasAny) {
    return {text: 'Pending', tone: 'neutral'};
  }
  return {text: 'Upload', tone: 'neutral'};
}

function statusSub(status: DocUiStatus, hasAny: boolean, twoSided: boolean): string {
  if (status === 'approved') {
    return 'Approved by Selorg';
  }
  if (status === 'rejected') {
    return 'Rejected — tap to re-upload';
  }
  if (status === 'partial') {
    return 'Front or back still needed';
  }
  if (status === 'pending' || hasAny) {
    return 'Uploaded · under review';
  }
  return twoSided ? 'Front & back photo' : 'Front photo only';
}

export function DocsScreen() {
  const nav = useAppNavigation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [slotUris, setSlotUris] = useState<Record<string, string>>({});
  const [docStatus, setDocStatus] = useState<Record<string, DocUiStatus>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const result = await profileApi.listDocuments();
    const uploaded =
      result.ok && Array.isArray(result.data) ? result.data : [];

    const nextUris: Record<string, string> = {};
    const nextStatus: Record<string, DocUiStatus> = {};

    for (const d of DOC_LIST) {
      if (isTwoSided(d.code)) {
        for (const side of ['front', 'back'] as const) {
          const row = findDocRow(uploaded, d.code, side);
          if (row?.url) {
            nextUris[slotKey(d.code, side)] = row.url;
          }
        }
        const hasFront = Boolean(nextUris[slotKey(d.code, 'front')]);
        const hasBack = Boolean(nextUris[slotKey(d.code, 'back')]);
        const partial = hasFront !== hasBack;
        const frontRow = findDocRow(uploaded, d.code, 'front');
        const backRow = findDocRow(uploaded, d.code, 'back');
        const raw =
          frontRow?.status === 'rejected' || backRow?.status === 'rejected'
            ? 'rejected'
            : frontRow?.status || backRow?.status;
        nextStatus[d.code] = mapStatus(raw, partial);
      } else {
        const row = findDocRow(uploaded, d.code, 'file');
        if (row?.url) {
          nextUris[slotKey(d.code, 'file')] = row.url;
        }
        nextStatus[d.code] = mapStatus(row?.status, false);
      }
    }

    setSlotUris(nextUris);
    setDocStatus(nextStatus);
    if (!result.ok) {
      setError(result.error || 'Could not load documents');
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const allVerified = useMemo(
    () =>
      DOC_LIST.every(d => {
        const s = docStatus[d.code];
        return s === 'approved';
      }),
    [docStatus],
  );

  return (
    <Screen background={colors.white} contentContainerStyle={styles.body}>
      <ScreenHeader title="Documents & KYC" onBack={() => nav.goBack()} />

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          color={colors.primary}
          size="large"
        />
      ) : (
        <>
          {!!error && (
            <AppText style={styles.error}>{error}</AppText>
          )}
          {allVerified && (
            <Banner
              tone="success"
              icon="✓"
              text="KYC Verified — All documents approved"
              style={styles.banner}
            />
          )}
          <AppText style={styles.hint}>
            Tap a document to upload. Aadhaar & PAN need front and back.
          </AppText>
          <View style={styles.list}>
            {DOC_LIST.map(d => {
              const status = docStatus[d.code] || 'missing';
              const twoSided = isTwoSided(d.code);
              const hasAny = twoSided
                ? Boolean(
                    slotUris[slotKey(d.code, 'front')] ||
                      slotUris[slotKey(d.code, 'back')],
                  )
                : Boolean(slotUris[slotKey(d.code, 'file')]);
              const st = statusLabel(status, hasAny);

              return (
                <Pressable
                  key={d.code}
                  style={styles.row}
                  onPress={() =>
                    nav.navigate('UploadDocument', {
                      type: d.code as KycDocumentType,
                    })
                  }>
                  <EmojiIcon
                    glyph={d.icon}
                    size={17}
                    tile={{size: 38, radius: 11, bg: colors.primaryTint08}}
                  />
                  <View style={styles.text}>
                    <AppText style={styles.label}>{d.label}</AppText>
                    <AppText style={styles.sub}>
                      {statusSub(status, hasAny, twoSided)}
                    </AppText>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      st.tone === 'success' && styles.badgeOk,
                      st.tone === 'warn' && styles.badgeBad,
                    ]}>
                    <AppText
                      style={[
                        styles.badgeText,
                        st.tone === 'success' && {color: colors.primary},
                        st.tone === 'warn' && {color: colors.danger},
                      ]}>
                      {st.text}
                    </AppText>
                  </View>
                  <ChevronRightIcon size={16} color={colors.textFaint} />
                </Pressable>
              );
            })}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24},
  loader: {marginTop: 40},
  banner: {marginTop: 16},
  error: {
    marginTop: 12,
    fontWeight: '600',
    fontSize: 12,
    color: colors.danger,
  },
  hint: {
    marginTop: 16,
    fontWeight: '400',
    fontSize: 12.5,
    color: colors.textMuted,
    lineHeight: 18,
  },
  list: {gap: 10, marginTop: 12},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
  },
  text: {flex: 1},
  label: {fontWeight: '700', fontSize: 13, color: colors.ink},
  sub: {fontWeight: '400', fontSize: 11, color: colors.textMuted, marginTop: 2},
  badge: {
    backgroundColor: colors.fieldBg,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  badgeOk: {backgroundColor: colors.primaryTint},
  badgeBad: {backgroundColor: colors.dangerBg},
  badgeText: {fontWeight: '700', fontSize: 11, color: colors.textMuted},
});
