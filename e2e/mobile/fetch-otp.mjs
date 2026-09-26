/**
 * Read live rider/picker OTP and order truth from MongoDB (selorg-service .env).
 * OTP is stored plaintext in picker_otps for non-production delivery.
 */
import fs from "node:fs";
import path from "node:path";
import dns from "node:dns";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVICE_ROOT = path.resolve(__dirname, "../../../selorg-service Ai");
const requireFromService = createRequire(path.join(SERVICE_ROOT, "package.json"));

function loadEnv() {
  const envPath = path.join(SERVICE_ROOT, ".env");
  if (!fs.existsSync(envPath)) throw new Error(`Missing ${envPath}`);
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
  if (process.platform === "win32") {
    try {
      dns.setServers(["8.8.8.8", "1.1.1.1"]);
    } catch {
      /* ignore */
    }
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withDb(work) {
  loadEnv();
  const mongoose = requireFromService("mongoose");
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
  });
  try {
    return await work(mongoose.connection.db);
  } finally {
    await mongoose.disconnect().catch(() => undefined);
  }
}

function otpIdentifier(target, { role = "rider", channel } = {}) {
  const raw = String(target || "").trim();
  const r = role === "picker" ? "picker" : "rider";
  if (raw.includes("@") || channel === "email") {
    return `${r}|email|${raw.toLowerCase()}`;
  }
  const phone = raw.replace(/\D/g, "").slice(-10);
  if (channel === "reg") return `${r}|reg|${phone}`;
  return `${r}|phone|${phone}`;
}

/** Legacy + role-scoped identifiers (backend moved to role|channel|value). */
function otpIdentifierCandidates(target, { role = "rider" } = {}) {
  const raw = String(target || "").trim();
  const r = role === "picker" ? "picker" : "rider";
  if (raw.includes("@")) {
    const email = raw.toLowerCase();
    return [`${r}|email|${email}`, `email|${email}`, email];
  }
  const phone = raw.replace(/\D/g, "").slice(-10);
  return [`${r}|phone|${phone}`, phone, `${r}|reg|${phone}`];
}

export async function fetchRiderOtp(phone, { attempts = 6, role = "rider" } = {}) {
  const candidates = otpIdentifierCandidates(phone, { role });
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      if (i > 0) await sleep(700 * i);
      return await withDb(async (db) => {
        const doc = await db.collection("picker_otps").findOne(
          { identifier: { $in: candidates }, verified: { $ne: true } },
          { sort: { updatedAt: -1, createdAt: -1 } },
        );
        if (!doc?.otp) throw new Error(`No unused OTP for ${candidates[0]}`);
        return {
          otp: String(doc.otp),
          expiresAt: doc.expiresAt ? new Date(doc.expiresAt).toISOString() : null,
          attempts: doc.attempts ?? 0,
          identifier: doc.identifier,
        };
      });
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error(`OTP fetch failed for ${candidates[0]}`);
}

export async function fetchOrderById(orderId) {
  return withDb(async (db) => {
    const { ObjectId } = requireFromService("mongodb");
    let query = { orderNumber: orderId };
    if (/^[a-f\d]{24}$/i.test(String(orderId))) {
      query = { $or: [{ _id: new ObjectId(orderId) }, { orderNumber: orderId }] };
    }
    const order = await db.collection("customer_orders").findOne(query);
    if (!order) return null;
    return {
      id: String(order._id),
      orderNumber: order.orderNumber || null,
      status: order.status || null,
      riderStage: order.riderStage || null,
      pickerId: order.pickerId ? String(order.pickerId) : null,
      offerHubKey: order.offerHubKey || null,
      deliveryType: order.deliveryType || null,
      deliveryFee: order.deliveryFee ?? null,
      riderPayout: order.riderPayout ?? null,
      bagCode: order.bagCode || null,
      dispatchBay: order.dispatchBay || null,
      deliveryOtp: order.deliveryOtp || null,
      otpVerified: !!order.otpVerified,
      otpAttempts: order.otpAttempts ?? 0,
      deliveredAt: order.deliveredAt ? new Date(order.deliveredAt).toISOString() : null,
      paymentStatus: order.paymentStatus || null,
      paymentMethod: order.paymentMethod?.methodType || order.paymentMethod || null,
      itemCount: Array.isArray(order.items) ? order.items.length : 0,
      itemNames: Array.isArray(order.items) ? order.items.map((i) => i.name).filter(Boolean) : [],
      codAmount: order.totalBill ?? order.codAmount ?? null,
      address: order.deliveryAddress
        ? [order.deliveryAddress.line1, order.deliveryAddress.city].filter(Boolean).join(", ")
        : null,
    };
  });
}

