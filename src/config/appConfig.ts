import {Platform} from 'react-native';
import {environment} from './environment';
import type {AppConfigDto} from '../types/api';

export type RuntimeAppConfig = {
  otpLength: number;
  otpResendSeconds: number;
  codDepositLimit: number;
  supportPhone: string;
  supportEmail: string;
  supportHours: string;
  supportEmailSlaHours: number;
  appVersion: string;
  minSupportedVersion: string;
  latestVersion: string;
  forceUpdate: boolean;
  updateUrl: string | null;
  bulkDeliveryEnabled: boolean;
  emailLoginEnabled: boolean;
  locationPingSeconds: number;
  languages: Array<{id: string; native: string; en: string}>;
};

const listeners = new Set<() => void>();

let runtime: RuntimeAppConfig = {
  otpLength: environment.otpLength,
  otpResendSeconds: 24,
  codDepositLimit: environment.codDepositLimit,
  supportPhone: environment.supportPhone,
  supportEmail: environment.supportEmail,
  supportHours: '24×7',
  supportEmailSlaHours: 4,
  appVersion: environment.appVersion,
  minSupportedVersion: '1.0.0',
  latestVersion: environment.appVersion,
  forceUpdate: false,
  updateUrl: null,
  bulkDeliveryEnabled: true,
  emailLoginEnabled: true,
  locationPingSeconds: 15,
  languages: [
    {id: 'en', native: 'English', en: 'English'},
    {id: 'hi', native: 'हिन्दी', en: 'Hindi'},
    {id: 'kn', native: 'ಕನ್ನಡ', en: 'Kannada'},
    {id: 'ta', native: 'தமிழ்', en: 'Tamil'},
    {id: 'te', native: 'తెలుగు', en: 'Telugu'},
  ],
};

export function getAppConfig(): RuntimeAppConfig {
  return runtime;
}

export function normalizeLanguage(code?: string | null): string {
  const langs = runtime.languages;
  if (code && langs.some(l => l.id === code)) {
    return code;
  }
  const byName = langs.find(
    l => l.en === code || l.native === code || l.id === String(code || '').toLowerCase(),
  );
  return byName?.id || 'en';
}

export function subscribeAppConfig(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(): void {
  listeners.forEach(fn => fn());
}

export function applyRemoteConfig(dto: AppConfigDto | null | undefined): RuntimeAppConfig {
  if (!dto) {
    return runtime;
  }
  const languages = Array.isArray(dto.languages)
    ? dto.languages.map(l => ({
        id: l.code || l.id || 'en',
        native: l.native || l.code || l.id || 'English',
        en: l.english || l.en || l.code || l.id || 'English',
      }))
    : runtime.languages;

  runtime = {
    otpLength: dto.otpLength ?? runtime.otpLength,
    otpResendSeconds: dto.otpResendSeconds ?? runtime.otpResendSeconds,
    codDepositLimit: dto.codDepositLimit ?? runtime.codDepositLimit,
    supportPhone: dto.support?.phone ?? runtime.supportPhone,
    supportEmail: dto.support?.email ?? runtime.supportEmail,
    supportHours: dto.support?.hours ?? runtime.supportHours,
    supportEmailSlaHours: dto.support?.emailSlaHours ?? runtime.supportEmailSlaHours,
    appVersion: environment.appVersion,
    minSupportedVersion:
      dto.app?.minSupportedVersion ?? runtime.minSupportedVersion,
    latestVersion: dto.app?.latestVersion ?? runtime.latestVersion,
    forceUpdate: !!dto.app?.forceUpdate,
    updateUrl: dto.app?.updateUrl ?? runtime.updateUrl,
    bulkDeliveryEnabled: dto.features?.bulkDelivery !== false,
    // Keep prior value when remote omits the flag — flipping true→false
    // remounts Login method UI and feels like a page reload.
    emailLoginEnabled:
      dto.features?.emailLogin !== undefined
        ? dto.features.emailLogin === true
        : runtime.emailLoginEnabled,
    locationPingSeconds:
      dto.locationPingSeconds ?? runtime.locationPingSeconds,
    languages: languages.length > 0 ? languages : runtime.languages,
  };
  notify();
  return runtime;
}

export function configQueryParams(): {platform: 'ios' | 'android'; appVersion: string} {
  return {
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    appVersion: environment.appVersion.replace(/^v/i, ''),
  };
}
