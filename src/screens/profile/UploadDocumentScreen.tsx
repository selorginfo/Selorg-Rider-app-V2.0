import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {useFocusEffect, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Screen} from '../../components/common/Screen';
import {AppText} from '../../components/common/AppText';
import {
  CheckIcon,
  ChevronRightIcon,
  CloseIcon,
  FileDocIcon,
  UploadArrowIcon,
} from '../../components/common/Icons';
import {BottomSheet} from '../../components/bottomSheets/BottomSheet';
import {useAppNavigation} from '../../hooks/useAppNavigation';
import {DOC_LIST, TWO_SIDED_DOC_CODES} from '../../mock';
import {
  profileApi,
  type KycDocumentSide,
  type KycDocumentType,
} from '../../services/api/profileApi';
import {pickDocumentImage} from '../../services/media/pickDocumentImage';
import type {DocumentDto} from '../../types/api';
import type {RootStackParamList} from '../../types/navigation';
import {colors, radius, shadow} from '../../theme';

type SlotSide = KycDocumentSide | 'file';
type DocUiStatus = 'missing' | 'partial' | 'pending' | 'approved' | 'rejected';

const TWO_SIDED = new Set<string>(TWO_SIDED_DOC_CODES);

const ui = {
  dropBg: '#FEFBF0',
  dropBorder: '#E8D9B8',
  accent: '#A67C00',
  accentSoft: '#C4A035',
  success: '#2E7D32',
  pdfRed: '#D32F2F',
  pdfBg: '#FBE9E7',
  cardBorder: '#E6E6E6',
  ink: '#1A1A1A',
  muted: '#757575',
  hair: '#EEEEEE',
};

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
  if (s === 'pending') {
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

function sideLabel(side: SlotSide): string {
  if (side === 'front') {
    return 'Front';
  }
  if (side === 'back') {
    return 'Back';
  }
  return 'Document';
}

function formatUploadedAt(iso?: string | null): string {
  if (!iso) {
    return '';
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${d.getDate()} ${months[d.getMonth()]} ${h}:${m} ${ampm}`;
}

type FileRow = {
  key: string;
  side: SlotSide;
  title: string;
  uri?: string;
  status: DocUiStatus;
  approved: boolean;
  meta: string;
  fileName?: string;
};

function UploadProgressBar({active}: {active: boolean}) {
  const width = useRef(new Animated.Value(0.12)).current;

  useEffect(() => {
    if (!active) {
      width.setValue(0.12);
      return;
    }
    width.setValue(0.12);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(width, {
          toValue: 0.78,
          duration: 1100,
          useNativeDriver: false,
        }),
        Animated.timing(width, {
          toValue: 0.28,
          duration: 700,
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, width]);

  if (!active) {
    return null;
  }

  return (
    <View style={styles.progressTrack}>
      <Animated.View
        style={[
          styles.progressFill,
          {
            width: width.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
}

export function UploadDocumentScreen() {
  const nav = useAppNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'UploadDocument'>>();

  const docType = route.params.type;
  const docDef = DOC_LIST.find(d => d.code === docType);
  const label = docDef?.label || 'Document';
  const twoSided = isTwoSided(docType);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [docs, setDocs] = useState<DocumentDto[]>([]);
  const [slotUris, setSlotUris] = useState<Record<string, string>>({});
  const [docStatus, setDocStatus] = useState<DocUiStatus>('missing');
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [preview, setPreview] = useState<{uri: string; title: string} | null>(
    null,
  );
  const [sidePickerOpen, setSidePickerOpen] = useState(false);

  const slots: SlotSide[] = useMemo(
    () => (twoSided ? ['front', 'back'] : ['file']),
    [twoSided],
  );

  const syncFromServer = useCallback(async () => {
    setError('');
    const result = await profileApi.listDocuments();
    if (!result.ok) {
      setError(result.error || "Couldn't load documents");
      setLoading(false);
      return;
    }

    const uploaded = Array.isArray(result.data) ? result.data : [];
    const nextUris: Record<string, string> = {};

    for (const side of slots) {
      const row = findDocRow(uploaded, docType, side);
      if (row?.url) {
        nextUris[slotKey(docType, side)] = row.url;
      }
    }

    let status: DocUiStatus = 'missing';
    if (twoSided) {
      const hasFront = Boolean(nextUris[slotKey(docType, 'front')]);
      const hasBack = Boolean(nextUris[slotKey(docType, 'back')]);
      const partial = hasFront !== hasBack;
      const frontRow = findDocRow(uploaded, docType, 'front');
      const backRow = findDocRow(uploaded, docType, 'back');
      const raw =
        frontRow?.status === 'rejected' || backRow?.status === 'rejected'
          ? 'rejected'
          : frontRow?.status || backRow?.status;
      status = mapStatus(raw, partial);
    } else {
      const row = findDocRow(uploaded, docType, 'file');
      status = mapStatus(row?.status, false);
    }

    setDocs(uploaded);
    setSlotUris(nextUris);
    setDocStatus(status);
    setLoading(false);
  }, [docType, slots, twoSided]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void syncFromServer();
    }, [syncFromServer]),
  );

  const rows: FileRow[] = useMemo(() => {
    return slots.map(side => {
      const key = slotKey(docType, side);
      const uri = slotUris[key];
      const row = findDocRow(docs, docType, side);
      const when = formatUploadedAt(row?.uploadedAt || row?.createdAt);
      const title = twoSided ? `${label} · ${sideLabel(side)}` : label;
      let meta = twoSided
        ? `${sideLabel(side)} photo`
        : docDef?.sub || 'Document photo';
      if (uri) {
        meta =
          when ||
          (docStatus === 'approved'
            ? 'Verified'
            : docStatus === 'rejected'
              ? 'Rejected'
              : 'Uploaded');
      }
      return {
        key,
        side,
        title,
        uri,
        status: docStatus,
        approved: docStatus === 'approved',
        meta,
        fileName: row?.fileName,
      };
    });
  }, [docDef?.sub, docStatus, docType, docs, label, slotUris, slots, twoSided]);

  const visibleRows = useMemo(
    () => rows.filter(r => r.uri || uploadingSlot === r.key),
    [rows, uploadingSlot],
  );

  const onUpload = async (side: SlotSide) => {
    if (uploadingSlot || docStatus === 'approved') {
      return;
    }

    const hint =
      side === 'front' ? ' (front)' : side === 'back' ? ' (back)' : '';
    const picked = await pickDocumentImage(`Upload ${label}${hint}`);
    if (!picked) {
      return;
    }

    const key = slotKey(docType, side);
    const previousUri = slotUris[key];
    setUploadingSlot(key);
    setError('');
    setSlotUris(prev => ({...prev, [key]: picked.uri}));

    const restorePrevious = () => {
      setSlotUris(prev => {
        const next = {...prev};
        if (previousUri) {
          next[key] = previousUri;
        } else {
          delete next[key];
        }
        return next;
      });
    };

    try {
      const result = await profileApi.uploadDocument(docType, picked.uri, {
        side: side === 'file' ? undefined : side,
        fileName: picked.fileName,
        mimeType: picked.mimeType || 'image/jpeg',
      });
      if (!result.ok) {
        restorePrevious();
        setError(result.error || 'Upload failed. Please try again.');
        return;
      }
      if (result.data?.url) {
        setSlotUris(prev => ({...prev, [key]: result.data!.url as string}));
      }
      await syncFromServer();
    } catch {
      restorePrevious();
      setError('Upload failed. Please try again.');
    } finally {
      setUploadingSlot(null);
    }
  };

  const openBrowse = () => {
    if (uploadingSlot || docStatus === 'approved') {
      if (docStatus === 'approved') {
        Alert.alert('Verified', 'This document is already verified.');
      }
      return;
    }
    if (twoSided) {
      setSidePickerOpen(true);
      return;
    }
    void onUpload('file');
  };

  const onReplace = (row: FileRow) => {
    if (row.approved) {
      Alert.alert('Verified', 'Verified documents cannot be replaced.');
      return;
    }
    Alert.alert(row.title, 'Replace this file with a new upload?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Replace',
        onPress: () => {
          void onUpload(row.side);
        },
      },
    ]);
  };

  return (
    <Screen scroll edges={['top']} background={colors.white}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <FileDocIcon size={20} color={ui.accent} strokeWidth={2} />
        </View>
        <View style={styles.headerText}>
          <AppText style={styles.headerTitle}>Upload Files</AppText>
          <AppText style={styles.headerSub}>
            Select and upload the files of your choice
          </AppText>
        </View>
        <Pressable
          onPress={() => nav.goBack()}
          hitSlop={10}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Close">
          <CloseIcon size={20} color={ui.ink} />
        </Pressable>
      </View>
      <View style={styles.headerRule} />

      <View style={styles.body}>
        <AppText style={styles.docLabel}>{label}</AppText>
        <AppText style={styles.docHint}>
          {twoSided
            ? 'Front and back photos required'
            : 'Front photo only'}{' '}
          · JPEG / PNG up to 10 MB
        </AppText>

        {loading && !Object.keys(slotUris).length ? (
          <ActivityIndicator
            color={colors.primary}
            style={styles.loader}
            size="large"
          />
        ) : null}

        {!!error && !Object.keys(slotUris).length && !loading ? (
          <View style={styles.errorWrap}>
            <AppText style={styles.errorTitle}>Couldn't load document</AppText>
            <AppText style={styles.errorSub}>{error}</AppText>
            <Pressable
              style={styles.retryBtn}
              onPress={() => {
                setLoading(true);
                void syncFromServer();
              }}>
              <AppText style={styles.retryText}>Retry</AppText>
            </Pressable>
          </View>
        ) : null}

        {!!error && Object.keys(slotUris).length > 0 ? (
          <AppText style={styles.inlineError}>{error}</AppText>
        ) : null}

        {!loading || Object.keys(slotUris).length > 0 ? (
          <>
            <Pressable
              style={styles.dropzone}
              onPress={openBrowse}
              disabled={!!uploadingSlot || docStatus === 'approved'}
              accessibilityRole="button"
              accessibilityLabel="Browse file">
              <View style={styles.dropIconWrap}>
                <FileDocIcon size={28} color={ui.accent} strokeWidth={1.8} />
                <View style={styles.dropIconBadge}>
                  <UploadArrowIcon size={12} color={colors.white} />
                </View>
              </View>
              <AppText style={styles.dropTitle}>
                Choose a file or document
              </AppText>
              <AppText style={styles.dropHint}>
                JPEG, PNG up to 10 MB.
              </AppText>
              <Pressable
                style={[
                  styles.browseBtn,
                  (uploadingSlot || docStatus === 'approved') &&
                    styles.browseBtnDisabled,
                ]}
                onPress={openBrowse}
                disabled={!!uploadingSlot || docStatus === 'approved'}>
                <AppText style={styles.browseLabel}>Browse File</AppText>
              </Pressable>
            </Pressable>

            {visibleRows.length > 0 ? (
              <View style={styles.listSheet}>
                <View style={styles.sheetHandle} />
                {visibleRows.map(row => {
                  const uploading = uploadingSlot === row.key;
                  const completed =
                    !uploading &&
                    !!row.uri &&
                    (row.status === 'pending' || row.status === 'approved');

                  return (
                    <View key={row.key} style={styles.fileCard}>
                      <View style={styles.fileRow}>
                        <Pressable
                          onPress={() => {
                            if (row.uri) {
                              setPreview({uri: row.uri, title: row.title});
                            }
                          }}
                          style={styles.fileIconWrap}>
                          {row.uri && !uploading ? (
                            <Image
                              source={{uri: row.uri}}
                              style={styles.fileThumb}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.pdfBadge}>
                              <AppText style={styles.pdfBadgeText}>DOC</AppText>
                            </View>
                          )}
                        </Pressable>

                        <View style={styles.fileMeta}>
                          <AppText style={styles.fileName} numberOfLines={1}>
                            {row.fileName || row.title}
                          </AppText>
                          <View style={styles.fileStatusRow}>
                            <AppText style={styles.fileSize} numberOfLines={1}>
                              {row.meta}
                            </AppText>
                            {completed ? (
                              <View style={styles.completedPill}>
                                <View style={styles.checkCircle}>
                                  <CheckIcon
                                    size={10}
                                    color={colors.white}
                                    strokeWidth={3}
                                  />
                                </View>
                                <AppText style={styles.completedText}>
                                  {row.approved ? 'Verified' : 'Completed'}
                                </AppText>
                              </View>
                            ) : null}
                          </View>
                        </View>

                        {uploading ? (
                          <ActivityIndicator
                            color={ui.accent}
                            size="small"
                            style={styles.rowAction}
                          />
                        ) : (
                          <Pressable
                            onPress={() => onReplace(row)}
                            hitSlop={8}
                            style={styles.rowAction}
                            accessibilityLabel="Replace file">
                            <CloseIcon size={18} color={ui.muted} />
                          </Pressable>
                        )}
                      </View>
                      <UploadProgressBar active={uploading} />
                    </View>
                  );
                })}
              </View>
            ) : (
              <AppText style={styles.emptyHint}>
                No files uploaded yet. Tap Browse File to get started.
              </AppText>
            )}

            {twoSided
              ? rows
                  .filter(r => !r.uri && uploadingSlot !== r.key)
                  .map(r => (
                    <Pressable
                      key={`need-${r.key}`}
                      style={styles.requiredRow}
                      onPress={() => void onUpload(r.side)}
                      disabled={!!uploadingSlot || docStatus === 'approved'}>
                      <View style={styles.requiredIcon}>
                        <FileDocIcon size={18} color={ui.muted} />
                      </View>
                      <View style={styles.flex1}>
                        <AppText style={styles.requiredName}>{r.title}</AppText>
                        <AppText style={styles.requiredSub}>
                          Still needed
                        </AppText>
                      </View>
                      <AppText style={styles.requiredCta}>Upload</AppText>
                    </Pressable>
                  ))
              : null}
          </>
        ) : null}
      </View>

      <BottomSheet
        visible={sidePickerOpen}
        onClose={() => setSidePickerOpen(false)}>
        <AppText style={styles.sheetTitle}>Browse File</AppText>
        <AppText style={styles.sheetSub}>
          Which side of {label} are you uploading?
        </AppText>
        {slots.map(side => (
          <Pressable
            key={`side-${side}`}
            style={styles.browseOption}
            onPress={() => {
              setSidePickerOpen(false);
              void onUpload(side);
            }}>
            <View style={styles.browseOptionIcon}>
              <FileDocIcon size={18} color={ui.accent} />
            </View>
            <View style={styles.flex1}>
              <AppText style={styles.browseOptionTitle}>
                {label} · {sideLabel(side)}
              </AppText>
              <AppText style={styles.browseOptionSub}>
                {slotUris[slotKey(docType, side)]
                  ? 'Replace existing file'
                  : 'Upload new photo'}
              </AppText>
            </View>
            <ChevronRightIcon size={18} color={ui.muted} />
          </Pressable>
        ))}
      </BottomSheet>

      <Modal
        visible={!!preview}
        transparent
        animationType="fade"
        onRequestClose={() => setPreview(null)}>
        <SafeAreaView style={styles.previewRoot} edges={['top', 'bottom']}>
          <Pressable
            style={styles.previewClose}
            onPress={() => setPreview(null)}
            hitSlop={8}>
            <AppText style={styles.previewCloseText}>Close</AppText>
          </Pressable>
          {preview ? (
            <Image
              source={{uri: preview.uri}}
              style={styles.previewImage}
              resizeMode="contain"
            />
          ) : null}
          {preview ? (
            <AppText style={styles.previewTitle}>{preview.title}</AppText>
          ) : null}
        </SafeAreaView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ui.dropBg,
    borderWidth: 1,
    borderColor: ui.dropBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {flex: 1, paddingTop: 2},
  headerTitle: {
    fontWeight: '800',
    fontSize: 22,
    color: ui.ink,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontWeight: '400',
    fontSize: 13,
    color: ui.muted,
    marginTop: 3,
    lineHeight: 18,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: ui.hair,
    marginHorizontal: 20,
  },
  body: {padding: 20, paddingBottom: 36},
  docLabel: {fontWeight: '700', fontSize: 16, color: ui.ink, marginBottom: 4},
  docHint: {
    fontWeight: '400',
    fontSize: 12.5,
    color: ui.muted,
    marginBottom: 16,
    lineHeight: 18,
  },
  loader: {marginVertical: 28},
  flex1: {flex: 1},
  errorWrap: {alignItems: 'center', paddingVertical: 28, gap: 8},
  errorTitle: {fontWeight: '700', fontSize: 15, color: colors.ink},
  errorSub: {
    fontWeight: '400',
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryTint12,
  },
  retryText: {fontWeight: '700', fontSize: 13, color: colors.primary},
  inlineError: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: '600',
    marginBottom: 12,
  },
  dropzone: {
    backgroundColor: ui.dropBg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: ui.dropBorder,
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  dropIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: ui.dropBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  dropIconBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: ui.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropTitle: {
    fontWeight: '700',
    fontSize: 15,
    color: ui.ink,
    textAlign: 'center',
  },
  dropHint: {
    fontWeight: '400',
    fontSize: 12.5,
    color: ui.muted,
    marginTop: 6,
    textAlign: 'center',
  },
  browseBtn: {
    marginTop: 18,
    minHeight: 42,
    paddingHorizontal: 22,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D0D0D0',
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  browseBtnDisabled: {opacity: 0.55},
  browseLabel: {fontWeight: '600', fontSize: 14, color: '#555555'},
  emptyHint: {
    fontWeight: '400',
    fontSize: 13,
    color: ui.muted,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
    lineHeight: 19,
  },
  listSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    marginBottom: 18,
    ...shadow('sm'),
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D8D8D8',
    marginBottom: 12,
  },
  fileCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    marginBottom: 10,
  },
  fileRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  fileIconWrap: {
    width: 44,
    height: 52,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: ui.pdfBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileThumb: {width: '100%', height: '100%'},
  pdfBadge: {
    width: 34,
    height: 40,
    borderRadius: 6,
    backgroundColor: ui.pdfRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfBadgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  fileMeta: {flex: 1, minWidth: 0},
  fileName: {fontWeight: '700', fontSize: 14, color: ui.ink},
  fileStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  fileSize: {fontWeight: '400', fontSize: 12, color: ui.muted, flexShrink: 1},
  completedPill: {flexDirection: 'row', alignItems: 'center', gap: 5},
  checkCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: ui.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedText: {fontWeight: '600', fontSize: 12, color: ui.success},
  rowAction: {padding: 4},
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#EFEFEF',
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: ui.accentSoft,
  },
  requiredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  requiredIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requiredName: {fontWeight: '600', fontSize: 14, color: ui.ink},
  requiredSub: {fontWeight: '400', fontSize: 12, color: ui.muted, marginTop: 2},
  requiredCta: {fontWeight: '700', fontSize: 13, color: colors.primary},
  sheetTitle: {fontWeight: '800', fontSize: 18, color: ui.ink, marginBottom: 4},
  sheetSub: {
    fontWeight: '400',
    fontSize: 13,
    color: ui.muted,
    marginBottom: 16,
  },
  browseOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ui.hair,
  },
  browseOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: ui.dropBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  browseOptionTitle: {fontWeight: '700', fontSize: 14, color: ui.ink},
  browseOptionSub: {
    fontWeight: '400',
    fontSize: 12,
    color: ui.muted,
    marginTop: 2,
  },
  previewRoot: {
    flex: 1,
    backgroundColor: colors.black,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 48,
  },
  previewClose: {
    position: 'absolute',
    top: 12,
    right: 20,
    zIndex: 2,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  previewCloseText: {fontWeight: '700', fontSize: 13, color: colors.white},
  previewImage: {width: '100%', height: '78%'},
  previewTitle: {
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 13,
    color: colors.white,
  },
});
