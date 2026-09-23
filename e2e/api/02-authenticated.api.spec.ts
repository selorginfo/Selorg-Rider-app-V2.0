import { test, expect, APIRequestContext } from "@playwright/test";
import { apiCall, createApiContext } from "../helpers/api";
import { loginRider, forceActiveStatus } from "../helpers/auth";
import { ensureOfferedOrderForRider } from "../helpers/seedOrders";

let ctx: APIRequestContext;
let token: string;
let userId: string;
let sampleOrderId: string | undefined;
let sampleShiftId: string | undefined;
let sampleBatchId: string | undefined;
let sampleStopId: string | undefined;
let otpBlocked = false;
let otpBlockReason = "";

test.beforeAll(async () => {
  ctx = await createApiContext();
  const auth = await loginRider(ctx, { preferMint: true });
  token = auth.token;
  userId = auth.userId;
  otpBlocked = !!auth.otpBlocked;
  otpBlockReason = auth.otpBlockReason || "";
  await forceActiveStatus(userId);
  const seeded = await ensureOfferedOrderForRider(userId);
  sampleOrderId = seeded.orderId;
  // Rider must be online to see available pool under scope=all.
  await apiCall(ctx, "POST", "/shifts/go-online", {
    token,
    body: { location: { latitude: 13.0067, longitude: 80.2571 } },
  });
});

test.afterAll(async () => {
  await ctx.dispose();
});

