import React, {useCallback} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AppText} from '../../components/common/AppText';
import {PopIn} from '../../components/feedback/PopIn';
import {CheckIcon} from '../../components/common/Icons';
import {PrimaryButton} from '../../components/buttons/PrimaryButton';
import {useAppNavigation} from '../../hooks/useAppNavigation';
import {useHardwareBack} from '../../hooks/useHardwareBack';
import {useRider} from '../../store/RiderContext';
import {selectBulk} from '../../store/selectors';
import {bulkApi} from '../../services/api/bulkApi';
import {pickDocumentImage} from '../../services/media/pickDocumentImage';
import {colors} from '../../theme';
import {mediaBandHeight, MIN_TOUCH, useLayout} from '../../theme/layout';

export function BulkVerifyScreen() {
  const nav = useAppNavigation();
  const layout = useLayout();
  const {state, actions} = useRider();
  const b = selectBulk(state);
  const taken = state.bulkPhotoTaken;
  const [photoId, setPhotoId] = React.useState<string | null>(null);
  const [capturing, setCapturing] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [codConfirmed, setCodConfirmed] = React.useState(false);
  const captureH = mediaBandHeight(layout.height, 0.3, 180, 280);

  useHardwareBack(
    useCallback(() => {
      nav.replace('BulkActive');
      return true;
    }, [nav]),
  );

  const stopLabel = b.current ? `Stop ${b.current.idx + 1} of ${b.total}` : '';
  const codDue =
    b.current?.paymentMode === 'cod' &&
    b.current.codAmount != null &&
    b.current.codAmount > 0
      ? Math.round(b.current.codAmount)
      : null;
  const canConfirm =
    taken &&
    !!photoId &&
    !capturing &&
    !submitting &&
    (codDue == null || codConfirmed);

  const capturePhoto = async () => {
    if (capturing || !b.current?.id) {
      return;
    }
    const picked = await pickDocumentImage('Proof of delivery');
    if (!picked) {
      return;
    }
    setCapturing(true);
    setError('');
    try {
      const result = await bulkApi.uploadProofPhoto(b.current.id, picked.uri, {
        mimeType: picked.mimeType,
        fileName: picked.fileName,
      });
      if (!result.ok) {
        setError(result.error || 'Photo upload failed. Please try again.');
        return;
      }
      const id = result.data?.photoId?.trim();
      if (!id) {
        setError('Upload succeeded but no photo id was returned. Please retake.');
        return;
      }
      setPhotoId(id);
      if (!state.bulkPhotoTaken) {
        actions.toggleBulkPhoto();
      }
    } finally {
      setCapturing(false);
    }
  };

  const confirm = async () => {
    if (!canConfirm || !b.current?.id || !photoId || submitting) {
      return;
    }
    if (codDue != null && !codConfirmed) {
      setError(`Confirm you collected ₹${codDue} cash (COD).`);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const result = await bulkApi.markDelivered(b.current.id, {
        photoId,
        ...(codDue != null ? {codCollected: codDue} : {}),
      });
      if (!result.ok) {
        setError(result.error || 'Could not confirm delivery.');
        return;
      }
      const willFinish =
        Object.keys({...state.bulkStatuses, [b.currentIdx]: 'delivered'})
          .length === b.total;
      actions.confirmBulkDelivery();
      nav.replace(willFinish ? 'BulkComplete' : 'BulkActive');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => nav.replace('BulkActive')}
          hitSlop={10}
          style={styles.backBtn}>
          <AppText style={styles.back}>‹</AppText>
        </Pressable>
        <View style={styles.headerText}>
          <AppText style={styles.title} numberOfLines={1}>
            Proof of Delivery
          </AppText>
          <AppText style={styles.sub} numberOfLines={1}>
            {stopLabel}
          </AppText>
        </View>
      </View>

      <View style={styles.body}>
        <Pressable
          onPress={() => void capturePhoto()}
          disabled={capturing}
          style={[
            styles.box,
            {height: captureH},
            {
              borderColor: taken ? colors.primary : '#D1D5DB',
              backgroundColor: taken ? colors.primaryTint06 : colors.fieldBg,
            },
          ]}>
          {taken ? (
            <View style={styles.center}>
              <PopIn style={styles.capturedTile}>
                <CheckIcon size={32} strokeWidth={3} />
              </PopIn>
              <AppText style={styles.boxTitle}>
                {capturing ? 'Uploading photo…' : 'Photo captured'}
              </AppText>
              <AppText style={styles.boxSub}>Tap to retake</AppText>
            </View>
          ) : (
            <View style={styles.center}>
              <View style={styles.cameraTile}>
                <AppText style={styles.cameraEmoji}>📷</AppText>
              </View>
              <AppText style={styles.boxTitle}>Tap to capture photo</AppText>
              <AppText style={styles.boxSub}>
                Show the package at the door
              </AppText>
            </View>
          )}
        </Pressable>

        {codDue != null && (
          <Pressable
            onPress={() => setCodConfirmed(v => !v)}
            style={[styles.codRow, codConfirmed && styles.codRowOn]}
            accessibilityRole="checkbox"
            accessibilityState={{checked: codConfirmed}}>
            <View
              style={[styles.codCheck, codConfirmed && styles.codCheckOn]}>
              {codConfirmed ? <CheckIcon size={14} strokeWidth={3} /> : null}
            </View>
            <View style={styles.codText}>
              <AppText style={styles.codTitle}>
                Collect ₹{codDue} cash (COD)
              </AppText>
              <AppText style={styles.codHint}>
                Tap to confirm you collected the exact order amount
              </AppText>
            </View>
          </Pressable>
        )}
      </View>

      {!!error && (
        <AppText style={styles.err}>{error}</AppText>
      )}

      <View style={styles.footer}>
        <PrimaryButton
          label={submitting ? 'Confirming…' : 'Confirm Delivery'}
          onPress={confirm}
          disabled={!canConfirm}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.white},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backBtn: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  back: {fontWeight: '700', fontSize: 22, color: colors.textSecondary},
  headerText: {flex: 1, minWidth: 0},
  title: {fontWeight: '800', fontSize: 18, color: colors.ink},
  sub: {fontWeight: '400', fontSize: 12, color: colors.textMuted},
  body: {flex: 1, padding: 16},
  box: {
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {alignItems: 'center'},
  capturedTile: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraTile: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.bulkTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraEmoji: {fontSize: 26},
  boxTitle: {fontWeight: '700', fontSize: 14, color: colors.ink, marginTop: 12},
  boxSub: {
    fontWeight: '400',
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  codRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.divider,
    backgroundColor: colors.fieldBg,
    minHeight: MIN_TOUCH,
  },
  codRowOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint06,
  },
  codCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  codCheckOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  codText: {flex: 1, minWidth: 0},
  codTitle: {fontWeight: '700', fontSize: 15, color: colors.ink},
  codHint: {
    fontWeight: '400',
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  err: {
    fontWeight: '600',
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  footer: {padding: 16, borderTopWidth: 1, borderTopColor: colors.divider},
});
