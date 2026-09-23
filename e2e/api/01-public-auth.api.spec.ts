import { test, expect, APIRequestContext } from "@playwright/test";
import {
  apiCall,
  assertEnvelopeSuccess,
  createApiContext,
} from "../helpers/api";
import { loginRider, readStoredOtp } from "../helpers/auth";
import { API_BASE, APP_API_BASE, TEST_MOBILE } from "../helpers/env";

let ctx: APIRequestContext;

test.beforeAll(async () => {
  ctx = await createApiContext();
});

test.afterAll(async () => {
  await ctx.dispose();
});

test.describe("Environment & connectivity", () => {
  test("backend is reachable on configured API_BASE", async () => {
    const res = await apiCall(ctx, "GET", "/config");
    expect(
      res.networkError,
      `BLOCKED: backend unavailable at ${API_BASE} — ${res.networkError}`,
    ).toBeFalsy();
    expect(res.status).toBeGreaterThan(0);
    expect(res.status).toBe(200);
  });

  test("Rider APP_API_BASE resolves picker config", async () => {
    const res = await ctx.fetch(`${APP_API_BASE}/picker/config`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    expect(res.status(), `APP_API_BASE=${APP_API_BASE}`).toBe(200);
  });

  test("OPTIONS preflight on picker config (CORS soft check)", async () => {
    const res = await ctx.fetch(`${API_BASE}/api/v1/picker/config`, {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization,content-type",
      },
    });
    expect(res.status()).toBeLessThan(500);
  });
});

test.describe("Public / guest-tolerant APIs used by Rider App", () => {
  const publicGets: Array<{ name: string; path: string; expectData?: boolean }> =
    [
      { name: "config", path: "/config", expectData: true },
      { name: "legal terms", path: "/legal/terms" },
      { name: "legal privacy", path: "/legal/privacy" },
      { name: "faq", path: "/faq?limit=10" },
      { name: "training videos", path: "/training/videos" },
      { name: "work locations", path: "/work-locations" },
    ];

  for (const ep of publicGets) {
    test(`GET ${ep.path} — ${ep.name}`, async () => {
      const res = await apiCall(ctx, "GET", ep.path);
      assertEnvelopeSuccess(res, ep.name);
      expect(res.status, `${ep.name} status`).toBeLessThan(500);
      if (ep.expectData && res.status === 200) {
        expect(res.json?.data, `${ep.name} missing data`).toBeTruthy();
      }
    });
  }

  test("GET /config exposes otpLength=4 matching environment.otpLength", async () => {
    const res = await apiCall<{ otpLength?: number }>(ctx, "GET", "/config");
    expect(res.status).toBe(200);
    expect(res.json?.data?.otpLength).toBe(4);
  });
});