test.describe("Session / profile (profileApi + authApi)", () => {
  test("GET /profile returns rider profile shape", async () => {
    const res = await apiCall<Record<string, unknown>>(ctx, "GET", "/profile", {
      token,
    });
    expect(res.status, JSON.stringify(res.json)).toBe(200);
    expect(res.json?.success).toBe(true);
    expect(res.json?.data).toBeTruthy();
  });

  test("PUT /profile with name updates", async () => {
    const res = await apiCall(ctx, "PUT", "/profile", {
      token,
      body: { name: "Rider Automation Tester" },
    });
    expect(res.status, JSON.stringify(res.json)).toBeLessThan(500);
    if (res.status === 200) expect(res.json?.success).toBe(true);
  });

  test("PUT /profile invalid email → 4xx validation", async () => {
    const res = await apiCall(ctx, "PUT", "/profile", {
      token,
      body: { email: "not-an-email" },
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  test("GET /onboarding/state", async () => {
    const res = await apiCall(ctx, "GET", "/onboarding/state", { token });
    expect(res.status).toBeLessThan(500);
    if (res.status === 200) expect(res.json?.success).toBe(true);
  });

  test("GET /documents list", async () => {
    const res = await apiCall(ctx, "GET", "/documents", { token });
    expect(res.status).toBe(200);
    expect(res.json?.success).toBe(true);
  });

  test("POST /auth/refresh rotates or returns token", async () => {
    const res = await apiCall<{ token?: string }>(ctx, "POST", "/auth/refresh", {
      token,
    });
    expect(res.status, JSON.stringify(res.json)).toBeLessThan(500);
    if (res.status === 200 && res.json?.data?.token) {
      token = res.json.data.token;
    }
  });
});

test.describe("Dashboard / shifts / online (riderApi + HomeScreen)", () => {
  test("GET /dashboard/today", async () => {
    const res = await apiCall(ctx, "GET", "/dashboard/today", { token });
    expect(
      res.status,
      `dashboard/today ${res.status} ${JSON.stringify(res.json)}`,
    ).toBeLessThan(500);
    if (res.status === 200) expect(res.json?.success).toBe(true);
  });

  test("GET /incentives/today", async () => {
    const res = await apiCall(ctx, "GET", "/incentives/today", { token });
    expect(res.status).toBeLessThan(500);
  });

  test("GET /shifts/available maps to ShiftSlot[]", async () => {
    const res = await apiCall<
      Array<{ id?: string; _id?: string }> | { shifts?: Array<{ id?: string }> }
    >(ctx, "GET", "/shifts/available", { token });
    expect(res.status, JSON.stringify(res.json)).toBe(200);
    expect(res.json?.success).toBe(true);
    const data = res.json?.data;
    const list = Array.isArray(data)
      ? data
      : data && typeof data === "object" && Array.isArray(data.shifts)
        ? data.shifts
        : null;
    expect(
      list,
      `CONTRACT: riderApi.getShifts expects array|{shifts}, got ${JSON.stringify(data)?.slice(0, 200)}`,
    ).toBeTruthy();
    if (list && list.length > 0) {
      sampleShiftId = list[0].id || (list[0] as { _id?: string })._id;
    }
  });

  test("GET /shifts/my", async () => {
    const res = await apiCall(ctx, "GET", "/shifts/my", { token });
    expect(res.status).toBeLessThan(500);
  });

  test("POST /shifts/go-online (frontend HomeScreen critical path)", async () => {
    const res = await apiCall(ctx, "POST", "/shifts/go-online", {
      token,
      body: { location: { latitude: 13.0067, longitude: 80.2571 } },
    });
    expect(
      res.status,
      `CRITICAL CONTRACT MISMATCH: frontend riderApi.goOnline → POST /picker/shifts/go-online missing on backend (got ${res.status} ${JSON.stringify(res.json)})`,
    ).not.toBe(404);
    expect(res.status, JSON.stringify(res.json)).toBeLessThan(500);
  });

  test("POST /shifts/go-offline (frontend HomeScreen)", async () => {
    const res = await apiCall(ctx, "POST", "/shifts/go-offline", {
      token,
      body: {},
    });
    expect(
      res.status,
      `CRITICAL CONTRACT MISMATCH: frontend riderApi.goOffline → POST /picker/shifts/go-offline missing on backend (got ${res.status})`,
    ).not.toBe(404);
    expect(res.status).toBeLessThan(500);
  });

  test("POST /shifts/select with invalid shiftId → 4xx", async () => {
    const res = await apiCall(ctx, "POST", "/shifts/select", {
      token,
      body: { shiftId: "s1" },
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});

test.describe("Orders / delivery (orderApi)", () => {
  test("GET /shared-orders/assignorders?scope=all", async () => {
    const res = await apiCall<{ orders?: unknown[] }>(
      ctx,
      "GET",
      "/shared-orders/assignorders?scope=all",
      { token },
    );
    expect(res.status, JSON.stringify(res.json)).toBeLessThan(500);
    if (res.status === 200) {
      expect(res.json?.success).toBe(true);
      const orders = res.json?.data?.orders;
      expect(
        Array.isArray(orders),
        `CONTRACT: orderApi.listAvailable expects data.orders[], got keys=${
          res.json?.data && typeof res.json.data === "object"
            ? Object.keys(res.json.data as object).join(",")
            : typeof res.json?.data
        }`,
      ).toBe(true);
      if (Array.isArray(orders) && orders.length > 0) {
        const first = orders[0] as { id?: string; _id?: string };
        sampleOrderId = first.id || first._id || sampleOrderId;
      }
    }
  });

  test("GET /shared-orders/completed?type=all", async () => {
    const res = await apiCall<{ orders?: unknown[] }>(
      ctx,
      "GET",
      "/shared-orders/completed?type=all",
      { token },
    );
    expect(res.status).toBeLessThan(500);
    if (res.status === 200) {
      expect(Array.isArray(res.json?.data?.orders)).toBe(true);
    }
  });

  test("GET /shared-orders/:orderId detail", async () => {
    test.skip(!sampleOrderId, "No assignable orders in backend data");
    const res = await apiCall(ctx, "GET", `/shared-orders/${sampleOrderId}`, {
      token,
    });
    expect(res.status).toBeLessThan(500);
    if (res.status === 200) expect(res.json?.success).toBe(true);
  });

  test("GET /shared-orders/invalid-id → 4xx", async () => {
    const res = await apiCall(ctx, "GET", "/shared-orders/not-a-valid-id", {
      token,
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  test("PUT status accepted on invalid id → 4xx", async () => {
    const res = await apiCall(ctx, "PUT", "/shared-orders/000000000000000000000000/status", {
      token,
      body: { status: "accepted" },
      headers: { "Idempotency-Key": `idemp-test-${Date.now()}` },
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  test("POST complete missing otp → 4xx", async () => {
    const id = sampleOrderId || "000000000000000000000000";
    const res = await apiCall(ctx, "POST", `/shared-orders/${id}/complete`, {
      token,
      body: {},
      headers: { "Idempotency-Key": `idemp-complete-${Date.now()}` },
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});

test.describe("Bulk delivery (bulkApi)", () => {
  test("GET /bulk/batch", async () => {
    const res = await apiCall(ctx, "GET", "/bulk/batch", { token });
    expect(res.status).toBeLessThan(500);
    if (res.status === 200 && res.json?.data) {
      const batch = res.json.data as {
        id?: string;
        orders?: Array<{ stopId?: string; id?: string }>;
      };
      sampleBatchId = batch.id;
      if (batch.orders?.[0]) {
        sampleStopId = batch.orders[0].stopId || batch.orders[0].id;
      }
    }
  });

  test("GET /bulk/batches?status=completed", async () => {
    const res = await apiCall<{ batches?: unknown[] }>(
      ctx,
      "GET",
      "/bulk/batches?status=completed",
      { token },
    );
    expect(res.status).toBeLessThan(500);
    if (res.status === 200) {
      expect(
        Array.isArray(res.json?.data?.batches),
        `CONTRACT: bulkApi.listBatches expects data.batches[]`,
      ).toBe(true);
    }
  });

  test("POST /bulk/bag/load missing bag → 4xx", async () => {
    const res = await apiCall(ctx, "POST", "/bulk/bag/load", {
      token,
      body: {},
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});

test.describe("Wallet / cash / earnings (riderApi)", () => {
  test("GET /wallet", async () => {
    const res = await apiCall(ctx, "GET", "/wallet", { token });
    expect(res.status, JSON.stringify(res.json)).toBe(200);
    expect(res.json?.success).toBe(true);
  });

  test("GET /wallet/earnings-breakdown?period=week", async () => {
    const res = await apiCall(ctx, "GET", "/wallet/earnings-breakdown?period=week", {
      token,
    });
    expect(res.status).toBe(200);
    expect(res.json?.data).toBeTruthy();
  });

  test("GET /wallet/history?period=week&limit=7", async () => {
    const res = await apiCall<{ history?: unknown[] }>(
      ctx,
      "GET",
      "/wallet/history?period=week&limit=7",
      { token },
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.json?.data?.history)).toBe(true);
  });

  test("GET /wallet/transactions?page=1&limit=20", async () => {
    const res = await apiCall(ctx, "GET", "/wallet/transactions?page=1&limit=20", {
      token,
    });
    expect(res.status).toBeLessThan(500);
  });

  test("GET /cash/summary", async () => {
    const res = await apiCall(ctx, "GET", "/cash/summary", { token });
    expect(res.status).toBeLessThan(500);
  });

  test("GET /cash/transactions", async () => {
    const res = await apiCall<{ transactions?: unknown[] }>(
      ctx,
      "GET",
      "/cash/transactions",
      { token },
    );
    expect(res.status).toBeLessThan(500);
    if (res.status === 200) {
      expect(Array.isArray(res.json?.data?.transactions)).toBe(true);
    }
  });

  test("POST /cash/deposits invalid amount → 4xx", async () => {
    const res = await apiCall(ctx, "POST", "/cash/deposits", {
      token,
      body: { amount: -1, method: "upi" },
      headers: { "Idempotency-Key": `dep-${Date.now()}` },
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});

test.describe("Support / settings / notifications / location / config", () => {
  test("GET /faq", async () => {
    const res = await apiCall(ctx, "GET", "/faq?limit=20");
    expect(res.status).toBe(200);
  });

  test("GET /support/tickets", async () => {
    const res = await apiCall(ctx, "GET", "/support/tickets?status=all&limit=20", {
      token,
    });
    expect(res.status).toBeLessThan(500);
  });

  test("POST /support/tickets create", async () => {
    const res = await apiCall(ctx, "POST", "/support/tickets", {
      token,
      body: {
        subject: "Rider automation ticket",
        message: "Automated API audit message",
        description: "Automated API audit message",
        category: "app",
      },
    });
    expect(res.status).toBeLessThan(500);
    if (res.status === 200 || res.status === 201) {
      expect(res.json?.success).toBe(true);
    }
  });

  test("GET /support/chat/messages", async () => {
    const res = await apiCall(ctx, "GET", "/support/chat/messages?limit=50", {
      token,
    });
    expect(res.status).toBeLessThan(500);
  });

  test("POST /support/chat/messages", async () => {
    const res = await apiCall(ctx, "POST", "/support/chat/messages", {
      token,
      body: { text: "Automation hello" },
    });
    expect(res.status).toBeLessThan(500);
  });

  test("GET /settings/preferences", async () => {
    const res = await apiCall(ctx, "GET", "/settings/preferences", { token });
    expect(res.status).toBe(200);
  });

  test("PUT /settings/preferences", async () => {
    const res = await apiCall(ctx, "PUT", "/settings/preferences", {
      token,
      body: { language: "en" },
    });
    expect(res.status).toBeLessThan(500);
  });

  test("GET /notifications", async () => {
    const res = await apiCall(ctx, "GET", "/notifications?page=1&limit=20", {
      token,
    });
    expect(res.status).toBeLessThan(500);
  });

  test("PUT /notifications/read-all", async () => {
    const res = await apiCall(ctx, "PUT", "/notifications/read-all", { token });
    expect(res.status).toBeLessThan(500);
  });

  test("GET /config/cancel-reasons?context=standard", async () => {
    const res = await apiCall(ctx, "GET", "/config/cancel-reasons?context=standard", {
      token,
    });
    expect(res.status).toBeLessThan(500);
  });

  test("POST /locations/track", async () => {
    const res = await apiCall(ctx, "POST", "/locations/track", {
      token,
      body: {
        latitude: 13.0067,
        longitude: 80.2571,
        accuracy: 12,
        recordedAt: new Date().toISOString(),
      },
    });
    expect(res.status).toBeLessThan(500);
  });

  test("POST /push-token", async () => {
    const res = await apiCall(ctx, "POST", "/push-token", {
      token,
      body: {
        token: `automation-push-${Date.now()}`,
        platform: "android",
        deviceId: "rider-automation-device",
        appVersion: "1.3.0",
      },
    });
    expect(res.status).toBeLessThan(500);
  });
});

test.describe("Meta: OTP path status", () => {
  test("record whether OTP path was blocked", async () => {
    if (otpBlocked) {
      test.info().annotations.push({
        type: "blocked",
        description: otpBlockReason,
      });
    }
    expect(token).toBeTruthy();
  });
});
