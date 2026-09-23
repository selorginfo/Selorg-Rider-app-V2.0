import {NativeModules, Platform} from 'react-native';
import {
  API_BASE_URL as ENV_API_BASE_URL_DOT,
  APP_MODE as ENV_APP_MODE_DOT,
  DEV_API_BASE_URL as ENV_DEV_API_BASE_URL_DOT,
  PROD_API_BASE_URL as ENV_PROD_API_BASE_URL_DOT,
} from '@env';

/**
 * Dev API host priority (client uses primary only):
 * 1. Metro loopback → 127.0.0.1 (adb reverse)
 * 2. Metro emulator host → 10.0.2.2
 * 3. Metro LAN IP → same PC as selorg-service
 * 4. .env DEV_API_BASE_URL / API_BASE_URL (loopback skipped when Metro is LAN/emulator)
 *
 * Picker/Rider routes are at `/api/v1/picker/*`, base is `/api/v1`.
 * Do NOT fall back to hosted dev-api — OTP config is local to selorg-service.
 */
const DEV_API_PORT = 3333;
const DEV_API_PATH = '/api/v1';
const HOSTED_DEV_API_BASE_URL = 'https://dev-api.selorg.com/api/v1';
const PROD_FALLBACK_API_BASE_URL = 'https://api.selorg.com/api/v1';

const ENV_API_BASE_URL = (ENV_API_BASE_URL_DOT as string | undefined)?.trim();
const ENV_APP_MODE = (ENV_APP_MODE_DOT as string | undefined)
  ?.trim()
  .toLowerCase();
const ENV_DEV_API_BASE_URL = (
  ENV_DEV_API_BASE_URL_DOT as string | undefined
)?.trim();
const ENV_PROD_API_BASE_URL = (
  ENV_PROD_API_BASE_URL_DOT as string | undefined
)?.trim();

function sanitizeApiBaseUrl(value?: string | null): string {
  const v = typeof value === 'string' ? value.trim() : '';
  return v.replace(/\/+$/, '');
}

