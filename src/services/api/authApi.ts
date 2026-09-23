import type {LoginMethod} from '../../types';
import type {RefreshTokenData, VerifyOtpData} from '../../types/api';
import {
  clearToken,
  request,
  saveToken,
  type ApiResult,
} from './client';
import {storageService, STORAGE_KEYS} from '../storage/storageService';

function isEmail(target: string): boolean {
  return target.includes('@');
}

function normalizeTarget(method: LoginMethod, target: string): string {
  const t = target.trim();
  if (method === 'email' || t.includes('@')) {
    return t.toLowerCase();
  }
  return t.replace(/\D/g, '').slice(-10);
}

export type SendOtpData = {
  channel?: string;
  message?: string;
  deliveryStatus?: 'sent' | 'failed';
};

export type CheckAccountData = {
  exists?: boolean;
  canLogin?: boolean;
  next?: 'OTP' | 'CREATE_ACCOUNT' | 'LOGIN';
  message?: string;
  phoneRegistered?: boolean;
  emailRegistered?: boolean;
};

/**
 * Backend must never return a usable OTP to the client. Strip it if present.
 * Treat deliveryStatus === 'failed' as a hard send failure.
 */
function normalizeSendOtpResult(
  result: ApiResult<SendOtpData>,
): ApiResult<SendOtpData> {
  if (!result.ok) {
    return result;
  }
  const data = result.data;
  if (data && typeof data === 'object') {
    const copy = {...data} as SendOtpData & {otp?: unknown};
    delete copy.otp;
    result.data = copy;
    if (copy.deliveryStatus === 'failed') {
      const channel = String(copy.channel || '').toLowerCase();
      const mobilePaused = channel === 'sms' || channel === 'whatsapp';
      const pausedMessage =
        'Mobile OTP is unavailable right now. Use Email to sign in.';
      const raw = String(copy.message || '');
      const error = mobilePaused
        ? pausedMessage
        : /sent successfully/i.test(raw)
          ? 'Unable to send OTP. Please try again.'
          : raw || 'Unable to send OTP. Please try again.';
      return {
        ok: false,
        data: copy,
        error,
        appCode: 'OTP_PROVIDER_ERROR',
        status: 502,
      };
    }
  }
  return result;
}

export interface AuthApi {
  checkAccount(
    method: LoginMethod,
    target: string,
  ): Promise<ApiResult<CheckAccountData>>;
  checkRegistration(
    phone: string,
    email: string,
  ): Promise<ApiResult<CheckAccountData>>;
  sendOtp(method: LoginMethod, target: string): Promise<ApiResult<SendOtpData>>;
  resendOtp(
    method: LoginMethod,
    target: string,
  ): Promise<ApiResult<SendOtpData>>;
  sendRegistrationOtp(
    phone: string,
    email: string,
  ): Promise<ApiResult<SendOtpData>>;
  resendRegistrationOtp(
    phone: string,
    email: string,
  ): Promise<ApiResult<SendOtpData>>;
  verifyOtp(
    method: LoginMethod,
    target: string,
    otp: string,
  ): Promise<ApiResult<VerifyOtpData>>;
  verifyRegistrationOtp(
    phone: string,
    email: string,
    otp: string,
  ): Promise<ApiResult<VerifyOtpData>>;
  refresh(): Promise<ApiResult<RefreshTokenData>>;
  logout(): Promise<ApiResult<{loggedOut: boolean}>>;
}

