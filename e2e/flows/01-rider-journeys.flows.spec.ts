import { test, expect, APIRequestContext } from "@playwright/test";
import { apiCall, createApiContext } from "../helpers/api";
import { loginRider, forceActiveStatus, readStoredOtp } from "../helpers/auth";
import { ensureOfferedOrderForRider } from "../helpers/seedOrders";
import { TEST_MOBILE } from "../helpers/env";

/**
 * Rider user-flow journeys as real-backend API sequences matching
 * screens in Selorg-RiderApp-v1.3 (no Detox UI).
 *
 * N/A for this app (customer-only): cart, product catalog, search collections,
 * customer address CRUD, checkout payment gateway, customer wallet top-up.
 */
let ctx: APIRequestContext;
let token: string;
let userId: string;
let seededOrderId: string | undefined;

test.beforeAll(async () => {
  ctx = await createApiContext();
  const auth = await loginRider(ctx, { preferMint: true });
  token = auth.token;
  userId = auth.userId;
  await forceActiveStatus(userId);
  const seeded = await ensureOfferedOrderForRider(userId);
  seededOrderId = seeded.orderId;
});

test.afterAll(async () => {
  await ctx.dispose();
});

test.describe("Flow: Login / OTP / session", () => {
  test("send OTP → verify (or skip if provider blocked) → token persisted shape", async () => {
    const send = await apiCall(ctx, "POST", "/auth/send-otp", {
      body: { phone: TEST_MOBILE, preferredChannel: "sms" },
    });
    if (send.status !== 200 || !send.json?.success) {
      test.skip(true, `OTP send blocked: ${send.status} ${JSON.stringify(send.json)}`);
    }
    await new Promise((r) => setTimeout(r, 400));
    const otp =
      (send.json?.data as { otp?: string } | undefined)?.otp ||
      (await readStoredOtp(TEST_MOBILE));
    test.skip(!otp, "Could not read OTP from Mongo after send");

    const verify = await apiCall<{ token: string; nextScreen?: string }>(
      ctx,
      "POST",
      "/auth/verify-otp",
      {
        body: {
          phone: TEST_MOBILE,
          otp,
          preferredChannel: "sms",
          intent: "signup",
        },
      },
    );
    expect(verify.status).toBe(200);
    expect(verify.json?.data?.token).toBeTruthy();
    token = verify.json!.data!.token;
  });

  test("session persistence via refresh", async () => {
    const res = await apiCall<{ token?: string }>(ctx, "POST", "/auth/refresh", {
      token,
    });
    expect(res.status).toBeLessThan(500);
    if (res.status === 200 && res.json?.data?.token) {
      token = res.json.data.token;
    }
    const profile = await apiCall(ctx, "GET", "/profile", { token });
    expect(profile.status).toBe(200);
  });
});

test.describe("Flow: Profile / account", () => {
  test("load profile + hubs + update name", async () => {
    const profile = await apiCall(ctx, "GET", "/profile", { token });
    expect(profile.status).toBe(200);
    const hubs = await apiCall(ctx, "GET", "/work-locations");
    expect(hubs.status).toBe(200);
    const update = await apiCall(ctx, "PUT", "/profile", {
      token,
      body: { name: "Rider Flow Tester" },
    });
    expect(update.status).toBeLessThan(500);
  });

  test("preferences get/put (SettingsScreen)", async () => {
    const get = await apiCall(ctx, "GET", "/settings/preferences", { token });
    expect(get.status).toBe(200);
    const put = await apiCall(ctx, "PUT", "/settings/preferences", {
      token,
      body: { language: "en" },
    });
    expect(put.status).toBeLessThan(500);
  });
});

