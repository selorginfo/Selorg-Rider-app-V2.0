import dns from "node:dns";
import { randomUUID } from "node:crypto";
import { MongoClient, ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import type { APIRequestContext } from "@playwright/test";
import { expect } from "@playwright/test";
import { apiCall } from "./api";
import { JWT_SECRET, MONGO_URI, TEST_MOBILE } from "./env";

const PICKER_AUD = "picker";

export type RiderAuthSession = {
  token: string;
  userId: string;
  phone: string;
  status: string;
  source: "otp_verify" | "minted_jwt";
  otpBlocked?: boolean;
  otpBlockReason?: string;
};

function configureDnsResolvers() {
  const fromEnv = (process.env.DNS_SERVERS || process.env.MONGO_DNS_SERVERS || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && s.toLowerCase() !== "system");
  const usePublicDns =
    process.env.MONGO_USE_PUBLIC_DNS === "true" ||
    (process.env.MONGO_USE_PUBLIC_DNS !== "false" &&
      process.platform === "win32" &&
      fromEnv.length === 0);
  const defaults = usePublicDns ? ["8.8.8.8", "1.1.1.1"] : [];
  const servers = fromEnv.length > 0 ? fromEnv : defaults;
  if (servers.length > 0) dns.setServers(servers);
}

async function resolveSrvMongoUri(srvUri: string): Promise<string> {
  if (!srvUri || !srvUri.startsWith("mongodb+srv://")) return srvUri;

  const withoutScheme = srvUri.slice("mongodb+srv://".length);
  const atIndex = withoutScheme.lastIndexOf("@");
  const credsPart = atIndex >= 0 ? withoutScheme.slice(0, atIndex) : "";
  const hostAndRest =
    atIndex >= 0 ? withoutScheme.slice(atIndex + 1) : withoutScheme;
  const slashIndex = hostAndRest.indexOf("/");
  const hostname =
    slashIndex >= 0 ? hostAndRest.slice(0, slashIndex) : hostAndRest.split("?")[0];
  const pathAndQuery = slashIndex >= 0 ? hostAndRest.slice(slashIndex) : "";

  const srvRecords = await dns.promises.resolveSrv(`_mongodb._tcp.${hostname}`);
  const hosts = srvRecords.map((r) => `${r.name}:${r.port}`).join(",");

  const pathOnly = pathAndQuery.split("?")[0] || "";
  const params = new URLSearchParams(
    pathAndQuery.includes("?")
      ? pathAndQuery.slice(pathAndQuery.indexOf("?") + 1)
      : "",
  );
  if (!params.has("ssl")) params.set("ssl", "true");
  if (credsPart && !params.has("authSource")) params.set("authSource", "admin");
  if (!params.has("retryWrites")) params.set("retryWrites", "true");
  if (!params.has("w")) params.set("w", "majority");

  const query = params.toString();
  const prefix = credsPart ? `mongodb://${credsPart}@` : "mongodb://";
  return `${prefix}${hosts}${pathOnly}${query ? `?${query}` : ""}`;
}

async function prepareMongoUri(uri: string): Promise<string> {
  configureDnsResolvers();
  if (!uri.startsWith("mongodb+srv://")) return uri;
  try {
    return await resolveSrvMongoUri(uri);
  } catch {
    return uri;
  }
}

async function withMongo<T>(
  fn: (db: ReturnType<MongoClient["db"]>) => Promise<T>,
): Promise<T> {
  if (!MONGO_URI) {
    throw new Error(
      "MONGO_URI missing — load selorg-service/.env for auth helpers",
    );
  }
  const uri = await prepareMongoUri(MONGO_URI);
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
  });
  await client.connect();
  try {
    return await fn(client.db());
  } finally {
    await client.close();
  }
}

/** Shared Mongo accessor for test seed helpers (real DB only). */
export async function withMongoDb<T>(
  fn: (db: ReturnType<MongoClient["db"]>) => Promise<T>,
): Promise<T> {
  return withMongo(fn);
}

