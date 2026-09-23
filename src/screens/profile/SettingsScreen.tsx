import React, {useCallback, useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Screen} from '../../components/common/Screen';
import {AppText} from '../../components/common/AppText';
import {AppIcon, type AppIconName} from '../../components/common/AppIcon';
import {ScreenHeader} from '../../components/headers/ScreenHeader';
import {ToggleSwitch} from '../../components/inputs/ToggleSwitch';
import {useAppNavigation} from '../../hooks/useAppNavigation';
import {useRider} from '../../store/RiderContext';
import {configApi} from '../../services/api';
import {SETTINGS_ROWS} from '../../mock';
import {useAppConfig} from '../../hooks/useAppConfig';
import {normalizeLanguage} from '../../config/appConfig';
import {colors, radius} from '../../theme';

export function SettingsScreen() {
  const nav = useAppNavigation();
  const {state, actions} = useRider();
  const cfg = useAppConfig();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [toggleBusy, setToggleBusy] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const result = await configApi.getPreferences();
    if (result.ok && result.data) {
      const p = result.data;
      actions.patch({
        toggles: {
          push: p.pushNotifications,
          location: p.locationSharing,
          sound: p.orderSoundAlerts,
        },
        language: normalizeLanguage(p.language || state.language),
      });
      setLoading(false);
      return;
    }
    setLoadError(result.error || 'Could not load settings');
    setLoading(false);
  }, [actions, state.language]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onToggle = async (id: 'push' | 'location' | 'sound') => {
    if (toggleBusy) {
      return;
    }
    setToggleBusy(id);
    setToggleError('');
    const result = await actions.toggleSetting(id);
    setToggleBusy(null);
    if (!result.ok) {
      setToggleError(result.error || 'Could not update settings. Try again.');
    }
  };

  return (
    <Screen background={colors.white} contentContainerStyle={styles.body}>
      <ScreenHeader title="Settings" onBack={() => nav.goBack()} />
      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          color={colors.primary}
          size="large"
        />
      ) : loadError ? (
        <Pressable onPress={() => void load()} style={styles.errorWrap}>
          <AppText style={styles.error}>{loadError} · Retry</AppText>
        </Pressable>
      ) : (
        <>
          {!!toggleError && (
            <Pressable onPress={() => setToggleError('')}>
              <AppText style={styles.error}>{toggleError}</AppText>
            </Pressable>
          )}
          <View style={styles.card}>
            {SETTINGS_ROWS.map((r, i) => {
              const isToggle = r.kind === 'toggle';
              const on = isToggle
                ? state.toggles[r.id as 'push' | 'location' | 'sound']
                : false;
              const value =
                r.id === 'version' ? cfg.appVersion : undefined;
              const rowBusy = toggleBusy === r.id;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => {
                    if (isToggle) {
                      void onToggle(r.id as 'push' | 'location' | 'sound');
                    }
                  }}
                  disabled={!!toggleBusy && isToggle}
                  style={[
                    styles.row,
                    i < SETTINGS_ROWS.length - 1 && styles.rowBorder,
                  ]}>
                  <AppIcon
                    name={r.icon as AppIconName}
                    size={16}
                    color={colors.primary}
                    tile={{size: 34, radius: 10, bg: colors.fieldBg2}}
                  />
                  <AppText style={styles.label}>
                    {rowBusy ? `${r.label}…` : r.label}
                  </AppText>
                  {isToggle && (
                    <ToggleSwitch
                      value={on}
                      onToggle={() =>
                        void onToggle(r.id as 'push' | 'location' | 'sound')
                      }
                    />
                  )}
                  {r.kind === 'value' && (
                    <AppText style={styles.value}>{value}</AppText>
                  )}
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
  errorWrap: {marginTop: 32},
  error: {
    fontWeight: '600',
    fontSize: 12,
    color: colors.danger,
    marginTop: 12,
    textAlign: 'center',
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginTop: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  rowBorder: {borderBottomWidth: 1, borderBottomColor: colors.divider},
  label: {flex: 1, fontWeight: '600', fontSize: 14, color: colors.ink},
  value: {fontWeight: '600', fontSize: 13, color: colors.textFaint},
});
