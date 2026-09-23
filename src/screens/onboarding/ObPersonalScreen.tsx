import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {ObStepLayout} from './ObStepLayout';
import {AppText} from '../../components/common/AppText';
import {SavedSummaryCard} from '../../components/common/SavedSummaryCard';
import {LabeledInput} from '../../components/inputs/LabeledInput';
import {PrimaryButton} from '../../components/buttons/PrimaryButton';
import {OutlineButton} from '../../components/buttons/OutlineButton';
import {useAppNavigation} from '../../hooks/useAppNavigation';
import {useRider} from '../../store/RiderContext';
import {phoneMasked} from '../../store/selectors';
import {profileApi} from '../../services/api';
import {
  emailError,
  NAME_MAX,
  nameError,
  normalizeEmail,
} from '../../utils/validation';
import {colors} from '../../theme';

type Phase = 'form' | 'saved' | 'edit';

interface SavedPersonal {
  name: string;
  email: string;
}

export function ObPersonalScreen() {
  const nav = useAppNavigation();
  const {state, actions} = useRider();
  const [phase, setPhase] = useState<Phase>('form');
  const [saved, setSaved] = useState<SavedPersonal | null>(null);
  const [draft, setDraft] = useState<SavedPersonal>({name: '', email: ''});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [touched, setTouched] = useState({name: false, email: false});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await profileApi.getProfile();
      if (cancelled || !result.ok || !result.data) {
        return;
      }
      const name = (result.data.name || '').trim();
      const email = (result.data.email || '').trim();
      if (!name || !email) {
        return;
      }
      actions.patch({obName: name, obEmail: email});
      setSaved({name, email});
      setDraft({name, email});
      setPhase('saved');
    })();
    return () => {
      cancelled = true;
    };
  }, [actions]);

  const activeName = phase === 'edit' ? draft.name : state.obName;
  const activeEmail = phase === 'edit' ? draft.email : state.obEmail;
  const nameMsg = nameError(activeName);
  const emailMsg = emailError(activeEmail);
  const valid = !nameMsg && !emailMsg;

  const persist = async (name: string, email: string) => {
    const result = await profileApi.updateProfile({
      name,
      email: normalizeEmail(email),
    });
    if (!result.ok) {
      return {ok: false as const, error: result.error || 'Could not save'};
    }
    const next = {
      name: result.data?.name?.trim() || name,
      email: result.data?.email?.trim() || normalizeEmail(email),
    };
    actions.patch({obName: next.name, obEmail: next.email});
    setSaved(next);
    setDraft(next);
    return {ok: true as const};
  };

  const onConfirm = async () => {
    setTouched({name: true, email: true});
    if (!valid || saving) {
      return;
    }
    setSaving(true);
    setFormError('');
    const name = (phase === 'edit' ? draft.name : state.obName).trim();
    const email = (phase === 'edit' ? draft.email : state.obEmail).trim();
    const result = await persist(name, email);
    setSaving(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setPhase('saved');
  };

  const startEdit = async () => {
    setFormError('');
    setTouched({name: false, email: false});
    setSaving(true);
    const result = await profileApi.getProfile();
    setSaving(false);
    if (result.ok && result.data) {
      const name = (result.data.name || saved?.name || '').trim();
      const email = (result.data.email || saved?.email || '').trim();
      setDraft({name, email});
      setSaved({name, email});
    } else if (saved) {
      setDraft({...saved});
    }
    setPhase('edit');
  };

  const cancelEdit = () => {
    setFormError('');
    if (saved) {
      setDraft({...saved});
      actions.patch({obName: saved.name, obEmail: saved.email});
    }
    setPhase('saved');
  };

  const footer =
    phase === 'saved' ? (
      <View style={styles.footerCol}>
        <PrimaryButton
          label="Continue"
          onPress={() => nav.navigate('ObVehicle')}
        />
        <OutlineButton
          label="Edit details"
          tone="neutral"
          onPress={() => void startEdit()}
          style={styles.editBtn}
        />
      </View>
    ) : phase === 'edit' ? (
      <View style={styles.footerCol}>
        <PrimaryButton
          label={saving ? 'Saving…' : 'Save changes'}
          onPress={() => void onConfirm()}
          disabled={!valid || saving}
        />
        <OutlineButton
          label="Cancel"
          tone="neutral"
          onPress={cancelEdit}
          style={styles.editBtn}
        />
      </View>
    ) : (
      <PrimaryButton
        label={saving ? 'Saving…' : 'Confirm & save'}
        onPress={() => void onConfirm()}
        disabled={!valid || saving}
      />
    );

  return (
    <ObStepLayout
      step={1}
      totalSteps={5}
      title="Personal details"
      subtitle={
        phase === 'saved'
          ? 'Your details are saved'
          : phase === 'edit'
            ? 'Update your details'
            : 'Tell us who you are'
      }
      onBack={() => nav.goBack()}
      footer={footer}>
      {phase === 'saved' && saved ? (
        <SavedSummaryCard
          title="Personal details saved"
          fields={[
            {label: 'Name', value: saved.name},
            {label: 'Email', value: saved.email},
            {label: 'Mobile', value: `+91 ${phoneMasked(state)}`},
          ]}
        />
      ) : (
        <View style={styles.fields}>
          {!!formError && <AppText style={styles.error}>{formError}</AppText>}
          <View>
            <LabeledInput
              label="Full name"
              value={phase === 'edit' ? draft.name : state.obName}
              onChangeText={v => {
                const next = v.slice(0, NAME_MAX);
                if (phase === 'edit') {
                  setDraft(d => ({...d, name: next}));
                } else {
                  actions.setObName(next);
                }
                setTouched(t => ({...t, name: true}));
                setFormError('');
              }}
              placeholder="e.g. Arjun Mehta"
              maxLength={NAME_MAX}
              style={
                touched.name && nameMsg ? styles.inputInvalid : undefined
              }
            />
            {touched.name && nameMsg ? (
              <AppText style={styles.fieldError}>{nameMsg}</AppText>
            ) : null}
          </View>
          <View>
            <LabeledInput
              label="Email address"
              value={phase === 'edit' ? draft.email : state.obEmail}
              onChangeText={v => {
                if (phase === 'edit') {
                  setDraft(d => ({...d, email: v}));
                } else {
                  actions.setObEmail(v);
                }
                setTouched(t => ({...t, email: true}));
                setFormError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="you@example.com"
              style={
                touched.email && emailMsg ? styles.inputInvalid : undefined
              }
            />
            {touched.email && emailMsg ? (
              <AppText style={styles.fieldError}>{emailMsg}</AppText>
            ) : null}
          </View>
          <View>
            <AppText style={styles.label}>Mobile number</AppText>
            <View style={styles.readonly}>
              <AppText style={styles.readonlyText}>
                +91 {phoneMasked(state)}
              </AppText>
              <AppText style={styles.verified}>✓ Verified</AppText>
            </View>
          </View>
        </View>
      )}
    </ObStepLayout>
  );
}

const styles = StyleSheet.create({
  fields: {gap: 18},
  footerCol: {gap: 10},
  editBtn: {marginTop: 0},
  error: {fontWeight: '600', fontSize: 13, color: colors.danger},
  fieldError: {
    fontWeight: '600',
    fontSize: 12,
    color: colors.danger,
    marginTop: 6,
  },
  inputInvalid: {borderColor: colors.danger},
  label: {
    fontWeight: '700',
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  readonly: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: colors.fieldBg2,
  },
  readonlyText: {fontWeight: '700', fontSize: 15, color: colors.textFaint},
  verified: {
    marginLeft: 'auto',
    fontWeight: '700',
    fontSize: 11,
    color: colors.primary,
  },
});
