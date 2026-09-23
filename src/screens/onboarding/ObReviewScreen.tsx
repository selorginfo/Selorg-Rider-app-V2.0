import React, {useState} from 'react';
import {Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AppText} from '../../components/common/AppText';
import {PrimaryButton} from '../../components/buttons/PrimaryButton';
import {useAppNavigation} from '../../hooks/useAppNavigation';
import {useRider} from '../../store/RiderContext';
import {obDocsCount, phoneMasked} from '../../store/selectors';
import {profileApi} from '../../services/api';
import {DOC_LIST, VEHICLES} from '../../mock';
import {
  emailError,
  nameError,
  normalizeEmail,
  normalizeVehicleReg,
  vehicleRegError,
} from '../../utils/validation';
import {colors, radius} from '../../theme';

export function ObReviewScreen() {
  const nav = useAppNavigation();
  const {state, actions} = useRider();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const hubName = state.epHubName || state.obHub || '—';
  const docsUploaded = obDocsCount(state);
  const docsComplete = docsUploaded === DOC_LIST.length;

  const nameMsg = nameError(state.obName);
  const emailMsg = emailError(state.obEmail);
  const regMsg = vehicleRegError(state.obVehicleNo);
  const profileReady =
    !nameMsg && !emailMsg && !!state.obVehicle && !regMsg && !!state.obHub;

  const rows = [
    ['Name', state.obName || '—'],
    ['Email', state.obEmail || '—'],
    ['Phone', `+91 ${phoneMasked(state)}`],
    [
      'Vehicle',
      `${(VEHICLES.find(v => v.id === state.obVehicle) || {}).label || '—'} · ${
        state.obVehicleNo || '—'
      }`,
    ],
    ['Hub', hubName],
  ];

  const onSubmit = async () => {
    if (submitting) {
      return;
    }
    setSubmitting(true);
    setError('');

    if (!docsComplete) {
      setError('Upload all required documents before submitting.');
      setSubmitting(false);
      return;
    }
    if (nameMsg || emailMsg || regMsg || !state.obVehicle || !state.obHub) {
      setError(
        nameMsg ||
          emailMsg ||
          regMsg ||
          (!state.obVehicle ? 'Select a vehicle type.' : null) ||
          (!state.obHub ? 'Select a hub.' : null) ||
          'Complete all onboarding details before submit.',
      );
      setSubmitting(false);
      return;
    }

    const reg = normalizeVehicleReg(state.obVehicleNo);
    const profileResult = await profileApi.updateProfile({
      name: state.obName.trim(),
      email: normalizeEmail(state.obEmail),
      vehicleType: state.obVehicle,
      vehicleRegistrationNumber: reg,
      hubId: state.obHub,
    });
    if (!profileResult.ok) {
      setError(profileResult.error || 'Could not save your details');
      setSubmitting(false);
      return;
    }

    const result = await profileApi.submitOnboarding();
    if (result.ok) {
      actions.submitOnboard();
      nav.navigate('Pending');
      setSubmitting(false);
      return;
    }

    setError(result.error || 'Could not submit application');
    setSubmitting(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}>
        <Pressable
          onPress={() => nav.goBack()}
          hitSlop={10}
          style={styles.backBtn}>
          <AppText style={styles.back}>‹</AppText>
        </Pressable>
        <AppText style={styles.title}>Review your details</AppText>
        <AppText style={styles.sub}>Confirm everything looks right</AppText>

        <View style={styles.card}>
          {rows.map(([label, value]) => (
            <View key={label} style={[styles.row, styles.rowBorder]}>
              <AppText style={styles.rowLabel}>{label}</AppText>
              <AppText style={styles.rowValue}>{value}</AppText>
            </View>
          ))}
          <View style={styles.row}>
            <AppText style={styles.rowLabel}>Documents</AppText>
            <AppText
              style={[
                styles.rowValue,
                {color: docsComplete ? colors.primary : colors.danger},
              ]}>
              {docsComplete
                ? '✓ All uploaded'
                : `${docsUploaded}/${DOC_LIST.length} uploaded`}
            </AppText>
          </View>
        </View>
        {!!error && <AppText style={styles.error}>{error}</AppText>}
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton
          label={submitting ? 'Submitting…' : 'Submit Application'}
          onPress={() => void onSubmit()}
          disabled={submitting || !docsComplete || !profileReady}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.white},
  body: {paddingHorizontal: 24, paddingTop: 4, paddingBottom: 16, flexGrow: 1},
  backBtn: {alignSelf: 'flex-start', paddingVertical: 4},
  back: {fontWeight: '700', fontSize: 22, color: colors.textSecondary},
  title: {
    fontWeight: '800',
    fontSize: 22,
    color: colors.inkStrong,
    letterSpacing: -0.4,
    marginTop: 14,
  },
  sub: {fontWeight: '400', fontSize: 13, color: colors.textMuted, marginTop: 4},
  card: {
    backgroundColor: colors.fieldBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingHorizontal: 16,
    marginTop: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
  },
  rowBorder: {borderBottomWidth: 1, borderBottomColor: colors.hairline},
  rowLabel: {fontWeight: '400', fontSize: 13, color: colors.textMuted},
  rowValue: {
    fontWeight: '700',
    fontSize: 13,
    color: colors.ink,
    flexShrink: 1,
    textAlign: 'right',
  },
  error: {
    fontWeight: '600',
    fontSize: 13,
    color: colors.danger,
    marginTop: 12,
    textAlign: 'center',
  },
  footer: {paddingHorizontal: 24, paddingBottom: 8, paddingTop: 8},
});