/** Ensure an ACTIVE test rider exists and return a valid Bearer token (sid-bound). */
export async function mintActiveRiderToken(
  phone = TEST_MOBILE,
): Promise<RiderAuthSession> {
  return withMongo(async (db) => {
    const users = db.collection("picker_users");
    let user = await users.findOne({ phone });
    const sessionToken = randomUUID();
    if (!user) {
      const insert = await users.insertOne({
        phone,
        name: "Rider Automation Tester",
        status: "ACTIVE",
        onboardingCompleted: true,
        sessionToken,
        workforceRole: "rider",
        loginMethod: "mobile",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      user = await users.findOne({ _id: insert.insertedId });
    } else {
      await users.updateOne(
        { _id: user._id },
        {
          $set: {
            status: "ACTIVE",
            sessionToken,
            updatedAt: new Date(),
            ...(user.workforceRole ? {} : { workforceRole: "rider" }),
          },
        },
      );
      user = await users.findOne({ _id: user._id });
    }
    if (!user) throw new Error("Failed to upsert test rider");
    const userId = String(user._id);
    const token = jwt.sign(
      {
        sub: userId,
        userId,
        id: userId,
        sid: sessionToken,
        workforceRole: user.workforceRole || "rider",
      },
      JWT_SECRET,
      { expiresIn: "7d", audience: PICKER_AUD },
    );
    return {
      token,
      userId,
      phone,
      status: String(user.status || "ACTIVE"),
      source: "minted_jwt",
    };
  });
}

/** Read plaintext OTP from picker_otps after a successful send. */
export async function readStoredOtp(identifier: string): Promise<string | null> {
  return withMongo(async (db) => {
    const row = await db.collection("picker_otps").findOne({
      identifier,
      verified: false,
      expiresAt: { $gt: new Date() },
    });
    return row?.otp ? String(row.otp) : null;
  });
}

/**
 * Full OTP login matching authApi.verifyOtp contract.
 * Falls back to minted JWT if SMS provider fails (classified as blocked OTP path).
 */
export async function loginRider(
  ctx: APIRequestContext,
  opts?: { phone?: string; preferMint?: boolean },
): Promise<RiderAuthSession> {
  const phone = (opts?.phone || TEST_MOBILE).replace(/\D/g, "").slice(-10);

  if (opts?.preferMint) {
    return mintActiveRiderToken(phone);
  }

  const send = await apiCall<{
    channel?: string;
    deliveryStatus?: string;
    message?: string;
    otp?: string;
  }>(ctx, "POST", "/auth/send-otp", {
    body: { phone, preferredChannel: "sms" },
  });

  if (send.networkError) {
    throw new Error(`Backend unreachable during send-otp: ${send.networkError}`);
  }

  if (send.status !== 200 || !send.json?.success) {
    const minted = await mintActiveRiderToken(phone);
    return {
      ...minted,
      otpBlocked: true,
      otpBlockReason: `send-otp status=${send.status} body=${JSON.stringify(send.json)}`,
    };
  }

  let otp =
    typeof send.json?.data?.otp === "string" ? send.json.data.otp : null;
  if (!otp) {
    await new Promise((r) => setTimeout(r, 400));
    otp = await readStoredOtp(phone);
  }
  if (!otp) {
    const minted = await mintActiveRiderToken(phone);
    return {
      ...minted,
      otpBlocked: true,
      otpBlockReason:
        "OTP not found in response or picker_otps after successful send",
    };
  }

  const verify = await apiCall<{
    token: string;
    user?: { id: string; phone?: string | null; status?: string };
  }>(ctx, "POST", "/auth/verify-otp", {
    body: { phone, otp, preferredChannel: "sms", intent: "signup" },
  });

  expect(
    verify.status,
    `verify-otp failed: ${JSON.stringify(verify.json)}`,
  ).toBe(200);
  expect(verify.json?.data?.token).toBeTruthy();

  await withMongo(async (db) => {
    await db.collection("picker_users").updateOne(
      { _id: new ObjectId(verify.json!.data!.user!.id) },
      { $set: { status: "ACTIVE", updatedAt: new Date() } },
    );
  });

  return {
    token: verify.json!.data!.token,
    userId: verify.json!.data!.user!.id,
    phone,
    status: "ACTIVE",
    source: "otp_verify",
  };
}

export async function forceActiveStatus(userId: string): Promise<void> {
  await withMongo(async (db) => {
    await db.collection("picker_users").updateOne(
      { _id: new ObjectId(userId) },
      { $set: { status: "ACTIVE", updatedAt: new Date() } },
    );
  });
}
