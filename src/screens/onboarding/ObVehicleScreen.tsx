import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {ObStepLayout} from './ObStepLayout';
import {AppText} from '../../components/common/AppText';
import {SavedSummaryCard} from '../../components/common/SavedSummaryCard';
import {LabeledInput} from '../../components/inputs/LabeledInput';
import {PrimaryButton} from '../../components/buttons/PrimaryButton';
import {OutlineButton} from '../../components/buttons/OutlineButton';
import {useAppNavigation} from '../../hooks/useAppNavigation';
import {useRider} from '../../store/RiderContext';
import {profileApi} from '../../services/api';
import {VEHICLES} from '../../mock';
import {
  deriveDeliveryMode,
  normalizeVehicleType,
} from '../../constants/vehicles';
import {
  normalizeVehicleReg,
  VEHICLE_REG_MAX,
  vehicleRegError,
} from '../../utils/validation';
import {colors} from '../../theme';
import {useLayout} from '../../theme/layout';

type Phase = 'form' | 'saved' | 'edit';

interface SavedVehicle {
  type: string;
  reg: string;
}

function vehicleLabel(id: string): string {
  return VEHICLES.find(v => v.id === id)?.label || id;
}

function deliveryLabel(type: string): string {
  return deriveDeliveryMode(type) === 'bulk'
    ? 'Bulk Delivery'
    : 'Standard Delivery';
}