export const authApi: AuthApi = {
  async checkAccount(method, target) {
    const normalized = normalizeTarget(method, target);
    const loginType =
      method === 'email' || isEmail(normalized) ? 'email' : 'phone';
    return request<CheckAccountData>('/picker/auth/check-account', {
      method: 'POST',
      body: JSON.stringify({loginType, value: normalized}),
      skipAuth: true,
    });
  },

  async checkRegistration(phone, email) {
    return request<CheckAccountData>('/picker/auth/check-registration', {
      method: 'POST',
      body: JSON.stringify({
        phone: phone.replace(/\D/g, '').slice(-10),
        email: email.trim().toLowerCase(),
      }),
      skipAuth: true,
    });
  },

  async sendOtp(method, target) {
    const normalized = normalizeTarget(method, target);
    const result =
      method === 'email' || isEmail(normalized)
        ? await request<SendOtpData>('/picker/auth/send-otp-email', {
            method: 'POST',
            body: JSON.stringify({email: normalized, purpose: 'LOGIN'}),
            skipAuth: true,
          })
        : await request<SendOtpData>('/picker/auth/send-otp', {
            method: 'POST',
            body: JSON.stringify({
              phone: normalized,
              preferredChannel: method === 'whatsapp' ? 'whatsapp' : 'sms',
              purpose: 'LOGIN',
            }),
            skipAuth: true,
          });
    return normalizeSendOtpResult(result);
  },

  async resendOtp(method, target) {
    const normalized = normalizeTarget(method, target);
    const result =
      method === 'email' || isEmail(normalized)
        ? await request<SendOtpData>('/picker/auth/resend-otp-email', {
            method: 'POST',
            body: JSON.stringify({email: normalized, purpose: 'LOGIN'}),
            skipAuth: true,
          })
        : await request<SendOtpData>('/picker/auth/resend-otp', {
            method: 'POST',
            body: JSON.stringify({
              phone: normalized,
              preferredChannel: method === 'whatsapp' ? 'whatsapp' : 'sms',
              purpose: 'LOGIN',
            }),
            skipAuth: true,
          });
    return normalizeSendOtpResult(result);
  },

  async sendRegistrationOtp(phone, email) {
    const result = await request<SendOtpData>(
      '/picker/auth/send-registration-otp',
      {
        method: 'POST',
        body: JSON.stringify({
          phone: phone.replace(/\D/g, '').slice(-10),
          email: email.trim().toLowerCase(),
        }),
        skipAuth: true,
      },
    );
    return normalizeSendOtpResult(result);
  },

  async resendRegistrationOtp(phone, email) {
    const result = await request<SendOtpData>(
      '/picker/auth/resend-registration-otp',
      {
        method: 'POST',
        body: JSON.stringify({
          phone: phone.replace(/\D/g, '').slice(-10),
          email: email.trim().toLowerCase(),
        }),
        skipAuth: true,
      },
    );
    return normalizeSendOtpResult(result);
  },

  async verifyOtp(method, target, otp) {
    const body =
      method === 'email' || isEmail(target)
        ? {
            email: normalizeTarget(method, target),
            otp,
            purpose: 'LOGIN',
            intent: 'login',
          }
        : {
            phone: normalizeTarget(method, target),
            otp,
            preferredChannel: method === 'whatsapp' ? 'whatsapp' : 'sms',
            purpose: 'LOGIN',
            intent: 'login',
          };

    const path =
      method === 'email' || isEmail(target)
        ? '/picker/auth/verify-otp-email'
        : '/picker/auth/verify-otp';

    const result = await request<VerifyOtpData>(path, {
      method: 'POST',
      body: JSON.stringify(body),
      skipAuth: true,
    });

    if (result.ok && result.data?.token) {
      if (result.data.user?.workforceRole === 'picker') {
        await clearToken();
        await storageService.remove(STORAGE_KEYS.user);
        return {
          ok: false,
          data: result.data,
          error:
            'This account is registered as a picker. Please use the Picker app.',
          status: 403,
          appCode: 'ROLE_MISMATCH',
        };
      }
      await saveToken(result.data.token);
      if (result.data.user) {
        await storageService.set(
          STORAGE_KEYS.user,
          JSON.stringify(result.data.user),
        );
      }
    }
    return result;
  },

  async verifyRegistrationOtp(phone, email, otp) {
    const result = await request<VerifyOtpData>(
      '/picker/auth/verify-registration-otp',
      {
        method: 'POST',
        body: JSON.stringify({
          phone: phone.replace(/\D/g, '').slice(-10),
          email: email.trim().toLowerCase(),
          otp,
          workforceRole: 'rider',
        }),
        skipAuth: true,
      },
    );
    if (result.ok && result.data?.token) {
      if (result.data.user?.workforceRole === 'picker') {
        await clearToken();
        await storageService.remove(STORAGE_KEYS.user);
        return {
          ok: false,
          data: result.data,
          error:
            'This account is registered as a picker. Please use the Picker app.',
          status: 403,
          appCode: 'ROLE_MISMATCH',
        };
      }
      await saveToken(result.data.token);
      if (result.data.user) {
        await storageService.set(
          STORAGE_KEYS.user,
          JSON.stringify(result.data.user),
        );
      }
    }
    return result;
  },

  async refresh() {
    const result = await request<RefreshTokenData>('/picker/auth/refresh', {
      method: 'POST',
      skipRefresh: true,
    });
    if (result.ok && result.data?.token) {
      await saveToken(result.data.token);
    }
    return result;
  },

  async logout() {
    const result = await request<{loggedOut: boolean}>('/picker/auth/logout', {
      method: 'POST',
      skipRefresh: true,
    });
    await clearToken();
    await storageService.remove(STORAGE_KEYS.user);
    return result;
  },
};
