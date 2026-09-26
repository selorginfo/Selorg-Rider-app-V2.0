/**
 * Post-fix verification for Admin ↔ Rider sync (no UI).
 * Run against live :3333 after deploying backend fixes.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API = (process.env.API_BASE_URL || "http://127.0.0.1:3333").replace(/\/$/, "");
const ADMIN_EMAIL = process.env.ADMIN_TEST_EMAIL || "hemanathc0112@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_TEST_PASSWORD || "Selorg@2024";
const RIDER_ID = process.env.RIDER_ID || "6aaa78006d1b1c92cacfd432";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../../test-results/cross-admin-rider/post-fix-verify.json");

const results = [];
function record(id, status, actual) {
  results.push({ id, status, actual, at: new Date().toISOString() });
  console.log(`[${status}] ${id} — ${actual}`);
}

async function api(method, url, { token, body } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

const loginOps = await api("POST", `${API}/api/v1/admin/auth/login`, {
  body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: "Operations Admin" },
});
record(
  "V-LOGIN-OPS",
  loginOps.status === 200 && loginOps.json?.data?.token ? "PASS" : "FAIL",
  `http=${loginOps.status}`,
);
const token = loginOps.json?.data?.token;
if (!token) {
  fs.writeFileSync(OUT, JSON.stringify({ results }, null, 2));
  process.exit(1);
}

const riders = await api("GET", `${API}/api/v1/admin/riders?limit=50`, { token });
const list = Array.isArray(riders.json?.data) ? riders.json.data : [];
const sample = list.find((r) => r.id === RIDER_ID) || list[0];
const fieldsOk =
  sample &&
  (sample.phone || sample.mobile) &&
  sample.hub &&
  sample.hub !== "—" &&
  (sample.vehicleType || sample.vehicle);
record(
  "V-DIR-FIELDS",
  fieldsOk ? "PASS" : "FAIL",
  `n=${list.length} sample=${JSON.stringify({ id: sample?.id, phone: sample?.phone, hub: sample?.hub, vehicle: sample?.vehicleType, online: sample?.isOnline })}`,
);

const counts = await api("GET", `${API}/api/v1/rider/dashboard/counts`, { token });
const c = counts.json?.data || {};
record(
  "V-COUNTS",
  Number(c.total) > 0 ? "PASS" : "FAIL",
  JSON.stringify(c),
);

const map = await api("GET", `${API}/api/v1/rider/dispatch/map/riders`, { token });
const mapRiders = map.json?.data?.riders || [];
record("V-MAP", mapRiders.length > 0 ? "PASS" : "FAIL", `riders=${mapRiders.length}`);

const put = await api("PUT", `${API}/api/v1/rider/${RIDER_ID}`, {
  token,
  body: { status: "online", hub: "DS-Adyar-01" },
});
record("V-PUT", put.status === 200 ? "PASS" : "FAIL", `http=${put.status}`);

const un = await api("GET", `${API}/api/v1/rider/dispatch/unassigned`, { token });
record(
  "V-UNASSIGNED",
  un.status === 200 ? "PASS" : "FAIL",
  `total=${un.json?.data?.total} sources=${(un.json?.data?.orders || []).map((o) => o.source).join(",")}`,
);

const detail = await api("GET", `${API}/api/v1/admin/riders/${RIDER_ID}`, { token });
record(
  "V-DETAIL",
  detail.status === 200 && detail.json?.data?.phone ? "PASS" : "FAIL",
  JSON.stringify(detail.json?.data)?.slice(0, 200),
);

// ── Partial-issue remediations: HR / shifts / payouts / notifications ─────────
const hr = await api("GET", `${API}/api/v1/rider/hr/riders?limit=20`, { token });
const hrRiders = hr.json?.data?.riders || [];
record(
  "V-HR-LIST",
  hr.status === 200 && hrRiders.length > 0 && hr.json?.data?.source === "picker_users" ? "PASS" : "FAIL",
  `http=${hr.status} n=${hrRiders.length} source=${hr.json?.data?.source} sample=${hrRiders[0]?.name || "—"}`,
);

const hrSum = await api("GET", `${API}/api/v1/rider/hr/dashboard/summary`, { token });
record(
  "V-HR-SUMMARY",
  hrSum.status === 200 && Number(hrSum.json?.data?.total) > 0 ? "PASS" : "FAIL",
  JSON.stringify(hrSum.json?.data),
);

const shifts = await api("GET", `${API}/api/v1/rider/shifts?limit=50`, { token });
const shiftItems = shifts.json?.data?.items || [];
record(
  "V-SHIFTS",
  shifts.status === 200 && (shiftItems.length > 0 || Number(shifts.json?.data?.total) >= 0) ? "PASS" : "FAIL",
  `http=${shifts.status} n=${shiftItems.length} total=${shifts.json?.data?.total} source=${shifts.json?.data?.source}`,
);

const roster = await api("GET", `${API}/api/v1/admin/picker/shift-change-requests`, { token });
const rosterReqs = roster.json?.data?.requests || [];
record(
  "V-ROSTER",
  roster.status === 200 ? "PASS" : "FAIL",
  `http=${roster.status} n=${rosterReqs.length} source=${roster.json?.data?.source}`,
);

const payouts = await api("GET", `${API}/api/v1/admin/finance/rider-cash/payouts`, { token });
const payoutItems = payouts.json?.data?.items || [];
record(
  "V-PAYOUTS",
  payouts.status === 200 && payouts.json?.data?.source ? "PASS" : "FAIL",
  `http=${payouts.status} n=${payoutItems.length} source=${payouts.json?.data?.source} total=${payouts.json?.data?.total}`,
);

const wd = await api("GET", `${API}/api/v1/admin/finance/picker-withdrawals`, { token });
record(
  "V-WITHDRAWALS",
  wd.status === 200 && (wd.json?.data?.source === "picker_withdrawal_requests" || Array.isArray(wd.json?.data?.items))
    ? "PASS"
    : "FAIL",
  `http=${wd.status} n=${(wd.json?.data?.items || []).length} source=${wd.json?.data?.source}`,
);

const notif = await api("GET", `${API}/api/v1/rider/notifications?limit=20`, { token });
record(
  "V-NOTIFS",
  notif.status === 200 ? "PASS" : "FAIL",
  `http=${notif.status} n=${(notif.json?.data?.notifications || []).length} source=${notif.json?.data?.source}`,
);

const docs = await api("GET", `${API}/api/v1/rider/hr/documents?limit=20`, { token });
record(
  "V-DOCS",
  docs.status === 200 && docs.json?.data?.source === "picker_documents" ? "PASS" : "FAIL",
  `http=${docs.status} n=${(docs.json?.data?.documents || []).length} source=${docs.json?.data?.source}`,
);

const pass = results.filter((r) => r.status === "PASS").length;
const fail = results.filter((r) => r.status === "FAIL").length;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ updatedAt: new Date().toISOString(), pass, fail, results }, null, 2));
console.log(`VERIFY_DONE pass=${pass} fail=${fail} -> ${OUT}`);
process.exit(fail ? 1 : 0);