export function ObVehicleScreen() {
  const nav = useAppNavigation();
  const layout = useLayout();
  const {state, actions} = useRider();
  const [phase, setPhase] = useState<Phase>('form');
  const [saved, setSaved] = useState<SavedVehicle | null>(null);
  const [draftType, setDraftType] = useState('');
  const [draftReg, setDraftReg] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [vehicleTouched, setVehicleTouched] = useState(false);
  const [regTouched, setRegTouched] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await profileApi.getProfile();
      if (cancelled || !result.ok || !result.data?.vehicle) {
        return;
      }
      const type = result.data.vehicle.type || '';
      const reg = (result.data.vehicle.registrationNumber || '').trim();
      if (!type || !reg) {
        return;
      }
      const normalized = normalizeVehicleType(type) || type;
      actions.patch({obVehicle: normalized, obVehicleNo: reg});
      setSaved({type: normalized, reg});
      setDraftType(normalized);
      setDraftReg(reg);
      setPhase('saved');
    })();
    return () => {
      cancelled = true;
    };
  }, [actions]);

  const activeType = phase === 'edit' ? draftType : state.obVehicle;
  const activeReg = phase === 'edit' ? draftReg : state.obVehicleNo;
  const regMsg = vehicleRegError(activeReg);
  const vehicleMsg = !activeType ? 'Select your vehicle type.' : null;
  const valid = !vehicleMsg && !regMsg;

  const persist = async (type: string, regRaw: string) => {
    const reg = normalizeVehicleReg(regRaw);
    const result = await profileApi.updateProfile({
      vehicleType: type,
      vehicleRegistrationNumber: reg,
    });
    if (!result.ok) {
      return {ok: false as const, error: result.error || 'Could not save'};
    }
    const nextType = result.data?.vehicle?.type || type;
    const nextReg =
      result.data?.vehicle?.registrationNumber?.trim() || reg;
    actions.patch({obVehicle: nextType, obVehicleNo: nextReg});
    setSaved({type: nextType, reg: nextReg});
    setDraftType(nextType);
    setDraftReg(nextReg);
    return {ok: true as const};
  };

  const onConfirm = async () => {
    setVehicleTouched(true);
    setRegTouched(true);
    if (!activeType) {
      setFormError('Select your vehicle type.');
      return;
    }
    if (!valid || saving) {
      return;
    }
    setSaving(true);
    setFormError('');
    const result = await persist(activeType, activeReg);
    setSaving(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setPhase('saved');
  };

  const startEdit = async () => {
    setFormError('');
    setVehicleTouched(false);
    setRegTouched(false);
    setSaving(true);
    const result = await profileApi.getProfile();
    setSaving(false);
    if (result.ok && result.data?.vehicle) {
      const type = result.data.vehicle.type || saved?.type || '';
      const reg = (result.data.vehicle.registrationNumber || saved?.reg || '').trim();
      setDraftType(type);
      setDraftReg(reg);
      setSaved({type, reg});
    } else if (saved) {
      setDraftType(saved.type);
      setDraftReg(saved.reg);
    }
    setPhase('edit');
  };

  const cancelEdit = () => {
    setFormError('');
    if (saved) {
      setDraftType(saved.type);
      setDraftReg(saved.reg);
      actions.patch({obVehicle: saved.type, obVehicleNo: saved.reg});
    }
    setPhase('saved');
  };

  const renderPicker = () => (
    <>
      <View style={[styles.grid, layout.isCompact && styles.gridStack]}>
        {VEHICLES.map(v => {
          const sel = activeType === v.id;
          const modeHint =
            deriveDeliveryMode(v.id) === 'bulk' ? 'Bulk' : 'Standard';
          return (
            <Pressable
              key={v.id}
              onPress={() => {
                setVehicleTouched(true);
                setFormError('');
                if (phase === 'edit') {
                  setDraftType(v.id);
                } else {
                  actions.setObVehicle(v.id);
                }
              }}
              style={[
                styles.card,
                layout.isCompact ? styles.cardFull : styles.cardHalf,
                {
                  borderColor: sel ? colors.primary : colors.neutralTile,
                  backgroundColor: sel ? colors.primaryTint06 : colors.white,
                },
              ]}>
              <AppText style={styles.icon}>{v.icon}</AppText>
              <AppText style={styles.label} numberOfLines={1}>
                {v.label}
              </AppText>
              <AppText style={styles.modeHint}>{modeHint}</AppText>
            </Pressable>
          );
        })}
      </View>
      {vehicleTouched && vehicleMsg ? (
        <AppText
          style={styles.fieldError}
          accessibilityLiveRegion="polite"
          accessibilityLabel={vehicleMsg}>
          {vehicleMsg}
        </AppText>
      ) : null}
      <View style={styles.field}>
        <LabeledInput
          label="Vehicle registration number"
          value={activeReg}
          onChangeText={v => {
            setRegTouched(true);
            setFormError('');
            const next = v.toUpperCase().slice(0, VEHICLE_REG_MAX);
            if (phase === 'edit') {
              setDraftReg(next);
            } else {
              actions.setObVehicleNo(next);
            }
          }}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={VEHICLE_REG_MAX}
          placeholder="KA 01 AB 1234"
          style={[
            styles.regInput,
            regTouched && regMsg ? styles.inputInvalid : null,
          ]}
        />
        {regTouched && regMsg ? (
          <AppText style={styles.fieldError}>{regMsg}</AppText>
        ) : null}
      </View>
      {!!formError && <AppText style={styles.error}>{formError}</AppText>}
    </>
  );

  const footer =
    phase === 'saved' ? (
      <View style={styles.footerCol}>
        <PrimaryButton
          label="Continue"
          onPress={() => nav.navigate('ObHub')}
        />
        <OutlineButton
          label="Edit vehicle"
          tone="neutral"
          onPress={() => void startEdit()}
        />
      </View>
    ) : phase === 'edit' ? (
      <View style={styles.footerCol}>
        <PrimaryButton
          label={saving ? 'Saving…' : 'Save changes'}
          onPress={() => void onConfirm()}
          disabled={!valid || saving}
        />
        <OutlineButton label="Cancel" tone="neutral" onPress={cancelEdit} />
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
      step={2}
      totalSteps={5}
      title="Your vehicle"
      subtitle={
        phase === 'saved'
          ? 'Vehicle details are saved'
          : phase === 'edit'
            ? 'Update your vehicle'
            : 'Choose your vehicle — this sets Standard or Bulk orders'
      }
      onBack={() => nav.goBack()}
      footer={footer}>
      {phase === 'saved' && saved ? (
        <SavedSummaryCard
          title="Vehicle saved"
          fields={[
            {label: 'Type', value: vehicleLabel(saved.type)},
            {label: 'Delivery', value: deliveryLabel(saved.type)},
            {label: 'Registration', value: saved.reg},
          ]}
        />
      ) : (
        renderPicker()
      )}
    </ObStepLayout>
  );
}

const styles = StyleSheet.create({
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 11},
  gridStack: {flexDirection: 'column'},
  card: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 18,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    minWidth: 0,
  },
  cardHalf: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 140,
  },
  cardFull: {width: '100%'},
  icon: {fontSize: 30},
  label: {fontWeight: '700', fontSize: 13, color: colors.ink, minWidth: 0},
  modeHint: {fontWeight: '600', fontSize: 11, color: colors.textMuted},
  field: {marginTop: 22},
  regInput: {fontWeight: '700', letterSpacing: 1},
  inputInvalid: {borderColor: colors.danger},
  fieldError: {
    fontWeight: '600',
    fontSize: 12,
    color: colors.danger,
    marginTop: 8,
  },
  error: {fontWeight: '600', fontSize: 13, color: colors.danger, marginTop: 12},
  footerCol: {gap: 10},
});