test.describe("Flow: Go online → orders → history", () => {
  test("go-online then list assignorders then completed history", async () => {
    const online = await apiCall(ctx, "POST", "/shifts/go-online", {
      token,
      body: { location: { latitude: 13.0067, longitude: 80.2571 } },
    });
    expect(
      online.status,
      `CRITICAL: HomeScreen go-online broken — POST /picker/shifts/go-online returned ${online.status} ${JSON.stringify(online.json)}`,
    ).toBe(200);
    expect(online.json?.success).toBe(true);
    expect((online.json?.data as { isOnline?: boolean })?.isOnline).toBe(true);

    const orders = await apiCall<{ orders?: Array<{ id?: string }> }>(
      ctx,
      "GET",
      "/shared-orders/assignorders?scope=all",
      { token },
    );
    expect(orders.status).toBe(200);
    expect(Array.isArray(orders.json?.data?.orders)).toBe(true);
    expect(
      (orders.json?.data?.orders?.length || 0) > 0,
      "Expected seeded/available offered order after go-online",
    ).toBe(true);

    const orderId =
      orders.json?.data?.orders?.[0]?.id || seededOrderId;
    expect(orderId).toBeTruthy();
    const detail = await apiCall(ctx, "GET", `/shared-orders/${orderId}`, {
      token,
    });
    expect(detail.status, JSON.stringify(detail.json)).toBe(200);

    const history = await apiCall<{ orders?: unknown[] }>(
      ctx,
      "GET",
      "/shared-orders/completed?type=all",
      { token },
    );
    expect(history.status).toBeLessThan(500);

    const offline = await apiCall(ctx, "POST", "/shifts/go-offline", {
      token,
      body: {},
    });
    expect(offline.status, JSON.stringify(offline.json)).toBe(200);
    expect((offline.json?.data as { isOnline?: boolean })?.isOnline).toBe(false);
  });
});

test.describe("Flow: Wallet / cash (earnings + float)", () => {
  test("earnings breakdown + cash summary", async () => {
    const earnings = await apiCall(
      ctx,
      "GET",
      "/wallet/earnings-breakdown?period=week",
      { token },
    );
    expect(earnings.status).toBe(200);
    const wallet = await apiCall(ctx, "GET", "/wallet", { token });
    expect(wallet.status).toBe(200);
    const cash = await apiCall(ctx, "GET", "/cash/summary", { token });
    expect(cash.status).toBeLessThan(500);
  });
});

test.describe("Flow: Support", () => {
  test("FAQ → tickets → chat message", async () => {
    const faq = await apiCall(ctx, "GET", "/faq?limit=10");
    expect(faq.status).toBe(200);
    const tickets = await apiCall(
      ctx,
      "GET",
      "/support/tickets?status=all&limit=10",
      { token },
    );
    expect(tickets.status).toBeLessThan(500);
    const chat = await apiCall(ctx, "POST", "/support/chat/messages", {
      token,
      body: { text: "Flow test support message" },
    });
    expect(chat.status).toBeLessThan(500);
  });
});

test.describe("Flow: Logout", () => {
  test("logout invalidates session for subsequent profile", async () => {
    const fresh = await loginRider(ctx, { preferMint: true });
    await forceActiveStatus(fresh.userId);
    const logout = await apiCall(ctx, "POST", "/auth/logout", {
      token: fresh.token,
    });
    expect(logout.status).toBeLessThan(500);
    const after = await apiCall(ctx, "GET", "/profile", {
      token: fresh.token,
    });
    // Backend sets sessionToken=null on logout; middleware must reject JWT sid
    // when stored session is null/mismatched.
    expect(
      [401, 403],
      `AUTH BUG: after logout profile still ${after.status} (sessionToken null bypasses sid check)`,
    ).toContain(after.status);

    // Remint suite session — preferMint rotates sid for the shared test rider.
    const restored = await loginRider(ctx, { preferMint: true });
    await forceActiveStatus(restored.userId);
    token = restored.token;
    userId = restored.userId;
  });
});

test.describe("Response mapping contracts (frontend mappers)", () => {
  test("assignorders envelope matches orderApi.listAvailable", async () => {
    const res = await apiCall(ctx, "GET", "/shared-orders/assignorders?scope=mine", {
      token,
    });
    if (res.status === 200) {
      const data = res.json?.data as { orders?: unknown };
      expect(Array.isArray(data?.orders)).toBe(true);
    }
  });

  test("wallet history envelope matches riderApi.getDailyBreakdown", async () => {
    const res = await apiCall(ctx, "GET", "/wallet/history?period=week&limit=7", {
      token,
    });
    expect(res.status).toBe(200);
    const data = res.json?.data as { history?: unknown };
    expect(Array.isArray(data?.history)).toBe(true);
  });

  test("error envelope has success=false for UI error state", async () => {
    const res = await apiCall(ctx, "GET", "/profile");
    expect(res.json?.success).toBe(false);
  });
});
