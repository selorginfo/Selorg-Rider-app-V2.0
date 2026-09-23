import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {ObStepLayout} from './ObStepLayout';
import {AppText} from '../../components/common/AppText';
import {SavedSummaryCard} from '../../components/common/SavedSummaryCard';
import {Banner} from '../../components/feedback/Banner';
import {RadioRow} from '../../components/inputs/RadioRow';
import {PrimaryButton} from '../../components/buttons/PrimaryButton';
import {OutlineButton} from '../../components/buttons/OutlineButton';
import {useAppNavigation} from '../../hooks/useAppNavigation';
import {useRider} from '../../store/RiderContext';
import {profileApi} from '../../services/api';
import {colors} from '../../theme';
import type {Hub} from '../../types';
import type {HubDto} from '../../types/api';

type Phase = 'form' | 'saved' | 'edit';

interface SavedHub {
  id: string;
  name: string;
  addr: string;
}

function mapApiHub(row: HubDto): Hub {
  const bays =
    row.dispatchBays != null ? `${row.dispatchBays} dispatch bays` : 'Darkstore hub';
  return {
    id: row.id,
    name: row.name,
    dist: row.distanceDisplay || '',
    addr: row.address || row.name,
    bays,
    latitude: row.coordinates?.latitude ?? row.coordinates?.lat ?? undefined,
    longitude: row.coordinates?.longitude ?? row.coordinates?.lng ?? undefined,
  };
}

