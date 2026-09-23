import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });
dotenv.config({
  path: path.join(__dirname, "..", "..", "..", "selorg-service", ".env"),
});

/**
 * Normalize host root. Rider `.env` uses `API_BASE_URL=http://host:3333/api/v1`
 * (app client path). Automation helpers need the server origin only.
 */
function stripApiSuffix(raw: string): string {
  return raw
    .trim()
    .replace(/\/$/, "")
    .replace(/\/api\/v1$/i, "")
    .replace(/\/$/, "");
}

const rawApi =
  process.env.API_BASE_URL ||
  process.env.DEV_API_BASE_URL ||
  "http://127.0.0.1:3333";

/** Shared env for real-backend Rider automation (no mocks). */
export const API_BASE = stripApiSuffix(rawApi);

export const PICKER_PREFIX = "/api/v1/picker";

/** Rider app configured base (includes /api/v1). */
export const APP_API_BASE = (
  process.env.APP_API_BASE_URL ||
  process.env.DEV_API_BASE_URL ||
  `${API_BASE}/api/v1`
).replace(/\/$/, "");

/** Test rider phone used for OTP send / verify journeys. */
export const TEST_MOBILE = (
  process.env.RIDER_OTP_TEST_MOBILE ||
  process.env.OTP_TEST_MOBILE ||
  "9698790921"
)
  .replace(/\D/g, "")
  .slice(-10);

export const JWT_SECRET =
  process.env.PICKER_JWT_SECRET ||
  process.env.JWT_SECRET ||
  "picker-app-secret-change-in-production";

export const MONGO_URI = process.env.MONGO_URI || "";

export function pickerUrl(pathSuffix: string): string {
  const p = pathSuffix.startsWith("/") ? pathSuffix : `/${pathSuffix}`;
  return `${API_BASE}${PICKER_PREFIX}${p}`;
}
