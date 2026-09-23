import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AppText} from '../../components/common/AppText';
import {ContentColumn} from '../../components/common/ContentColumn';
import {PopIn} from '../../components/feedback/PopIn';
import {Banner} from '../../components/feedback/Banner';
import {CheckIcon} from '../../components/common/Icons';
import {OtpInput} from '../../components/inputs/OtpInput';
import {PrimaryButton} from '../../components/buttons/PrimaryButton';
import {useAppNavigation} from '../../hooks/useAppNavigation';
import {useHardwareBack} from '../../hooks/useHardwareBack';
import {useRider} from '../../store/RiderContext';
import {activeOrder} from '../../store/selectors';
import {orderApi} from '../../services/api/orderApi';
import {pickDocumentImage} from '../../services/media/pickDocumentImage';
import {applyDetailCoords} from '../../utils/mapCoords';
import {isValidOtp, OTP_LENGTH} from '../../utils/validation';
import {colors} from '../../theme';
import {mediaBandHeight, MIN_TOUCH, useLayout} from '../../theme/layout';

export function PhotoScreen() {
  const nav = useAppNavigation();
  const layout = useLayout();
  const {state, actions} = useRider();
  const a = activeOrder(state);
  const taken = state.photoTaken;
  const [otp, setOtp] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [codError, setCodError] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [photoId, setPhotoId] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [codConfirmed, setCodConfirmed] = useState(false);
  const captureH = mediaBandHeight(
    layout.height,
    layout.isLandscape ? 0.28 : 0.26,
    160,
    240,
  );

  useHardwareBack(
    useCallback(() => {
      nav.replace('Nav');
      return true;
    }, [nav]),
  );

  useEffect(() => {
    if (!a?.id) {
      return;
    }
    let cancelled = false;
    (async () => {
      const detail = await orderApi.getOrderDetail(a.id);
      if (cancelled || !detail.ok || !detail.data) {
        return;
      }
      const enriched = applyDetailCoords(a, detail.data);
      actions.patch({
        orders: state.orders.map(o =>
          o.id === a.id ? {...o, ...enriched} : o,
        ),
      });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a?.id]);

  const codDue =
    a?.paymentMode === 'cod' && a.codAmount != null && a.codAmount > 0
      ? Math.round(a.codAmount)
      : null;
  const otpOk = isValidOtp(otp, OTP_LENGTH);
  const canConfirm =
    taken &&
    !!photoId &&
    otpOk &&
    (codDue == null || codConfirmed) &&
    !capturing &&
    !loading;

  const capturePhoto = async () => {
    if (capturing || loading) {
      return;
    }
    if (!state.activeId) {
      return;
    }
    const picked = await pickDocumentImage('Proof of delivery');
    if (!picked) {
      return;
    }
    setCapturing(true);
    setPhotoError('');
    setFormError('');
    try {
      const result = await orderApi.uploadProofPhoto(state.activeId, picked.uri, {
        mimeType: picked.mimeType,
        fileName: picked.fileName,
      });
      if (!result.ok) {
        setPhotoError(result.error || 'Photo upload failed. Please try again.');
        return;
      }
      const id = result.data?.photoId?.trim();
      if (!id) {
        setPhotoError(
          'Upload succeeded but no photo id was returned. Please retake.',
        );
        return;
      }
      setPhotoId(id);
      if (!state.photoTaken) {
        actions.togglePhoto();
      }
    } finally {
      setCapturing(false);
    }
  };

  async function handleConfirm() {
    if (!state.activeId || loading) {
      return;
    }
    setPhotoError('');
    setOtpError('');
    setCodError('');
    setFormError('');
    if (!photoId) {
      setPhotoError('Capture and upload a delivery photo first.');
      return;
    }
    if (!otpOk) {
      setOtpError(`Enter the ${OTP_LENGTH}-digit customer OTP.`);
      return;
    }
    if (codDue != null && !codConfirmed) {
      setCodError(`Confirm you collected ₹${codDue} cash (COD).`);
      return;
    }
    setLoading(true);
    try {
      const result = await orderApi.confirmDelivery(state.activeId, otp, {
        photoId,
        ...(codDue != null ? {codCollected: codDue} : {}),
      });
      if (!result.ok) {
        setFormError(result.error || 'Incorrect OTP. Please try again.');
        return;
      }
      actions.setFlow('complete');
      nav.replace('Complete');
    } catch {
      setFormError('Could not confirm delivery. Please retry.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => nav.replace('Nav')}
          hitSlop={8}
          style={styles.backBtn}>
          <AppText style={styles.back}>‹</AppText>
        </Pressable>
        <View style={styles.headerText}>
          <AppText style={styles.title} numberOfLines={1}>
            Proof of Delivery
          </AppText>
          <AppText style={styles.sub} numberOfLines={1}>
            Photo + customer OTP required
          </AppText>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.bodyScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <ContentColumn style={styles.body}>
            <Pressable
              onPress={() => void capturePhoto()}
              disabled={capturing}
              style={[
                styles.box,
                {
                  height: captureH,
                  borderColor: taken ? colors.primary : '#D1D5DB',
                  backgroundColor: taken
                    ? colors.primaryTint06
                    : colors.fieldBg,
                },
              ]}>
              {taken ? (
                <View style={styles.center}>
                  <PopIn style={styles.captured}>
                    <CheckIcon size={34} strokeWidth={3} />
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
            {!!photoError && (
              <AppText style={styles.otpError}>{photoError}</AppText>
            )}

            <Banner
              tone="warning"
              icon="💡"
              text="Make sure the package and door number are clearly visible for a valid delivery proof."
              style={styles.tip}
            />

            {codDue != null && (
              <>
                <Pressable
                  onPress={() => {
                    setCodConfirmed(v => !v);
                    setCodError('');
                    setFormError('');
                  }}
                  style={[
                    styles.codRow,
                    codConfirmed && styles.codRowOn,
                    !!codError && styles.codRowErr,
                  ]}
                  accessibilityRole="checkbox"
                  accessibilityState={{checked: codConfirmed}}>
                  <View
                    style={[
                      styles.codCheck,
                      codConfirmed && styles.codCheckOn,
                    ]}>
                    {codConfirmed ? (
                      <CheckIcon size={14} strokeWidth={3} />
                    ) : null}
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
                {!!codError && (
                  <AppText style={styles.otpError}>{codError}</AppText>
                )}
              </>
            )}

            <View style={styles.otpSection}>
              <AppText style={styles.otpLabel}>Customer delivery OTP</AppText>
              <AppText style={styles.otpHint}>
                Ask the customer for the {OTP_LENGTH}-digit code shown in their
                app
              </AppText>
              <View style={styles.otpWrap}>
                <OtpInput
                  value={otp}
                  length={OTP_LENGTH}
                  onChange={v => {
                    setOtp(v);
                    setOtpError('');
                    setFormError('');
                  }}
                />
              </View>
              {!!otpError && (
                <AppText style={styles.otpError}>{otpError}</AppText>
              )}
              {!!formError && (
                <AppText style={styles.otpError}>{formError}</AppText>
              )}
            </View>
          </ContentColumn>
        </ScrollView>

        <ContentColumn style={styles.footer}>
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <PrimaryButton
              label="Confirm Delivery"
              onPress={handleConfirm}
              disabled={!canConfirm}
            />
          )}
        </ContentColumn>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.white},
  flex: {flex: 1},
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
  bodyScroll: {flexGrow: 1},
  body: {flexGrow: 1, padding: 16, width: '100%'},
  box: {
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {alignItems: 'center'},
  captured: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraTile: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraEmoji: {fontSize: 28},
  boxTitle: {fontWeight: '700', fontSize: 15, color: colors.ink, marginTop: 14},
  boxSub: {
    fontWeight: '400',
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  tip: {marginTop: 16},
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
  codRowErr: {borderColor: colors.danger},
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
  otpSection: {marginTop: 24},
  otpLabel: {fontWeight: '700', fontSize: 15, color: colors.ink},
  otpHint: {
    fontWeight: '400',
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 12,
  },
  otpWrap: {width: '100%'},
  otpError: {
    fontWeight: '500',
    fontSize: 13,
    color: colors.danger,
    marginTop: 8,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    width: '100%',
  },
});