export function ObHubScreen() {
  const nav = useAppNavigation();
  const {state, actions} = useRider();
  const [phase, setPhase] = useState<Phase>('form');
  const [saved, setSaved] = useState<SavedHub | null>(null);
  const [draftHubId, setDraftHubId] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hubs, setHubs] = useState<Hub[]>([]);

  const loadHubs = useCallback(async () => {
    setLoading(true);
    setError('');
    let coords: {lat: number; lng: number} | undefined;
    try {
      const {enableAndReadGps} = await import('../../services/location/locationTracker');
      const point = await enableAndReadGps();
      coords = {lat: point.latitude, lng: point.longitude};
    } catch {
      // Distance is optional when GPS/permission unavailable.
    }
    const result = await profileApi.listHubs(coords);
    if (!result.ok) {
      setHubs([]);
      setError(result.error || 'Could not load hubs');
      setLoading(false);
      return;
    }
    const rows = Array.isArray(result.data) ? result.data : [];
    // Prefer warehouse-style ids (DS-…) before legacy aliases when names collide.
    const mapped = rows.map(mapApiHub).sort((a, b) => {
      const aDs = a.id.startsWith('DS-') ? 0 : 1;
      const bDs = b.id.startsWith('DS-') ? 0 : 1;
      if (aDs !== bDs) {
        return aDs - bDs;
      }
      return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
    });
    setHubs(mapped);
    if (rows.length === 0) {
      setError('No hubs are available right now. Please try again later.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadHubs();
  }, [loadHubs]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await profileApi.getProfile();
      if (cancelled || !result.ok || !result.data?.hub?.id) {
        return;
      }
      const hub = result.data.hub;
      const match = hubs.find(h => h.id === hub.id);
      const next: SavedHub = {
        id: hub.id,
        name: hub.name || match?.name || hub.id,
        addr: match?.addr || hub.name || '',
      };
      actions.setObHub(hub.id);
      setSaved(next);
      setDraftHubId(hub.id);
      setPhase('saved');
    })();
    return () => {
      cancelled = true;
    };
  }, [actions, hubs]);

  const selectedId = phase === 'edit' ? draftHubId : state.obHub;
  const duplicateHubNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const h of hubs) {
      const key = h.name.trim().toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }, [hubs]);
  const hubTitle = (h: Hub) => {
    const key = h.name.trim().toLowerCase();
    if ((duplicateHubNames.get(key) || 0) > 1) {
      return `${h.name} · ${h.id}`;
    }
    return h.name;
  };

  const persist = async (hubId: string) => {
    const result = await profileApi.updateProfile({hubId});
    if (!result.ok) {
      return {ok: false as const, error: result.error || 'Could not save hub'};
    }
    const fromApi = result.data?.hub;
    const match = hubs.find(h => h.id === (fromApi?.id || hubId));
    const next: SavedHub = {
      id: fromApi?.id || hubId,
      name: fromApi?.name || match?.name || hubId,
      addr: match?.addr || fromApi?.name || '',
    };
    actions.setObHub(next.id);
    actions.patch({epHubId: next.id, epHubName: next.name});
    setSaved(next);
    setDraftHubId(next.id);
    return {ok: true as const};
  };

  const onConfirm = async () => {
    if (!selectedId || saving) {
      return;
    }
    setSaving(true);
    setError('');
    const result = await persist(selectedId);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPhase('saved');
  };

  const startEdit = async () => {
    setError('');
    setSaving(true);
    const result = await profileApi.getProfile();
    setSaving(false);
    if (result.ok && result.data?.hub?.id) {
      setDraftHubId(result.data.hub.id);
    } else if (saved) {
      setDraftHubId(saved.id);
    }
    setPhase('edit');
  };

  const cancelEdit = () => {
    setError('');
    if (saved) {
      setDraftHubId(saved.id);
      actions.setObHub(saved.id);
    }
    setPhase('saved');
  };

  const footer =
    phase === 'saved' ? (
      <View style={styles.footerCol}>
        <PrimaryButton
          label="Continue"
          onPress={() => {
            void (async () => {
              const hubId = saved?.id || state.obHub;
              actions.patch({epHubId: hubId});
              if (state.accountStatus === 'approved' || state.onboarded) {
                const profile = await profileApi.getProfile();
                const vehicleType = profile.ok ? profile.data?.vehicle?.type : '';
                if (!vehicleType) {
                  nav.navigate('ObVehicle');
                  return;
                }
                nav.navigate('Main');
                return;
              }
              nav.navigate('ObKyc');
            })();
          }}
        />
        <OutlineButton
          label="Change hub"
          tone="neutral"
          onPress={() => void startEdit()}
        />
      </View>
    ) : phase === 'edit' ? (
      <View style={styles.footerCol}>
        <PrimaryButton
          label={saving ? 'Saving…' : 'Save changes'}
          onPress={() => void onConfirm()}
          disabled={!selectedId || saving || loading || hubs.length === 0}
        />
        <OutlineButton label="Cancel" tone="neutral" onPress={cancelEdit} />
      </View>
    ) : (
      <PrimaryButton
        label={saving ? 'Saving…' : 'Confirm & save'}
        onPress={() => void onConfirm()}
        disabled={!selectedId || saving || loading || hubs.length === 0}
      />
    );

  return (
    <ObStepLayout
      step={3}
      totalSteps={5}
      title="Choose your hub"
      subtitle={
        phase === 'saved'
          ? 'Your hub is saved'
          : phase === 'edit'
            ? 'Pick a different hub'
            : "Pick the darkstore you'll ride from"
      }
      onBack={() => nav.goBack()}
      footer={footer}>
      {phase === 'saved' && saved ? (
        <SavedSummaryCard
          title="Hub saved"
          fields={[
            {label: 'Hub', value: saved.name},
            {label: 'Address', value: saved.addr},
          ]}
        />
      ) : (
        <View>
          <Banner
            tone="info"
            icon="🏬"
            text="Select the same darkstore that packs your orders"
          />
          {loading && (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          )}
          {!!error && <AppText style={styles.empty}>{error}</AppText>}
          {!loading && hubs.length === 0 && !error && (
            <AppText style={styles.empty}>No hubs found.</AppText>
          )}
          <View style={styles.list}>
            {hubs.map(h => (
              <RadioRow
                key={h.id}
                title={hubTitle(h)}
                subtitle={[
                  h.id,
                  h.addr !== h.id && h.addr !== h.name ? h.addr : null,
                  h.dist ? `${h.dist} away` : null,
                  h.bays,
                ]
                  .filter(Boolean)
                  .join('\n')}
                selected={selectedId === h.id}
                onPress={() => {
                  setError('');
                  if (phase === 'edit') {
                    setDraftHubId(h.id);
                  } else {
                    actions.setObHub(h.id);
                  }
                }}
              />
            ))}
          </View>
          {!loading &&
            (error || hubs.length === 0) && (
              <PrimaryButton
                label="Retry"
                onPress={() => void loadHubs()}
                disabled={loading}
                style={styles.retry}
              />
            )}
        </View>
      )}
    </ObStepLayout>
  );
}

const styles = StyleSheet.create({
  list: {gap: 10, marginTop: 12},
  empty: {color: colors.danger, marginTop: 8},
  loader: {marginTop: 16},
  retry: {marginTop: 16},
  footerCol: {gap: 10},
});
