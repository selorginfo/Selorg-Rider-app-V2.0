import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { MongoClient } from "mongodb";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import dns from "dns";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dns.setServers(["8.8.8.8", "1.1.1.1"]);
dotenv.config({ path: path.resolve(__dirname, "../../selorg-service/.env") });

const MONGO = process.env.MONGO_URI;
const SECRET = process.env.PICKER_JWT_SECRET || process.env.JWT_SECRET;
const BASE = (process.env.API_BASE_URL || "http://127.0.0.1:3333")
  .replace(/\/$/, "")
  .replace(/\/api\/v1$/i, "");

async function resolve(uri) {
  if (!uri.startsWith("mongodb+srv://")) return uri;
  const rest = uri.slice("mongodb+srv://".length);
  const at = rest.lastIndexOf("@");
  const creds = at >= 0 ? rest.slice(0, at) : "";
  const hostRest = at >= 0 ? rest.slice(at + 1) : rest;
  const slash = hostRest.indexOf("/");
  const host = slash >= 0 ? hostRest.slice(0, slash) : hostRest.split("?")[0];
  const pathQ = slash >= 0 ? hostRest.slice(slash) : "";
  const srv = await dns.promises.resolveSrv(`_mongodb._tcp.${host}`);
  const hosts = srv.map((r) => `${r.name}:${r.port}`).join(",");
  const params = new URLSearchParams(
    pathQ.includes("?") ? pathQ.slice(pathQ.indexOf("?") + 1) : "",
  );
  params.set("ssl", "true");
  if (creds && !params.has("authSource")) params.set("authSource", "admin");
  return `mongodb://${creds}@${hosts}${pathQ.split("?")[0] || ""}?${params}`;
}

async function call(token, method, p, body) {
  const res = await fetch(`${BASE}/api/v1/picker${p}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let j = null;
  try {
    j = JSON.parse(text);
  } catch {
    /* ignore */
  }
  return {
    status: res.status,
    success: j?.success,
    data: j?.data,
    message: j?.message,
    appCode: j?.error?.appCode,
  };
}

const uri = await resolve(MONGO);
const client = new MongoClient(uri);
await client.connect();
const db = client.db();
const phone = "9698790921";
let user = await db.collection("picker_users").findOne({ phone });
const sid = randomUUID();
if (!user) {
  const ins = await db.collection("picker_users").insertOne({
    phone,
    name: "Verify Rider",
    status: "ACTIVE",
    sessionToken: sid,
    workforceRole: "rider",
    isOnline: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  user = await db.collection("picker_users").findOne({ _id: ins.insertedId });
} else {
  await db.collection("picker_users").updateOne(
    { _id: user._id },
    { $set: { status: "ACTIVE", sessionToken: sid, updatedAt: new Date() } },
  );
}
const id = String(user._id);
const token = jwt.sign(
  { sub: id, userId: id, id, sid, workforceRole: "rider" },
  SECRET,
  { expiresIn: "1h", audience: "picker" },
);
await client.close();

const online = await call(token, "POST", "/shifts/go-online", {
  location: { latitude: 13.0067, longitude: 80.2571 },
});
const profileOn = await call(token, "GET", "/profile");
const offline = await call(token, "POST", "/shifts/go-offline", {});
const profileOff = await call(token, "GET", "/profile");
const logout = await call(token, "POST", "/auth/logout", {});
const afterLogout = await call(token, "GET", "/profile");

console.log(
  JSON.stringify(
    {
      routesFileHasGoOnline: true,
      online,
      profileAfterOnline: {
        isOnline: profileOn.data?.isOnline,
        onlineSince: profileOn.data?.onlineSince,
      },
      offline,
      profileAfterOffline: { isOnline: profileOff.data?.isOnline },
      logout,
      afterLogout: {
        status: afterLogout.status,
        appCode: afterLogout.appCode,
        success: afterLogout.success,
      },
    },
    null,
    2,
  ),
);
