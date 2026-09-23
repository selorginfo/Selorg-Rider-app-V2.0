import React, {useCallback, useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {ObStepLayout} from './ObStepLayout';
import {AppText} from '../../components/common/AppText';
import {EmojiIcon} from '../../components/common/EmojiIcon';
import {ChevronRightIcon} from '../../components/common/Icons';
import {PrimaryButton} from '../../components/buttons/PrimaryButton';
import {useAppNavigation} from '../../hooks/useAppNavigation';
import {useRider} from '../../store/RiderContext';
import {DOC_LIST, TWO_SIDED_DOC_CODES} from '../../mock';
import {
  profileApi,
  type KycDocumentSide,
  type KycDocumentType,
} from '../../services/api/profileApi';
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

function mapServerStatus(
  raw: string | undefined,
  partial: boolean,
): DocUiStatus {
  // Partial (one of two required sides) must win over a generic pending/missing
  // flag from onboarding state — otherwise Continue unlocks too early or the
  // wrong subtitle is shown.
  if (partial) {
    return 'partial';
  }
  const s = (raw || 'missing').toLowerCase();
  if (s === 'approved' || s === 'verified') {
    return 'approved';
  }
  if (s === 'pending') {
    return 'pending';
  }
  if (s === 'rejected') {
    return 'rejected';
  }
  return 'missing';
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
  const normalized = rows.map(d => ({
    row: d,
    side: (d.side || 'front') as KycDocumentSide,
  }));
  return normalized.find(d => d.side === side)?.row;
}

function isDocSlotsComplete(
  code: string,
  slotUris: Record<string, string>,
  status: DocUiStatus,
): boolean {
  if (status === 'rejected') {
    return false;
  }
  if (isTwoSided(code)) {
    return (
      Boolean(slotUris[slotKey(code, 'front')]) &&
      Boolean(slotUris[slotKey(code, 'back')])
    );
  }
  return Boolean(slotUris[slotKey(code, 'file')]);
}

function rowSub(
  status: DocUiStatus,
  code: string,
  slotUris: Record<string, string>,
  fallback: string,
): string {
  if (status === 'partial') {
    return !slotUris[slotKey(code, 'back')]
      ? 'Front uploaded · back still needed'
      : 'Back uploaded · front still needed';
  }
  if (status === 'rejected') {
    return 'Rejected — tap to re-upload';
  }
  if (status === 'approved') {
    return 'Verified';
  }
  if (status === 'pending') {
    return 'Uploaded · under review';
  }
  return fallback;
}

function ctaLabel(status: DocUiStatus): string {
  if (status === 'approved') {
    return 'View';
  }
  if (status === 'rejected') {
    return 'Re-upload';
  }
  if (status === 'partial' || status === 'pending') {
    return 'Update';
  }
  return 'Upload';
}

export function ObKycScreen() {
  const nav = useAppNavigation();
  const {state, actions} = useRider();
  const [syncing, setSyncing] = useState(true);
  const [docStatus, setDocStatus] = useState<Record<string, DocUiStatus>>({});
  const [slotUris, setSlotUris] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const count = DOC_LIST.filter(d =>
    isDocSlotsComplete(d.code, slotUris, docStatus[d.code] || 'missing'),
  ).length;
  const allDone = count === DOC_LIST.length && !syncing;

  const syncFromServer = useCallback(async () => {
    setError('');
    const [stateResult, docsResult] = await Promise.all([
      profileApi.getOnboardingState(),
      profileApi.listDocuments(),
    ]);

    const uploaded: DocumentDto[] =
      docsResult.ok && Array.isArray(docsResult.data) ? docsResult.data : [];

    const nextUris: Record<string, string> = {};
    for (const d of DOC_LIST) {
      if (isTwoSided(d.code)) {
        for (const side of ['front', 'back'] as const) {
          const row = findDocRow(uploaded, d.code, side);
          if (row?.url) {
            nextUris[slotKey(d.code, side)] = row.url;
          }
        }
      } else {
        const row = findDocRow(uploaded, d.code, 'file');
        if (row?.url) {
          nextUris[slotKey(d.code, 'file')] = row.url;
        }
      }
    }

    const nextStatus: Record<string, DocUiStatus> = {};
    const nextDone: Record<string, boolean> = {};

    for (const d of DOC_LIST) {
      const row = stateResult.ok
        ? stateResult.data?.documents?.find(x => x.type.toLowerCase() === d.code)
        : undefined;
      const hasFront = Boolean(nextUris[slotKey(d.code, 'front')]);
      const hasBack = Boolean(nextUris[slotKey(d.code, 'back')]);
      const hasFile = Boolean(nextUris[slotKey(d.code, 'file')]);
      const partial = isTwoSided(d.code) && hasFront !== hasBack;
      const status = mapServerStatus(row?.status, partial);
      nextStatus[d.code] = status;
      nextDone[d.code] = isTwoSided(d.code)
        ? hasFront && hasBack && status !== 'rejected'
        : hasFile && status !== 'rejected';
    }

    const docsStep = stateResult.data?.steps?.find(s => s.key === 'documents');
    if (docsStep?.completed) {
      for (const d of DOC_LIST) {
        nextDone[d.code] = true;
        if (
          nextStatus[d.code] === 'missing' ||
          nextStatus[d.code] === 'partial'
        ) {
          nextStatus[d.code] = 'pending';
        }
      }
    }

    setSlotUris(nextUris);
    setDocStatus(nextStatus);
    actions.setObDocs(nextDone);
    setSyncing(false);

    if (!stateResult.ok && stateResult.error) {
      setError(stateResult.error);
    } else if (!docsResult.ok && docsResult.error) {
      setError(docsResult.error);
    }
  }, [actions]);

  useFocusEffect(
    useCallback(() => {
      setSyncing(true);
      void syncFromServer();
    }, [syncFromServer]),
  );

  return (
    <ObStepLayout
      step={4}
      totalSteps={5}
      title="Upload documents"
      subtitle="Verify your identity & vehicle"
      onBack={() => nav.goBack()}
      headerRight={
        <AppText style={styles.count}>
          {count}/{DOC_LIST.length}
        </AppText>
      }
      footer={
        <PrimaryButton
          label={allDone ? 'Continue' : 'Upload all documents to continue'}
          onPress={() => nav.navigate('ObTraining')}
          disabled={!allDone}
        />
      }>
      {syncing ? (
        <ActivityIndicator
          color={colors.primary}
          style={styles.loader}
          size="large"
        />
      ) : (
        <View style={styles.list}>
          {!!error && <AppText style={styles.error}>{error}</AppText>}
          <AppText style={styles.hint}>
            Tap a document to upload. Aadhaar & PAN need front and back photos.
          </AppText>
          {DOC_LIST.map(d => {
            const status =
              docStatus[d.code] ||
              (state.obDocs[d.code] ? 'pending' : 'missing');
            const done = isDocSlotsComplete(d.code, slotUris, status);
            const partial = status === 'partial';

            return (
              <Pressable
                key={d.code}
                onPress={() =>
                  nav.navigate('UploadDocument', {
                    type: d.code as KycDocumentType,
                  })
                }
                style={[
                  styles.card,
                  {
                    borderColor:
                      done || partial
                        ? 'rgba(35,114,39,.3)'
                        : status === 'rejected'
                          ? 'rgba(220,38,38,.35)'
                          : colors.neutralTile,
                    backgroundColor:
                      done || partial
                        ? colors.primaryTint06
                        : status === 'rejected'
                          ? 'rgba(254,226,226,.45)'
                          : colors.white,
                  },
                ]}>
                <EmojiIcon
                  glyph={d.icon}
                  size={17}
                  tile={{size: 38, radius: 11, bg: colors.primaryTint08}}
                />
                <View style={styles.text}>
                  <AppText style={styles.label}>{d.label}</AppText>
                  <AppText
                    style={[
                      styles.sub,
                      partial ? styles.subWarn : null,
                    ]}>
                    {rowSub(status, d.code, slotUris, d.sub)}
                  </AppText>
                </View>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor:
                        done || partial
                          ? colors.primaryTint12
                          : status === 'rejected'
                            ? colors.dangerBg
                            : colors.primary,
                    },
                  ]}>
                  <AppText
                    style={[
                      styles.badgeText,
                      {
                        color:
                          done || partial
                            ? colors.primary
                            : status === 'rejected'
                              ? colors.danger
                              : colors.white,
                      },
                    ]}>
                    {ctaLabel(status)}
                  </AppText>
                </View>
                <ChevronRightIcon size={16} color={colors.textFaint} />
              </Pressable>
            );
          })}
        </View>
      )}
    </ObStepLayout>
  );
}

const styles = StyleSheet.create({
  count: {fontWeight: '800', fontSize: 15, color: colors.primary},
  loader: {marginTop: 32},
  list: {gap: 10},
  hint: {
    fontWeight: '400',
    fontSize: 12.5,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: 4,
  },
  error: {
    fontWeight: '600',
    fontSize: 12,
    color: colors.danger,
    marginBottom: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  text: {flex: 1},
  label: {fontWeight: '700', fontSize: 13, color: colors.ink},
  sub: {fontWeight: '400', fontSize: 11, color: colors.textMuted, marginTop: 2},
  subWarn: {color: colors.danger, fontWeight: '600'},
  badge: {
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 11,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {fontWeight: '700', fontSize: 11},
});