export async function fetchRiderUser(phone) {
  const digits = String(phone).replace(/\D/g, "").slice(-10);
  return withDb(async (db) => {
    const user = await db.collection("picker_users").findOne({ phone: digits });
    if (!user) return null;
    return {
      id: String(user._id),
      phone: user.phone,
      name: user.name || null,
      status: user.status || null,
      workforceRole: user.workforceRole || null,
      isOnline: !!user.isOnline,
      onlineSince: user.onlineSince ? new Date(user.onlineSince).toISOString() : null,
      currentLocationId: user.currentLocationId ? String(user.currentLocationId) : null,
      deliveryMode: user.deliveryMode || null,
      vehicleType: user.vehicle?.type || user.vehicleType || null,
      onboardingCompleted: user.onboardingCompleted ?? null,
      activeOrderId: user.activeOrderId ? String(user.activeOrderId) : null,
      sessionToken: user.sessionToken ? "present" : null,
    };
  });
}

export async function resetOtpWindow(target, { role = "rider" } = {}) {
  const candidates = otpIdentifierCandidates(target, { role });
  return withDb(async (db) => {
    await db.collection("picker_otps").deleteMany({ identifier: { $in: candidates } });
    return candidates[0];
  });
}

export async function ensureRiderEmail(phone, email) {
  const digits = String(phone).replace(/\D/g, "").slice(-10);
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized.includes("@")) throw new Error("Rider email is invalid");
  return withDb(async (db) => {
    const user = await db.collection("picker_users").findOne({ phone: digits });
    if (!user) throw new Error(`No picker user for ${digits}`);
    if (user.email && String(user.email).toLowerCase() === normalized) return normalized;
    if (user.email) return String(user.email).toLowerCase();
    const taken = await db.collection("picker_users").findOne({ email: normalized });
    if (taken) throw new Error(`Email already belongs to ${taken.phone || taken._id}`);
    await db.collection("picker_users").updateOne({ _id: user._id }, { $set: { email: normalized } });
    return normalized;
  });
}

export async function listAccountEmails() {
  return withDb(async (db) => {
    const rows = await db
      .collection("picker_users")
      .find(
        { email: { $exists: true, $nin: [null, ""] } },
        { projection: { phone: 1, email: 1, status: 1, name: 1, workforceRole: 1 } },
      )
      .limit(30)
      .toArray();
    return rows.map((u) => ({
      id: String(u._id),
      phone: u.phone || null,
      email: u.email || null,
      status: u.status || null,
      name: u.name || null,
      role: u.workforceRole || null,
    }));
  });
}

export async function discoverLiveData() {
  return withDb(async (db) => {
    const riders = await db
      .collection("picker_users")
      .find(
        { $or: [{ workforceRole: "rider" }, { workforceRole: { $exists: false } }] },
        {
          projection: {
            phone: 1,
            name: 1,
            status: 1,
            workforceRole: 1,
            isOnline: 1,
            currentLocationId: 1,
            deliveryMode: 1,
            onboardingCompleted: 1,
            vehicle: 1,
            vehicleType: 1,
          },
        },
      )
      .limit(40)
      .toArray();

    const offered = await db
      .collection("customer_orders")
      .find(
        {
          riderStage: "offered",
          pickerId: null,
          status: { $in: ["confirmed", "getting-packed"] },
        },
        {
          projection: {
            orderNumber: 1,
            status: 1,
            riderStage: 1,
            offerHubKey: 1,
            deliveryType: 1,
            deliveryFee: 1,
            bagCode: 1,
            dispatchBay: 1,
            offerExpiresAt: 1,
            items: 1,
          },
        },
      )
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    const hubs = await db
      .collection("picker_work_locations")
      .find({}, { projection: { warehouseKey: 1, name: 1, status: 1, isActive: 1 } })
      .limit(20)
      .toArray();

    return {
      riders: riders.map((u) => ({
        id: String(u._id),
        phone: u.phone,
        name: u.name || null,
        status: u.status || null,
        workforceRole: u.workforceRole || null,
        isOnline: !!u.isOnline,
        hub: u.currentLocationId ? String(u.currentLocationId) : null,
        deliveryMode: u.deliveryMode || null,
        vehicleType: u.vehicle?.type || u.vehicleType || null,
        onboardingCompleted: u.onboardingCompleted ?? null,
      })),
      offered: offered.map((o) => ({
        id: String(o._id),
        orderNumber: o.orderNumber || null,
        status: o.status,
        offerHubKey: o.offerHubKey || null,
        deliveryType: o.deliveryType || null,
        deliveryFee: o.deliveryFee ?? null,
        bagCode: o.bagCode || null,
        dispatchBay: o.dispatchBay || null,
        offerExpiresAt: o.offerExpiresAt ? new Date(o.offerExpiresAt).toISOString() : null,
        itemCount: Array.isArray(o.items) ? o.items.length : 0,
        seeded: String(o.orderNumber || "").startsWith("rider-automation-seed"),
      })),
      hubs: hubs.map((h) => ({
        id: String(h._id),
        key: h.warehouseKey || null,
        name: h.name || null,
        status: h.status || null,
        isActive: h.isActive ?? null,
      })),
    };
  });
}
