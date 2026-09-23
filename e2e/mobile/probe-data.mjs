import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { discoverLiveData } from "./fetch-otp.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, "../../test-results/rider-live-data.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
const data = await discoverLiveData();
fs.writeFileSync(out, JSON.stringify(data, null, 2));
console.log(JSON.stringify({
  riders: data.riders.length,
  offered: data.offered.length,
  hubs: data.hubs.length,
  phones: data.riders.map((r) => ({ phone: r.phone, status: r.status, role: r.workforceRole, hub: r.hub, mode: r.deliveryMode })),
  orders: data.offered.map((o) => ({ n: o.orderNumber, hub: o.offerHubKey, type: o.deliveryType, seeded: o.seeded, items: o.itemCount })),
  hubKeys: data.hubs.map((h) => h.key || h.name),
}, null, 2));
