import { APIRequestContext, expect, request } from "@playwright/test";
import { API_BASE, PICKER_PREFIX, pickerUrl } from "./env";

export type Envelope<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code?: string | number;
    appCode?: string;
    message?: string;
    details?: unknown;
  } | null;
  pagination?: unknown;
  timestamp?: string;
};

export type ApiCallResult<T = unknown> = {
  status: number;
  ok: boolean;
  json: Envelope<T> | null;
  headers: Record<string, string>;
  url: string;
  method: string;
  durationMs: number;
  networkError?: string;
  rawText?: string;
};

export async function createApiContext(): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: API_BASE,
    extraHTTPHeaders: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    timeout: 30_000,
  });
}

export async function apiCall<T = unknown>(
  ctx: APIRequestContext,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS",
  path: string,
  opts?: {
    body?: unknown;
    token?: string | null;
    headers?: Record<string, string>;
    skipPrefix?: boolean;
    formData?: FormData;
  },
): Promise<ApiCallResult<T>> {
  const url = opts?.skipPrefix
    ? path.startsWith("http")
      ? path
      : `${API_BASE}${path}`
    : path.startsWith("http")
      ? path
      : pickerUrl(path);

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(opts?.formData
      ? {}
      : opts?.body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
    ...(opts?.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    ...opts?.headers,
  };

  const started = Date.now();
  try {
    const res = await ctx.fetch(url, {
      method,
      headers,
      data: opts?.formData
        ? undefined
        : opts?.body !== undefined
          ? opts.body
          : undefined,
      multipart: opts?.formData ? (opts.formData as never) : undefined,
    });
    const text = await res.text();
    let json: Envelope<T> | null = null;
    try {
      json = text ? (JSON.parse(text) as Envelope<T>) : null;
    } catch {
      json = null;
    }
    const h: Record<string, string> = {};
    for (const [k, v] of Object.entries(res.headers())) h[k.toLowerCase()] = v;
    return {
      status: res.status(),
      ok: res.ok(),
      json,
      headers: h,
      url,
      method,
      durationMs: Date.now() - started,
      rawText: text.slice(0, 2000),
    };
  } catch (err) {
    return {
      status: 0,
      ok: false,
      json: null,
      headers: {},
      url,
      method,
      durationMs: Date.now() - started,
      networkError: err instanceof Error ? err.message : String(err),
    };
  }
}

export function assertEnvelopeSuccess(result: ApiCallResult, label: string) {
  expect(
    result.networkError,
    `${label}: network error ${result.networkError}`,
  ).toBeFalsy();
  expect(
    result.status,
    `${label}: unexpected status ${result.status} body=${JSON.stringify(result.json)}`,
  ).toBeLessThan(500);
  expect(result.json, `${label}: non-JSON body`).toBeTruthy();
  if (result.status >= 200 && result.status < 300) {
    expect(result.json!.success, `${label}: success=false`).toBe(true);
  }
}

export function assertAuthRequired(result: ApiCallResult, label: string) {
  expect(result.networkError, `${label}: network`).toBeFalsy();
  expect(
    [401, 403],
    `${label}: expected 401/403 got ${result.status} ${JSON.stringify(result.json)}`,
  ).toContain(result.status);
  expect(result.json?.success).toBe(false);
}

export { API_BASE, PICKER_PREFIX, pickerUrl };
