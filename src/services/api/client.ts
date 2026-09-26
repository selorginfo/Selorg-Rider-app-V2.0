import {environment} from '../../config/environment';
import type {ServiceEnvelope} from '../../types/api';
import {storageService, STORAGE_KEYS} from '../storage/storageService';

export const API_BASE_URL = environment.apiBaseUrl;

function apiHosts(): string[] {
  const hosts = environment.apiBaseUrls?.filter(Boolean) ?? [];
  if (hosts.length > 0) {
    return hosts;
  }
  return API_BASE_URL ? [API_BASE_URL] : [];
}

function isAbortError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === 'AbortError' || err.message.includes('aborted'))
  );
}

async function fetchWithHostFallback(
  path: string,
  init: RequestInit,
): Promise<{res: Response} | {networkError: true; aborted: boolean}> {
  // Prefer the primary host. On a hard network failure (wrong host / no reverse),
  // try the next candidate once so physical devices can fall back to LAN IP.
  const hosts = apiHosts().slice(0, 3);
  if (hosts.length === 0) {
    return {networkError: true, aborted: false};
  }

  let lastAborted = false;
  for (let i = 0; i < hosts.length; i += 1) {
    const host = hosts[i];
    const controller = new AbortController();
    // Keep retries short so a dead first host does not stall OTP for 20s+.
    const timeoutMs =
      i === 0
        ? Math.min(environment.requestTimeoutMs, 8000)
        : Math.min(environment.requestTimeoutMs, 4000);
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${host}${path}`, {
        ...init,
        signal: init.signal ?? controller.signal,
      });
      clearTimeout(timer);
      if (__DEV__ && i > 0) {
        console.log('[SelorgRider] API host fallback succeeded:', host);
      }
      return {res};
    } catch (err) {
      clearTimeout(timer);
      lastAborted = isAbortError(err);
      if (__DEV__) {
        console.warn(
          '[SelorgRider] API host failed:',
          host,
          lastAborted ? '(timeout)' : '(network)',
        );
      }
    }
  }
  return {networkError: true, aborted: lastAborted};
}

let _token: string | null = null;
let _refreshing: Promise<boolean> | null = null;
let _onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  _onUnauthorized = handler;
}

export function saveToken(token: string): Promise<void> {
  _token = token;
  return storageService.set(STORAGE_KEYS.token, token);
}

export function getToken(): string | null {
  return _token;
}

export async function clearToken(): Promise<void> {
  _token = null;
  await storageService.remove(STORAGE_KEYS.token);
}

export async function hydrateToken(): Promise<string | null> {
  const stored = await storageService.get(STORAGE_KEYS.token);
  // AsyncStorage may return a JSON-encoded string from older writes.
  let token = stored;
  if (token && token.length >= 2 && token.startsWith('"') && token.endsWith('"')) {
    try {
      const parsed = JSON.parse(token);
      if (typeof parsed === 'string' && parsed) {
        token = parsed;
      }
    } catch {
      // keep raw
    }
  }
  _token = token;
  return token;
}

function authHeaders(): Record<string, string> {
  return _token ? {Authorization: `Bearer ${_token}`} : {};
}

export function newIdempotencyKey(): string {
  return `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface PaginationMeta {
  total?: number;
  page?: number;
  limit?: number;
  pages?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

export interface ApiResult<T> {
  ok: boolean;
  data: T;
  error?: string;
  status?: number;
  appCode?: string;
  pagination?: PaginationMeta | null;
}

function formatValidationDetails(details: unknown): string | null {
  const rows = Array.isArray(details)
    ? details
    : details &&
        typeof details === 'object' &&
        Array.isArray((details as {validationDetails?: unknown}).validationDetails)
      ? (details as {validationDetails: unknown[]}).validationDetails
      : null;
  if (!rows || rows.length === 0) {
    return null;
  }
  const messages = rows
    .map(row => {
      if (typeof row === 'string') {
        return row;
      }
      if (!row || typeof row !== 'object') {
        return null;
      }
      const r = row as {message?: string; reason?: string; field?: string; step?: string};
      return r.message || r.reason || (r.field ? `${r.field} is invalid` : null) || (r.step ? `${r.step} is incomplete` : null);
    })
    .filter((x): x is string => Boolean(x));
  return messages.length > 0 ? messages.join(' · ') : null;
}

function formatOnboardingIncomplete(details: unknown): string | null {
  const rows = Array.isArray(details)
    ? details
    : details &&
        typeof details === 'object' &&
        Array.isArray((details as {validationDetails?: unknown}).validationDetails)
      ? (details as {validationDetails: unknown[]}).validationDetails
      : null;
  if (!rows || rows.length === 0) {
    return null;
  }
  const reasons = rows
    .map(row => {
      if (!row || typeof row !== 'object') {
        return null;
      }
      const r = row as {reason?: string; step?: string};
      return r.reason || (r.step ? `${r.step} is incomplete` : null);
    })
    .filter((x): x is string => Boolean(x));
  return reasons.length > 0 ? reasons.join(' · ') : null;
}

function friendlyMessage(status: number, msg?: string, appCode?: string, details?: unknown): string {
  if (appCode === 'ONBOARDING_INCOMPLETE') {
    return (
      formatOnboardingIncomplete(details) ||
      msg ||
      'Some onboarding steps are still incomplete.'
    );
  }
  if (appCode === 'INCORRECT_OTP') {
    return 'Incorrect code. Please try again.';
  }
  if (appCode === 'OTP_EXPIRED') {
    return 'Code expired. Request a new one.';
  }
  if (appCode === 'OTP_RATE_LIMITED') {
    return msg || 'Too many attempts. Please wait and try again.';
  }
  if (
    appCode === 'OTP_PROVIDER_ERROR' ||
    appCode === 'SMS_GATEWAY_ERROR' ||
    appCode === 'SMS_SENDER_NOT_PROVISIONED' ||
    appCode === 'EMAIL_PROVIDER_ERROR' ||
    appCode === 'EMAIL_GATEWAY_ERROR' ||
    appCode === 'EMAIL_NOT_CONFIGURED'
  ) {
    return msg || 'Unable to send OTP. Please try again.';
  }
  if (appCode === 'INVALID_PHONE') {
    return msg || 'Enter a valid 10-digit mobile number.';
  }
  if (appCode === 'INVALID_EMAIL') {
    return msg || 'Enter a valid email address.';
  }
  if (appCode === 'ACCOUNT_NOT_FOUND') {
    return (
      msg ||
      "We couldn't find an account for these details. Try Create Account instead."
    );
  }
  if (appCode === 'ACCOUNT_SUSPENDED') {
    return 'Your rider account is currently suspended. Please contact support.';
  }
  if (appCode === 'ACCOUNT_INACTIVE') {
    return 'Your rider account is inactive. Please contact support.';
  }
  if (appCode === 'ACCOUNT_BLOCKED') {
    return 'Your rider account has been blocked. Please contact support.';
  }
  if (appCode === 'ACCOUNT_DELETION_PENDING') {
    return 'Your rider account is scheduled for deletion.';
  }
  if (appCode === 'ACCOUNT_REJECTED') {
    return msg || 'Your rider application was not approved.';
  }
  if (appCode === 'ACCOUNT_PENDING') {
    return msg || 'Your rider account is pending approval.';
  }
  if (appCode === 'ACCOUNT_NOT_FOUND') {
    return (
      msg ||
      'No rider account found. Please create an account first.'
    );
  }
  if (appCode === 'PHONE_ALREADY_REGISTERED') {
    return (
      msg ||
      'This phone number is already registered. Please login using this number instead.'
    );
  }
  if (appCode === 'EMAIL_ALREADY_REGISTERED') {
    return (
      msg ||
      'This email address is already registered. Please login using this email instead.'
    );
  }
  if (appCode === 'PHONE_AND_EMAIL_ALREADY_REGISTERED') {
    return (
      msg ||
      'This phone number and email address are already registered. Please login instead.'
    );
  }
  if (appCode === 'INVALID_OTP' || appCode === 'INCORRECT_OTP') {
    return msg || 'Invalid OTP. Please try again.';
  }
  if (appCode === 'OTP_EXPIRED') {
    return msg || 'OTP has expired. Please request a new code.';
  }
  if (appCode === 'OTP_TOO_MANY_ATTEMPTS' || appCode === 'OTP_RATE_LIMITED') {
    return msg || 'Too many incorrect attempts. Please request a new code.';
  }
  if (
    /valid enum value|CastError|ValidationError|E11000|MongoServerError|duplicate key/i.test(
      msg || '',
    )
  ) {
    return 'Something went wrong. Please try again.';
  }
  if (appCode === 'RIDER_OFFLINE') {
    return 'Go online to see available orders.';
  }
  if (appCode === 'ORDER_ALREADY_ASSIGNED') {
    return 'Another rider has already accepted this order.';
  }
  if (appCode === 'ORDER_OUT_OF_RADIUS') {
    return 'This order is outside your 5 km delivery radius.';
  }
  if (appCode === 'COD_TRANSFER_REQUIRED' || appCode === 'UNDEPOSITED_CASH') {
    return (
      msg ||
      'Transfer your COD cash to the company before continuing.'
    );
  }
  if (status === 401) {
    return 'Session expired. Please sign in again.';
  }
  if (status === 403) {
    return msg || 'You do not have permission for this action.';
  }
  if (status === 404) {
    return msg || 'Not found.';
  }
  if (status === 409) {
    return msg || 'This action conflicts with the current state.';
  }
  if (appCode === 'VALIDATION_ERROR' || status === 422) {
    return (
      formatValidationDetails(details) ||
      msg ||
      'Please check your input and try again.'
    );
  }
  if (status === 413 || appCode === 'FILE_TOO_LARGE') {
    return msg || 'File is too large. Use an image under 10 MB.';
  }
  if (status === 415 || appCode === 'UNSUPPORTED_MEDIA_TYPE') {
    return msg || 'Use a JPG, PNG, WEBP, or HEIC image.';
  }
  if (status === 429) {
    return msg || 'Too many attempts. Please wait and try again.';
  }
  if (status >= 500) {
    return 'Server error. Please try again shortly.';
  }
  if (status === 0) {
    return 'Network error. Check your connection and try again.';
  }
  return msg || `Request failed (${status})`;
}

async function parseEnvelope<T>(res: Response): Promise<{
  envelope: ServiceEnvelope<T> | null;
  rawText: string;
}> {
  const rawText = await res.text();
  if (!rawText) {
    return {envelope: null, rawText: ''};
  }
  try {
    return {envelope: JSON.parse(rawText) as ServiceEnvelope<T>, rawText};
  } catch {
    return {envelope: null, rawText};
  }
}

async function tryRefreshToken(): Promise<boolean> {
  if (!_token) {
    return false;
  }
  if (_refreshing) {
    return _refreshing;
  }
  _refreshing = (async () => {
    try {
      const fetched = await fetchWithHostFallback('/picker/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-selorg-client': 'rider',
          Authorization: `Bearer ${_token}`,
        },
      });
      if ('networkError' in fetched) {
        return false;
      }
      const {envelope} = await parseEnvelope<{token: string}>(fetched.res);
      if (envelope?.success && envelope.data?.token) {
        await saveToken(envelope.data.token);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      _refreshing = null;
    }
  })();
  return _refreshing;
}

export type RequestOptions = RequestInit & {
  skipAuth?: boolean;
  skipRefresh?: boolean;
  /** On 401 after refresh fail, return error without global logout. */
  skipUnauthorized?: boolean;
  idempotent?: boolean;
};

export async function request<T>(
  path: string,
  init?: RequestOptions,
): Promise<ApiResult<T>> {
  const {
    headers: extraHeaders,
    skipAuth,
    skipRefresh,
    skipUnauthorized,
    idempotent,
    ...restInit
  } = init ?? {};

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-selorg-client': 'rider',
    ...(skipAuth ? {} : authHeaders()),
    ...(extraHeaders as Record<string, string> | undefined),
  };

  if (idempotent && !headers['Idempotency-Key']) {
    headers['Idempotency-Key'] = newIdempotencyKey();
  }

  const fetched = await fetchWithHostFallback(path, {
    ...restInit,
    headers,
  });
  if ('networkError' in fetched) {
    return {
      ok: false,
      data: null as unknown as T,
      error: fetched.aborted
        ? 'Request timed out. Please try again.'
        : 'Network unavailable.',
      status: 0,
      appCode: fetched.aborted ? 'TIMEOUT' : 'NETWORK_UNAVAILABLE',
    };
  }
  const res = fetched.res;

  if (res.status === 401 && !skipAuth && !skipRefresh) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return request<T>(path, {...init, skipRefresh: true});
    }
    if (!skipUnauthorized) {
      void clearToken();
      _onUnauthorized?.();
    }
    return {
      ok: false,
      data: null as unknown as T,
      error: friendlyMessage(401),
      status: 401,
      appCode: 'AUTH_SESSION_EXPIRED',
    };
  }

  const {envelope} = await parseEnvelope<T>(res);

  if (!envelope) {
    return {
      ok: false,
      data: null as unknown as T,
      error: friendlyMessage(res.status, `Unexpected response (${res.status})`),
      status: res.status,
    };
  }

  const appCode =
    typeof envelope.error?.appCode === 'string'
      ? envelope.error.appCode
      : typeof envelope.error?.code === 'string'
      ? envelope.error.code
      : undefined;

  if (envelope.success) {
    return {
      ok: true,
      data: (envelope.data ?? null) as T,
      status: res.status,
      pagination: (envelope.pagination as PaginationMeta | null) ?? null,
    };
  }

  const errMsg = friendlyMessage(
    res.status,
    envelope.error?.message || envelope.message,
    appCode,
    (envelope.error as {details?: unknown} | null)?.details,
  );
  return {
    ok: false,
    data: null as unknown as T,
    error: errMsg,
    status: res.status,
    appCode,
  };
}