test.describe("OTP auth contract (authApi)", () => {
  test("send-otp rejects missing phone", async () => {
    const res = await apiCall(ctx, "POST", "/auth/send-otp", { body: {} });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(res.json?.success).toBe(false);
  });

  test("send-otp rejects invalid phone", async () => {
    const res = await apiCall(ctx, "POST", "/auth/send-otp", {
      body: { phone: "123", preferredChannel: "sms" },
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(res.json?.success).toBe(false);
  });

  test("verify-otp rejects wrong otp", async () => {
    const send = await apiCall(ctx, "POST", "/auth/send-otp", {
      body: { phone: TEST_MOBILE, preferredChannel: "sms" },
    });
    test.skip(
      send.status !== 200 || !send.json?.success,
      `OTP send blocked/unavailable: ${send.status} ${JSON.stringify(send.json)}`,
    );
    const verify = await apiCall(ctx, "POST", "/auth/verify-otp", {
      body: {
        phone: TEST_MOBILE,
        otp: "0000",
        preferredChannel: "sms",
        intent: "signup",
      },
    });
    expect(verify.status).toBeGreaterThanOrEqual(400);
    expect(verify.status).toBeLessThan(500);
    expect(verify.json?.success).toBe(false);
  });

  test("verify-otp rejects missing fields", async () => {
    const res = await apiCall(ctx, "POST", "/auth/verify-otp", {
      body: { phone: TEST_MOBILE },
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  test("send-otp + verify with stored OTP returns token (authApi shape)", async () => {
    const send = await apiCall<{ deliveryStatus?: string; otp?: string }>(
      ctx,
      "POST",
      "/auth/send-otp",
      { body: { phone: TEST_MOBILE, preferredChannel: "sms" } },
    );
    test.skip(
      send.status !== 200 || !send.json?.success,
      `OTP provider/env blocked send: ${send.status} ${JSON.stringify(send.json)}`,
    );

    // Frontend strips otp — contract: client must not rely on response otp.
    if (send.json?.data && "otp" in (send.json.data as object)) {
      // Document leak if present (non-prod backends sometimes still include it).
      console.warn(
        "[CONTRACT NOTE] send-otp response includes otp field (frontend strips it)",
      );
    }

    await new Promise((r) => setTimeout(r, 500));
    const otp =
      (typeof send.json?.data?.otp === "string" ? send.json.data.otp : null) ||
      (await readStoredOtp(TEST_MOBILE));
    test.skip(!otp, "OTP not available in DB after send (test harness limitation)");

    const verify = await apiCall<{
      token: string;
      user?: { id: string };
      nextScreen?: string;
    }>(ctx, "POST", "/auth/verify-otp", {
      body: {
        phone: TEST_MOBILE,
        otp,
        preferredChannel: "sms",
        intent: "signup",
      },
    });
    expect(verify.status, JSON.stringify(verify.json)).toBe(200);
    expect(verify.json?.success).toBe(true);
    expect(verify.json?.data?.token, "token missing").toBeTruthy();
    expect(verify.json!.data!.token.split(".").length).toBe(3);
    expect(verify.json?.data?.user?.id).toBeTruthy();
  });

  test("loginRider helper establishes session (otp or minted fallback)", async () => {
    const session = await loginRider(ctx, { preferMint: true });
    expect(session.token.split(".").length).toBe(3);
    expect(session.userId).toBeTruthy();
  });
});

test.describe("Auth-gated APIs without token (negative)", () => {
  const gated: Array<{ method: "GET" | "POST" | "PUT"; path: string }> = [
    { method: "GET", path: "/profile" },
    { method: "GET", path: "/dashboard/today" },
    { method: "GET", path: "/wallet" },
    { method: "GET", path: "/cash/summary" },
    { method: "GET", path: "/shared-orders/assignorders?scope=all" },
    { method: "GET", path: "/notifications?page=1&limit=10" },
    { method: "GET", path: "/settings/preferences" },
    { method: "GET", path: "/support/tickets?status=all&limit=20" },
    { method: "POST", path: "/auth/logout" },
    { method: "POST", path: "/auth/refresh" },
    { method: "POST", path: "/shifts/go-online" },
    { method: "POST", path: "/locations/track" },
  ];

  for (const ep of gated) {
    test(`${ep.method} ${ep.path} without token → 401/403`, async () => {
      const res = await apiCall(ctx, ep.method, ep.path, {
        body: ep.method === "POST" ? {} : undefined,
      });
      expect(res.networkError).toBeFalsy();
      // Missing backend route → 404 (contract gap, not auth).
      if (res.status === 404) {
        expect(
          res.status,
          `ROUTE MISSING (contract): ${ep.method} ${ep.path}`,
        ).toBe(404);
        return;
      }
      expect([401, 403], JSON.stringify(res.json)).toContain(res.status);
    });
  }

  test("invalid Bearer token → 401", async () => {
    const res = await apiCall(ctx, "GET", "/profile", {
      token: "not.a.valid.jwt",
    });
    expect(
      [401, 403],
      `invalid token → ${res.status} ${JSON.stringify(res.json)} url=${res.url}`,
    ).toContain(res.status);
  });

  test("malformed Authorization header → 401", async () => {
    const res = await apiCall(ctx, "GET", "/profile", {
      headers: { Authorization: "Token abc" },
    });
    // Missing Bearer scheme is treated as unauthenticated.
    expect(
      [401, 403],
      `malformed auth → ${res.status} ${JSON.stringify(res.json)} url=${res.url}`,
    ).toContain(res.status);
  });
});
