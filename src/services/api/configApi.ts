import type {
  AppConfigDto,
  CancelReasonDto,
  LegalDocumentDto,
  PreferencesDto,
} from '../../types/api';
import {request, type ApiResult} from './client';

export const configApi = {
  getConfig(
    platform?: 'ios' | 'android',
    appVersion?: string,
  ): Promise<ApiResult<AppConfigDto>> {
    const params = new URLSearchParams();
    if (platform) {
      params.set('platform', platform);
    }
    if (appVersion) {
      params.set('appVersion', appVersion);
    }
    const q = params.toString() ? `?${params.toString()}` : '';
    return request<AppConfigDto>(`/picker/config${q}`, {skipAuth: true});
  },

  getCancelReasons(
    context: 'standard' | 'bulk',
  ): Promise<ApiResult<{context: string; reasons: CancelReasonDto[]}>> {
    return request(`/picker/config/cancel-reasons?context=${context}`);
  },

  getTerms(): Promise<ApiResult<LegalDocumentDto>> {
    return request<LegalDocumentDto>('/picker/legal/terms', {skipAuth: true});
  },

  getPrivacy(): Promise<ApiResult<LegalDocumentDto>> {
    return request<LegalDocumentDto>('/picker/legal/privacy', {
      skipAuth: true,
    });
  },

  getPreferences(opts?: {
    soft?: boolean;
  }): Promise<ApiResult<PreferencesDto>> {
    return request<PreferencesDto>('/picker/settings/preferences', {
      // Soft mode avoids wiping a good session if prefs alone 401 during restore.
      skipUnauthorized: opts?.soft === true,
    });
  },

  updatePreferences(
    body: Partial<PreferencesDto>,
  ): Promise<ApiResult<PreferencesDto>> {
    return request<PreferencesDto>('/picker/settings/preferences', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  registerPushToken(
    token: string,
    platform: 'ios' | 'android',
    deviceId?: string,
    appVersion?: string,
  ): Promise<ApiResult<{registered: boolean; tokenId?: string}>> {
    return request('/picker/push-token', {
      method: 'POST',
      body: JSON.stringify({token, platform, deviceId, appVersion}),
    });
  },
};