/** Multipart upload (proof photos, documents). Do not set Content-Type manually. */
export async function requestMultipart<T>(
  path: string,
  formData: FormData,
  init?: {method?: string; idempotent?: boolean; skipRefresh?: boolean},
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {
    'x-selorg-client': 'rider',
    ...authHeaders(),
  };
  if (init?.idempotent) {
    headers['Idempotency-Key'] = newIdempotencyKey();
  }

  const fetched = await fetchWithHostFallback(path, {
    method: init?.method ?? 'POST',
    headers,
    body: formData,
  });
  if ('networkError' in fetched) {
    return {
      ok: false,
      data: null as unknown as T,
      error: fetched.aborted
        ? 'Request timed out. Please try again.'
        : 'Network unavailable.',
      status: 0,
      appCode: fetched.aborted ? 'TIMEOUT' : 'NETWORK_UNAVAILABLE',
    };
  }
  const res = fetched.res;

  if (res.status === 401 && !init?.skipRefresh) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return requestMultipart<T>(path, formData, {
        ...init,
        skipRefresh: true,
      });
    }
    void clearToken();
    _onUnauthorized?.();
    return {
      ok: false,
      data: null as unknown as T,
      error: friendlyMessage(401),
      status: 401,
    };
  }

  const {envelope} = await parseEnvelope<T>(res);
  if (!envelope) {
    return {
      ok: false,
      data: null as unknown as T,
      error: friendlyMessage(res.status),
      status: res.status,
    };
  }

  if (envelope.success) {
    return {ok: true, data: (envelope.data ?? null) as T, status: res.status};
  }

  return {
    ok: false,
    data: null as unknown as T,
    error: friendlyMessage(
      res.status,
      envelope.error?.message || envelope.message,
      typeof envelope.error?.appCode === 'string'
        ? envelope.error.appCode
        : undefined,
      (envelope.error as {details?: unknown} | null)?.details,
    ),
    status: res.status,
  };
}