function getMetroHost(): string {
  try {
    const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
    if (!scriptURL) {
      return '';
    }
    const match = scriptURL.match(/^https?:\/\/([^/:?#]+)/i);
    return (match?.[1] || '').trim();
  } catch {
    return '';
  }
}

function isLoopbackHost(host: string): boolean {
  const h = host.toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0';
}

/** Android emulator host-loopback — useless on a physical phone. */
function isEmulatorOnlyHost(host: string): boolean {
  return host === '10.0.2.2' || host === '10.0.3.2';
}

function isEmulatorOnlyUrl(url: string): boolean {
  return /:\/\/(10\.0\.2\.2|10\.0\.3\.2)(:|\/|$)/i.test(url);
}

function isLoopbackUrl(url: string): boolean {
  return /:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/i.test(url);
}

function getDevApiCandidates(): string[] {
  const metroHost = getMetroHost();
  const preferred: string[] = [];
  // Metro on LAN / emulator means 127.0.0.1 in .env points at the device, not the PC.
  const skipEnvLoopback = Boolean(
    metroHost && !isLoopbackHost(metroHost),
  );
  const metroIsLoopback = Boolean(metroHost && isLoopbackHost(metroHost));
  const metroIsLan = Boolean(
    metroHost && !isLoopbackHost(metroHost) && !isEmulatorOnlyHost(metroHost),
  );

  const add = (raw?: string | null) => {
    const url = sanitizeApiBaseUrl(raw);
    if (!url || preferred.includes(url)) {
      return;
    }
    // Never put emulator-only hosts first when Metro is a real LAN IP.
    if (
      metroHost &&
      !isLoopbackHost(metroHost) &&
      !isEmulatorOnlyHost(metroHost) &&
      isEmulatorOnlyUrl(url)
    ) {
      return;
    }
    preferred.push(url);
  };

  // Physical device on same Wi‑Fi: Metro LAN IP → same machine as selorg-service.
  if (metroIsLan) {
    add(`http://${metroHost}:${DEV_API_PORT}${DEV_API_PATH}`);
  }

  // Explicit non-loopback .env (LAN IP) — preferred when Metro uses adb reverse
  // (scriptURL is localhost) so the phone can still reach the PC without
  // `adb reverse tcp:3333`.
  for (const raw of [ENV_DEV_API_BASE_URL, ENV_API_BASE_URL]) {
    const url = sanitizeApiBaseUrl(raw);
    if (!url || isLoopbackUrl(url)) {
      continue;
    }
    if (skipEnvLoopback && isEmulatorOnlyUrl(url)) {
      continue;
    }
    add(url);
  }

  // USB/wireless adb reverse: Metro on localhost → API on 127.0.0.1
  // (requires: adb reverse tcp:3333 tcp:3333).
  if (metroIsLoopback) {
    add(`http://127.0.0.1:${DEV_API_PORT}${DEV_API_PATH}`);
    add(`http://localhost:${DEV_API_PORT}${DEV_API_PATH}`);
  }

  // Android emulator: Metro is usually 10.0.2.2 — use that for API (not 127.0.0.1).
  if (metroHost && isEmulatorOnlyHost(metroHost)) {
    add(`http://${metroHost}:${DEV_API_PORT}${DEV_API_PATH}`);
  }

  // Loopback .env only when Metro is also loopback / reverse (or unknown).
  for (const raw of [ENV_DEV_API_BASE_URL, ENV_API_BASE_URL]) {
    const url = sanitizeApiBaseUrl(raw);
    if (!url) {
      continue;
    }
    if (skipEnvLoopback && isLoopbackUrl(url)) {
      continue;
    }
    add(url);
  }

  // Emulator fallback when Metro host is unknown.
  if (
    Platform.OS === 'android' &&
    (!metroHost || isEmulatorOnlyHost(metroHost))
  ) {
    add(`http://10.0.2.2:${DEV_API_PORT}${DEV_API_PATH}`);
  }

  // Do NOT append hosted dev-api as a silent fallback — it makes OTP slow and
  // hits a different backend than local selorg-service.

  return preferred.length > 0
    ? preferred
    : [HOSTED_DEV_API_BASE_URL];
}

function getApiBaseUrls(): string[] {
  if (ENV_APP_MODE === 'production') {
    return [
      sanitizeApiBaseUrl(ENV_PROD_API_BASE_URL) ||
        sanitizeApiBaseUrl(ENV_API_BASE_URL) ||
        PROD_FALLBACK_API_BASE_URL,
    ];
  }
  return getDevApiCandidates();
}

const apiBaseUrls = getApiBaseUrls();

export const environment = {
  apiBaseUrl: apiBaseUrls[0],
  apiBaseUrls,
  useMockData: false,
  otpLength: 4,
  requestTimeoutMs: 8000,
  codDepositLimit: 2000,
  supportPhone: '+91 9444183378',
  supportEmail: 'selorginfo@gmail.com',
  appVersion: 'v1.0.0',
};

if (__DEV__) {
  const metroHost = getMetroHost();
  console.log('[SelorgRider] API base URL:', environment.apiBaseUrl);
  console.log('[SelorgRider] API candidates:', environment.apiBaseUrls);
  console.log('[SelorgRider] APP_MODE:', ENV_APP_MODE || '(unset)');
  console.log('[SelorgRider] Metro host:', metroHost || '(none)');
  console.log(
    '[SelorgRider] Device hint:',
    isLoopbackHost(metroHost)
      ? 'USB/adb reverse (127.0.0.1) — run: adb reverse tcp:3333 tcp:3333'
      : isEmulatorOnlyHost(metroHost)
        ? 'Android emulator (10.0.2.2)'
        : metroHost
          ? 'Physical device Wi-Fi (Metro LAN IP)'
          : 'Metro host unknown',
  );
  if (
    Platform.OS === 'android' &&
    metroHost &&
    !isLoopbackHost(metroHost) &&
    !isEmulatorOnlyHost(metroHost) &&
    isLoopbackUrl(environment.apiBaseUrl)
  ) {
    console.warn(
      '[SelorgRider] Physical device must not use 127.0.0.1 unless adb reverse is set. Prefer Metro LAN IP.',
    );
  }
}
