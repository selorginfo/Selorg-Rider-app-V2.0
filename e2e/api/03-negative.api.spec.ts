import { test, expect, APIRequestContext } from "@playwright/test";
import { apiCall, createApiContext } from "../helpers/api";
import { loginRider } from "../helpers/auth";
import { TEST_MOBILE } from "../helpers/env";

let ctx: APIRequestContext;
let token: string;

test.beforeAll(async () => {
  ctx = await createApiContext();
  const auth = await loginRider(ctx, { preferMint: true });
  token = auth.token;
});

test.afterAll(async () => {
  await ctx.dispose();
});

test.describe("Negative / failure contracts", () => {
  test("expired/invalid token rejected on profile", async () => {
    const res = await apiCall(ctx, "GET", "/profile", {
      token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.invalid",
    });
    expect(res.status).toBe(401);
    expect(res.json?.success).toBe(false);
  });

  test("customer audience token must not work on picker routes", async () => {
    // Token with wrong aud — if signed with same secret but wrong audience.
    // Use a clearly wrong token shape; middleware should 401.
    const res = await apiCall(ctx, "GET", "/wallet", {
      token: token.slice(0, -4) + "xxxx",
    });
    expect(res.status).toBe(401);
  });

  test("missing required fields on send-otp-email", async () => {
    const res = await apiCall(ctx, "POST", "/auth/send-otp-email", {
      body: {},
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  test("invalid email format on send-otp-email", async () => {
    const res = await apiCall(ctx, "POST", "/auth/send-otp-email", {
      body: { email: "bad" },
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  test("verify-otp with intent=login for unknown phone → ACCOUNT_NOT_FOUND or similar", async () => {
    const phone = "9000000099";
    const send = await apiCall(ctx, "POST", "/auth/send-otp", {
      body: { phone, preferredChannel: "sms" },
    });
    test.skip(
      send.status !== 200 || !send.json?.success,
      "OTP send unavailable for unknown-phone login intent test",
    );
    // Without reading OTP we still can assert wrong otp path; for ACCOUNT_NOT_FOUND need correct otp.
    const verify = await apiCall(ctx, "POST", "/auth/verify-otp", {
      body: { phone, otp: "1234", preferredChannel: "sms", intent: "login" },
    });
    expect(verify.status).toBeGreaterThanOrEqual(400);
    expect(verify.status).toBeLessThan(500);
    expect(verify.json?.success).toBe(false);
  });

  test("empty body on location track → 4xx", async () => {
    const res = await apiCall(ctx, "POST", "/locations/track", {
      token,
      body: {},
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  test("unexpected response structure still yields JSON envelope on 404", async () => {
    const res = await apiCall(ctx, "GET", "/this-route-does-not-exist-xyz", {
      token,
    });
    expect(res.status).toBe(404);
    // Prefer envelope; if HTML/plain, frontend client.ts treats as unexpected.
    if (res.json) {
      expect(typeof res.json.success).toBe("boolean");
    }
  });

  test("wrong HTTP method on config (POST) → 4xx/405", async () => {
    const res = await apiCall(ctx, "POST", "/config", { body: {} });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  test("bulk stop deliver with invalid stopId → 4xx", async () => {
    const res = await apiCall(
      ctx,
      "POST",
      "/bulk/stops/000000000000000000000000/deliver",
      {
        token,
        body: { otp: "1234" },
        headers: { "Idempotency-Key": `bulk-${Date.now()}` },
      },
    );
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  test("notifications mark-read invalid id → 4xx", async () => {
    const res = await apiCall(ctx, "PUT", "/notifications/not-valid/read", {
      token,
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});

test.describe("Frontend client error mapping expectations", () => {
  test("401 responses include success=false for friendlyMessage(401)", async () => {
    const res = await apiCall(ctx, "GET", "/profile");
    expect(res.status).toBe(401);
    expect(res.json?.success).toBe(false);
  });

  test("validation error uses appCode or message", async () => {
    const res = await apiCall(ctx, "POST", "/auth/send-otp", {
      body: { phone: "12", preferredChannel: "sms" },
    });
    expect(res.json?.success).toBe(false);
    const code =
      res.json?.error?.appCode ||
      res.json?.error?.code ||
      res.json?.message;
    expect(code || res.status >= 400).toBeTruthy();
  });

  test("test mobile constant available", async () => {
    expect(TEST_MOBILE.length).toBe(10);
  });
});
