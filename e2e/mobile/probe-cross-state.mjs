/**
 * Read-only probe: customer_orders, picker_users, riders collection parity.
 * Does not mutate data.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVICE = path.resolve(__dirname, "../../../selorg-service Ai");
const requireFromService = createRequire(path.join(SERVICE, "package.json"));

function loadEnv() {
  const envPath = path.join(SERVICE, ".env");
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
}

loadEnv();
const mongoose = requireFromService("mongoose");
await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
const db = mongoose.connection.db;

const recent = await db
  .collection("customer_orders")
  .find({ orderNumber: /^ORD-/ })
  .sort({ createdAt: -1 })
  .limit(20)
  .project({
    orderNumber: 1,
    status: 1,
    riderStage: 1,
    pickerId: 1,
    offerHubKey: 1,
    deliveryType: 1,
    createdAt: 1,
    assignedRiderId: 1,
    riderId: 1,
  })
  .toArray();

const byStage = await db
  .collection("customer_orders")
  .aggregate([{ $match: { riderStage: { $ne: null } } }, { $group: { _id: "$riderStage", n: { $sum: 1 } } }])
  .toArray();

const ridersCount = await db.collection("riders").countDocuments();
const riderDocs = await db.collection("riders").find({}).limit(5).toArray();
const collections = (await db.listCollections().toArray())
  .map((c) => c.name)
  .filter((n) => /rider|picker_user|customer_order/i.test(n));

const phones = ["9556735105", "9698790921", "9556782317", "8098098450"];
const users = [];
for (const phone of phones) {
  const u = await db.collection("picker_users").findOne({ phone });
  if (!u) {
    users.push({ phone, missing: true });
    continue;
  }
  users.push({
    id: String(u._id),
    phone: u.phone,
    name: u.name || null,
    email: u.email || null,
    status: u.status || null,
    workforceRole: u.workforceRole ?? null,
    isOnline: !!u.isOnline,
    hub: u.currentLocationId || null,
    deliveryMode: u.deliveryMode || null,
    vehicleType: u.vehicle?.type || u.vehicleType || null,
    activeOrderId: u.activeOrderId ? String(u.activeOrderId) : null,
  });
}

const out = {
  at: new Date().toISOString(),
  collections,
  ridersCollectionCount: ridersCount,
  ridersSample: riderDocs.map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status,
    zone: r.zone,
    currentOrderId: r.currentOrderId,
  })),
  riderStageCounts: byStage,
  recentOrders: recent.map((o) => ({
    n: o.orderNumber,
    status: o.status,
    stage: o.riderStage,
    picker: o.pickerId ? String(o.pickerId) : null,
    hub: o.offerHubKey,
    type: o.deliveryType,
    created: o.createdAt,
  })),
  users,
};

const dest = path.join(__dirname, "../../test-results/cross-admin-rider-probe.json");
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
await mongoose.disconnect();
