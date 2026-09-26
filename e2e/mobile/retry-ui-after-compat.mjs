/**
 * Dismiss Android 16KB compat dialog then spot-check Rider login UI.
 * Appends results into cross-admin-rider results (env blocker retry).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ARTIFACTS,
  clearFocusedField,
  dismissDialogs,
  dumpUi,
  ensureReversePorts,
  findByText,
  findEditTexts,
  forceStop,
  grantRuntimePermissions,
  hideKeyboard,
  launchApp,
  prepareDeviceForUiAutomation,
  screenshot,
  sleep,
  tap,
  typeText,
  visibleTexts,
  waitForText,
} from "./adb-driver.mjs";
import { ensureRiderEmail, fetchRiderOtp, fetchRiderUser, resetOtpWindow } from "./fetch-otp.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../../test-results/cross-admin-rider/ui-compat-retry.json");
const EMAIL = "automation.picker@selorg.com";
const PHONE = "9556735105";

async function tapLabel(text) {
  const found = await waitForText(text, { exact: false, timeoutMs: 10000, partial: true });
  const b = found.hits[0].bounds;
  tap(b.cx, Math.min(b.cy, b.y1 + 30));
  await sleep(700);
}

const result = { at: new Date().toISOString(), steps: [] };
function note(id, status, actual) {
  result.steps.push({ id, status, actual });
  console.log(`[${status}] ${id} — ${actual}`);
}

prepareDeviceForUiAutomation();
grantRuntimePermissions();
ensureReversePorts();
forceStop();
await sleep(800);
launchApp(false);
await sleep(5000);
await dismissDialogs(6);

try {
  await tapLabel("Don't Show Again");
  note("COMPAT-1", "PASS", "Tapped Don't Show Again");
} catch {
  try {
    await tapLabel("OK");
    note("COMPAT-1", "PASS", "Tapped OK");
  } catch (e) {
    note("COMPAT-1", "FAIL", e.message);
  }
}
await sleep(1500);
try {
  await tapLabel("OK");
} catch {
  /* optional second OK */
}
await sleep(4000);

let dump = dumpUi("after-compat");
let texts = visibleTexts(dump.nodes);
note("COMPAT-2", /Log In|Selorg Rider|Sign in|Welcome/i.test(texts.join(" ")) ? "PASS" : "FAIL", texts.slice(0, 20).join(" | "));
screenshot("after-compat-ok");

if (!/Log In|Selorg Rider|Sign in|Welcome/i.test(texts.join(" "))) {
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  process.exit(0);
}

try {
  if (texts.some((t) => /Log In/i.test(t))) await tapLabel("Log In");
} catch {
  /* already */
}
await sleep(1000);
try {
  await tapLabel("Email");
} catch {
  /* maybe already email */
}
await sleep(400);
await ensureRiderEmail(PHONE, EMAIL);
await resetOtpWindow(EMAIL);

dump = dumpUi("login-field");
const edits = findEditTexts(dump.nodes).filter((n) => n.bounds.h > 20 && n.bounds.w > 40);
if (!edits.length) {
  note("UI-LOGIN-1", "FAIL", "No email field");
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  process.exit(0);
}
tap(edits[0].bounds.cx, edits[0].bounds.cy);
await sleep(300);
clearFocusedField(24);
typeText(EMAIL);
hideKeyboard();
await tapLabel("Send OTP");
await sleep(2000);

let otpOk = false;
try {
  await waitForText("Verify OTP", { timeoutMs: 25000, partial: true });
  otpOk = true;
} catch {
  otpOk = false;
}
const otpDoc = otpOk ? await fetchRiderOtp(EMAIL).catch((e) => ({ error: e.message })) : null;
note(
  "UI-LOGIN-2",
  otpOk && otpDoc?.otp ? "PASS" : "FAIL",
  `otpScreen=${otpOk} stored=${otpDoc?.otp ? "yes" : otpDoc?.error || "no"}`,
);

if (otpOk && otpDoc?.otp) {
  const edits2 = findEditTexts(dumpUi("otp").nodes).filter((n) => n.bounds.h > 20);
  if (edits2[0]) {
    tap(edits2[0].bounds.cx, edits2[0].bounds.cy);
    clearFocusedField(8);
    typeText(otpDoc.otp);
    hideKeyboard();
  }
  try {
    await tapLabel("Verify & Continue");
  } catch {
    try {
      await tapLabel("Verify");
    } catch {
      /* */
    }
  }
  await sleep(5000);
  dump = dumpUi("home");
  texts = visibleTexts(dump.nodes);
  const landed = /Welcome|Today|offline|Orders|Choose your hub|Vehicle/i.test(texts.join(" "));
  note("UI-LOGIN-3", landed ? "PASS" : "FAIL", texts.slice(0, 25).join(" | "));
  screenshot("rider-ui-home");
  const user = await fetchRiderUser(PHONE);
  note("UI-DB-1", user?.status === "ACTIVE" ? "PASS" : "FAIL", JSON.stringify(user));
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
console.log("WROTE", OUT);
