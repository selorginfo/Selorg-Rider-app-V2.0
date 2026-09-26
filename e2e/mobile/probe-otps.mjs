import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVICE = path.resolve(__dirname, "../../../selorg-service Ai");
const req = createRequire(path.join(SERVICE, "package.json"));
const env = fs.readFileSync(path.join(SERVICE, ".env"), "utf8");
for (const line of env.split(/\r?\n/)) {
  const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
  if (!m) continue;
  let v = m[2].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (!process.env[m[1]]) process.env[m[1]] = v;
}
const mongoose = req("mongoose");
await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
const db = mongoose.connection.db;
const recent = await db
  .collection("picker_otps")
  .find({})
  .sort({ updatedAt: -1 })
  .limit(15)
  .toArray();
console.log(
  JSON.stringify(
    recent.map((d) => ({
      identifier: d.identifier,
      otp: d.otp,
      verified: d.verified,
      channel: d.channel,
      purpose: d.purpose,
      role: d.workforceRole || d.role,
      expiresAt: d.expiresAt,
      updatedAt: d.updatedAt,
      keys: Object.keys(d),
    })),
    null,
    2,
  ),
);
await mongoose.disconnect();
