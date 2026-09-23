/**
 * Android UI driver via adb + uiautomator.
 * Same harness as selorg-picker-app, selorg-customer-app, and selorg-hsd-app.
 * Package defaults to the Rider app. Does not replace Playwright API specs.
 */
import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const ARTIFACTS = path.join(ROOT, "test-results", "mobile-artifacts");
const PACKAGE = process.env.ANDROID_PACKAGE || "com.selorgriderapp";
const SERIAL = process.env.ANDROID_SERIAL || "emulator-5554";

fs.mkdirSync(ARTIFACTS, { recursive: true });

function adb(args, opts = {}) {
  const bin = process.env.ADB_PATH || "adb";
  const full = ["-s", SERIAL, ...args];
  try {
    return execFileSync(bin, full, {
      encoding: "utf8",
      timeout: opts.timeout ?? 60_000,
      maxBuffer: 20 * 1024 * 1024,
      // adb push prints progress to stderr — keep it out of the PowerShell error stream
      stdio: opts.stdio ?? ["ignore", "pipe", "pipe"],
      ...opts,
    });
  } catch (err) {
    const msg = err?.stderr || err?.stdout || err?.message || String(err);
    const e = new Error(`adb ${full.join(" ")} failed: ${msg}`);
    e.cause = err;
    throw e;
  }
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function prepareDeviceForUiAutomation() {
  // Animations frequently cause "could not get idle state" uiautomator dump failures.
  for (const [k, v] of [
    ["window_animation_scale", "0"],
    ["transition_animation_scale", "0"],
    ["animator_duration_scale", "0"],
  ]) {
    try {
      adb(["shell", "settings", "put", "global", k, v]);
    } catch {
      /* ignore */
    }
  }
}

export function grantRuntimePermissions() {
  const perms = [
    "android.permission.ACCESS_FINE_LOCATION",
    "android.permission.ACCESS_COARSE_LOCATION",
    "android.permission.POST_NOTIFICATIONS",
    "android.permission.CAMERA",
    "android.permission.READ_MEDIA_IMAGES",
  ];
  for (const p of perms) {
    try {
      adb(["shell", "pm", "grant", PACKAGE, p]);
    } catch {
      /* older API levels / missing perms */
    }
  }
}

export function ensureReversePorts() {
  const maps = [
    ["3333", "3333"],
    ["8083", "8083"],
    // Emulator default packager port. Another Metro (picker, RN 0.87) owns host 8081.
    ["8081", "8083"],
  ];
  for (const [devicePort, hostPort] of maps) {
    try {
      adb(["reverse", `tcp:${devicePort}`, `tcp:${hostPort}`]);
    } catch {
      /* ignore */
    }
  }
  try {
    adb(["shell", "settings", "put", "global", "debug_http_host", "localhost:8083"]);
  } catch {
    /* ignore */
  }
}

function metroPrefsContainHost() {
  try {
    const xml = adb([
      "shell",
      "run-as",
      PACKAGE,
      "cat",
      "shared_prefs/com.selorgriderapp_preferences.xml",
    ]);
    return String(xml).includes("localhost:8083");
  } catch {
    return false;
  }
}

export function ensureMetroHostPrefs() {
  // RN PackagerConnectionSettings reads SharedPreferences key debug_http_host.
  // Must exist BEFORE the first JS load, or the emulator uses 10.0.2.2:8081
  // (the picker Metro on this machine, React Native 0.87).
  const xml = `<?xml version='1.0' encoding='utf-8' standalone='yes' ?>
<map>
    <string name="debug_http_host">localhost:8083</string>
</map>
`;
  const local = path.join(ARTIFACTS, "com.selorgriderapp_preferences.xml");
  fs.writeFileSync(local, xml, "utf8");
  try {
    adb(["shell", "run-as", PACKAGE, "mkdir", "-p", "shared_prefs"]);
  } catch {
    /* dir may already exist */
  }
  for (let i = 0; i < 4 && !metroPrefsContainHost(); i++) {
    try {
      adb(["push", local, "/data/local/tmp/rn_prefs.xml"], { timeout: 15_000 });
      adb(
        [
          "shell",
          "run-as",
          PACKAGE,
          "cp",
          "/data/local/tmp/rn_prefs.xml",
          "shared_prefs/com.selorgriderapp_preferences.xml",
        ],
        { timeout: 15_000 },
      );
    } catch {
      /* retry */
    }
    if (!metroPrefsContainHost()) sleepSync(400);
  }
  try {
    adb(["shell", "pm", "grant", PACKAGE, "android.permission.ACCESS_LOCAL_NETWORK"]);
  } catch {
    /* optional on older APIs */
  }
}

export function launchApp(clearData = false) {
  if (clearData) {
    try {
      adb(["shell", "pm", "clear", PACKAGE]);
    } catch {
      /* ignore */
    }
    try {
      adb(["shell", "settings", "put", "global", "debug_http_host", "localhost:8083"]);
    } catch {
      /* ignore */
    }
    grantRuntimePermissions();
    ensureReversePorts();
    // Create the app data dir, then stop before a wrong Metro (10.0.2.2:8081) bundle is used.
    adb([
      "shell",
      "am",
      "start",
      "-n",
      `${PACKAGE}/.MainActivity`,
      "-a",
      "android.intent.action.MAIN",
      "-c",
      "android.intent.category.LAUNCHER",
    ]);
    sleepSync(2500);
    try {
      adb(["shell", "am", "force-stop", PACKAGE]);
    } catch {
      /* ignore */
    }
    sleepSync(500);
    ensureMetroHostPrefs();
    if (!metroPrefsContainHost()) {
      throw new Error("Rider Metro host preference was not written");
    }
    try {
      adb(["shell", "run-as", PACKAGE, "sh", "-c", "rm -rf cache/* files/*"]);
    } catch {
      /* ignore */
    }
    sleepSync(400);
  } else {
    ensureMetroHostPrefs();
  }
  adb([
    "shell",
    "am",
    "start",
    "-n",
    `${PACKAGE}/.MainActivity`,
    "-a",
    "android.intent.action.MAIN",
    "-c",
    "android.intent.category.LAUNCHER",
  ]);
  try {
    sleepSync(1200);
    ensureMetroHostPrefs();
  } catch {
    /* ignore */
  }
}

export function forceStop() {
  try {
    adb(["shell", "am", "force-stop", PACKAGE]);
  } catch {
    /* ignore */
  }
}

export function pressBack() {
  adb(["shell", "input", "keyevent", "4"]);
}

export function pressHome() {
  adb(["shell", "input", "keyevent", "3"]);
}

export function hideKeyboard() {
  try {
    adb(["shell", "input", "keyevent", "111"]); // KEYCODE_ESCAPE
  } catch {
    /* ignore */
  }
  try {
    // KEYCODE_BACK is dangerous on auth screens — use hide soft input instead
    adb(["shell", "cmd", "input", "keyevent", "KEYCODE_ESCAPE"]);
  } catch {
    /* ignore */
  }
  // Do NOT press BACK (keycode 4) — on EnterMobile/OTP it pops the navigation stack.
}

export function tap(x, y) {
  adb(["shell", "input", "tap", String(Math.round(x)), String(Math.round(y))]);
}

export function swipe(x1, y1, x2, y2, durationMs = 400) {
  adb([
    "shell",
    "input",
    "swipe",
    String(Math.round(x1)),
    String(Math.round(y1)),
    String(Math.round(x2)),
    String(Math.round(y2)),
    String(durationMs),
  ]);
}

export function typeText(text) {
  // Escape spaces for `input text`
  const escaped = String(text).replace(/([\\'"&<>|])/g, "\\$1").replace(/ /g, "%s");
  adb(["shell", "input", "text", escaped]);
}

export function clearFocusedField() {
  // Select-all + delete (works on many Android EditTexts)
  adb(["shell", "input", "keyevent", "KEYCODE_MOVE_END"]);
  for (let i = 0; i < 24; i++) adb(["shell", "input", "keyevent", "67"]); // DEL
}

function parseBounds(bounds) {
  const m = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(bounds || "");
  if (!m) return null;
  const x1 = +m[1],
    y1 = +m[2],
    x2 = +m[3],
    y2 = +m[4];
  return { x1, y1, x2, y2, cx: (x1 + x2) / 2, cy: (y1 + y2) / 2, w: x2 - x1, h: y2 - y1 };
}

function parseNodes(xml) {
  const nodes = [];
  const re =
    /<node\b([^>]*)\/?>/g;
  let m;
  while ((m = re.exec(xml))) {
    const attrs = m[1];
    const get = (name) => {
      const am = new RegExp(`${name}="([^"]*)"`).exec(attrs);
      return am ? am[1].replace(/&#10;/g, "\n").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"') : "";
    };
    const bounds = parseBounds(get("bounds"));
    if (!bounds) continue;
    nodes.push({
      text: get("text"),
      desc: get("content-desc"),
      cls: get("class"),
      resourceId: get("resource-id"),
      clickable: get("clickable") === "true",
      enabled: get("enabled") === "true",
      focused: get("focused") === "true",
      checkable: get("checkable") === "true",
      checked: get("checked") === "true",
      password: get("password") === "true",
      hint: get("hint"),
      package: get("package"),
      bounds,
    });
  }
  return nodes;
}

export function dumpUi(label = "dump") {
  const remotes = ["/sdcard/uidump-e2e.xml", "/sdcard/window_dump.xml"];
  let lastErr;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      // Prefer dumping to stdout when available (avoids stale files).
      try {
        const out = adb(["exec-out", "uiautomator", "dump", "/dev/tty"], { timeout: 20_000 });
        if (out && out.includes("<hierarchy")) {
          const xml = out.slice(out.indexOf("<?xml"));
          const local = path.join(ARTIFACTS, `${stamp()}-${safe(label)}.xml`);
          fs.writeFileSync(local, xml, "utf8");
          return { xml, nodes: parseNodes(xml), path: local };
        }
      } catch {
        /* fall through to file dump */
      }

      const remote = remotes[attempt % remotes.length];
      try {
        adb(["shell", "rm", "-f", remote]);
      } catch {
        /* ignore */
      }
      adb(["shell", "uiautomator", "dump", remote]);
      const xml = adb(["shell", "cat", remote]);
      if (!xml || !xml.includes("<hierarchy") || xml.length < 80) {
        throw new Error("empty or invalid uiautomator dump");
      }
      const local = path.join(ARTIFACTS, `${stamp()}-${safe(label)}.xml`);
      fs.writeFileSync(local, xml, "utf8");
      return { xml, nodes: parseNodes(xml), path: local };
    } catch (err) {
      lastErr = err;
      sleepSync(800 + attempt * 400);
    }
  }
  throw lastErr || new Error("uiautomator dump failed");
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

export function readAppSessionToken() {
  // AsyncStorage key @selorg_rider:token → JSON-encoded JWT string in RKStorage.
  // CRITICAL: never mint a new OTP/JWT while the UI session is live — verify-otp
  // rotates PickerUser.sessionToken and immediately 401s the app into Login.
  const trySql = (dbPath) => {
    try {
      const out = adb(
        [
          "shell",
          "run-as",
          PACKAGE,
          "sh",
          "-c",
          `sqlite3 ${dbPath} "SELECT value FROM catalystLocalStorage WHERE key='@selorg_rider:token' LIMIT 1;" 2>/dev/null || true`,
        ],
        { timeout: 12_000 },
      );
      return String(out || "").trim();
    } catch {
      return "";
    }
  };
  let raw = trySql("databases/RKStorage");
  if (!raw) raw = trySql("/data/data/" + PACKAGE + "/databases/RKStorage");
  if (!raw) {
    // Fallback: dump all catalyst keys (older async-storage layouts)
    try {
      const dump = adb(
        [
          "shell",
          "run-as",
          PACKAGE,
          "sh",
          "-c",
          "sqlite3 databases/RKStorage \"SELECT key,value FROM catalystLocalStorage;\" 2>/dev/null | head -n 40 || true",
        ],
        { timeout: 12_000 },
      );
      const line = String(dump || "")
        .split(/\r?\n/)
        .find((l) => /@selorg_rider:token|token/.test(l));
      if (line) {
        const idx = line.indexOf("|");
        raw = idx >= 0 ? line.slice(idx + 1).trim() : "";
      }
    } catch {
      /* ignore */
    }
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "string" && parsed.length > 20) return parsed;
  } catch {
    /* value may already be bare JWT */
  }
  const bare = raw.replace(/^"|"$/g, "").trim();
  return bare.length > 20 ? bare : null;
}

export function screenshot(label = "shot") {
  const local = path.join(ARTIFACTS, `${stamp()}-${safe(label)}.png`);
  const remote = "/sdcard/e2e-shot.png";
  try {
    adb(["shell", "screencap", "-p", remote], { timeout: 20_000 });
    adb(["pull", remote, local], { timeout: 20_000 });
    return local;
  } catch {
    // Never fail the suite on screenshot alone (emulator flakiness).
    return null;
  }
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}
function safe(s) {
  return String(s).replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
}

export function findNodes(nodes, predicate) {
  return nodes.filter(predicate);
}

export function findByText(nodes, text, { exact = true, partial = false } = {}) {
  const t = String(text);
  return nodes.filter((n) => {
    const hay = `${n.text || ""}${n.desc ? `\n${n.desc}` : ""}`;
    if (exact && (n.text === t || n.desc === t)) return true;
    if (partial || !exact) {
      return hay.toLowerCase().includes(t.toLowerCase());
    }
    return false;
  });
}

export function findByTestId(nodes, testId) {
  const id = String(testId);
  return nodes.filter(
    (n) =>
      n.resourceId === id ||
      n.resourceId?.endsWith(`/${id}`) ||
      n.resourceId?.endsWith(`:id/${id}`) ||
      n.desc === id,
  );
}

export async function tapTestId(testId, { timeoutMs = 20000, afterMs = 500 } = {}) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeoutMs) {
    last = dumpUi(`wait-id-${testId}`);
    const hits = findByTestId(last.nodes, testId);
    if (hits.length) {
      tap(hits[0].bounds.cx, hits[0].bounds.cy);
      await sleep(afterMs);
      return hits[0];
    }
    await sleep(600);
  }
  screenshot(`fail-testid-${testId}`);
  throw new Error(`Timeout waiting for testID "${testId}". Last dump: ${last?.path}`);
}

export async function typeIntoTestId(testId, text, { clear = true } = {}) {
  await tapTestId(testId, { afterMs: 300 });
  if (clear) clearFocusedField();
  typeText(text);
  await sleep(300);
}

export function findEditTexts(nodes) {
  return nodes.filter((n) => /EditText|TextInput/i.test(n.cls) || n.hint);
}

export async function waitForTestId(testId, { timeoutMs = 20000, pollMs = 600, dismiss = true } = {}) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeoutMs) {
    last = dumpUi(`wait-id-${testId}`);
    if (dismiss) {
      await dismissPermissionDialogs(last.nodes);
    }
    const hits = findByTestId(last.nodes, testId);
    if (hits.length) return { ...last, hits };
    // Fallback: content-desc / text match for older RN builds without resource-id mapping
    const byDesc = findByText(last.nodes, testId, { exact: true });
    if (byDesc.length) return { ...last, hits: byDesc };
    await sleep(pollMs);
  }
  screenshot(`fail-testid-${testId}`);
  throw new Error(`Timeout waiting for testID "${testId}". Last dump: ${last?.path}`);
}

/** Tap common system permission / RN debugger dialogs. Safe no-op if none present. */
export async function dismissPermissionDialogs(nodes) {
  if (!nodes) {
    try {
      nodes = dumpUi("dlg-scan").nodes;
    } catch {
      return false;
    }
  }
  const hay = nodes.map((n) => `${n.text || ""}\n${n.desc || ""}`).join("\n");
  // 16 KB compatibility sheet: dismiss with OK (Don't Show Again is often a checkbox / secondary).
  if (/16\s*KB compatible|App Compatibility/i.test(hay)) {
    const ok = findByText(nodes, "OK", { exact: true });
    if (ok.length) {
      tap(ok[0].bounds.cx, ok[0].bounds.cy);
      await sleep(700);
      return true;
    }
  }
  // Nearby / local-network prompt on Android 17 — MUST allow for Metro (10.0.2.2) when prefs unset.
  if (/nearby devices|find, connect to|ACCESS_LOCAL_NETWORK|local network/i.test(hay)) {
    const allow = findByText(nodes, "Allow", { exact: true });
    if (allow.length) {
      tap(allow[0].bounds.cx, allow[0].bounds.cy);
      await sleep(900);
      return true;
    }
  }
  const prefer = [
    "While using the app",
    "Only this time",
    "Allow all the time",
    "Allow",
    "Don't Show Again",
    "Don’t Show Again",
    "OK",
    "RELOAD",
    "Close",
  ];
  // Dismiss RN yellowbox / LogBox toast if it steals taps
  if (/Open debugger to view warnings/i.test(hay)) {
    const close = nodes.find((n) => n.text === "X" || n.desc === "Close" || /close/i.test(n.desc));
    if (close) {
      tap(close.bounds.cx, close.bounds.cy);
      await sleep(400);
      return true;
    }
    // tap right side of toast
    const toast = nodes.find((n) => /Open debugger/i.test(n.text || ""));
    if (toast) {
      tap(toast.bounds.x2 - 40, toast.bounds.cy);
      await sleep(400);
      return true;
    }
  }
  for (const lab of prefer) {
    const hits = findByText(nodes, lab, { exact: false, partial: true }).filter(
      (h) => !/don.?t allow/i.test(`${h.text}${h.desc}`),
    );
    if (!hits.length) continue;
    // Prefer the largest / lowest button for permission sheets
    const t = hits.sort((a, b) => b.bounds.cy - a.bounds.cy || b.bounds.w * b.bounds.h - a.bounds.w * a.bounds.h)[0];
    tap(t.bounds.cx, t.bounds.cy);
    await sleep(700);
    return true;
  }
  return false;
}

export async function dismissDialogs(maxRounds = 10) {
  for (let i = 0; i < maxRounds; i++) {
    let nodes;
    try {
      nodes = dumpUi(`dlg-round-${i}`).nodes;
    } catch {
      return;
    }
    const did = await dismissPermissionDialogs(nodes);
    if (!did) return;
    await sleep(500);
  }
}

export async function waitForText(text, { timeoutMs = 20000, exact = false, pollMs = 700, dismiss = true } = {}) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeoutMs) {
    last = dumpUi(`wait-${text}`);
    if (dismiss) {
      await dismissPermissionDialogs(last.nodes);
      // Re-dump if we dismissed something
    }
    const hits = findByText(last.nodes, text, { exact, partial: !exact });
    if (hits.length) return { ...last, hits };
    await sleep(pollMs);
  }
  screenshot(`fail-wait-${text}`);
  throw new Error(`Timeout waiting for text "${text}" after ${timeoutMs}ms. Last dump: ${last?.path}`);
}

export async function tapText(text, opts = {}) {
  const { exact = false, index = 0, timeoutMs = 20000 } = opts;
  const { hits } = await waitForText(text, { exact, timeoutMs });
  const target = hits[index] || hits[0];
  // Prefer clickable ancestor-ish: if node not clickable, still tap center
  tap(target.bounds.cx, target.bounds.cy);
  await sleep(opts.afterMs ?? 500);
  return target;
}

export async function tapDesc(desc, opts = {}) {
  return tapText(desc, { ...opts, exact: true });
}

export function visibleTexts(nodes) {
  return [...new Set(nodes.map((n) => n.text || n.desc).filter(Boolean))];
}

export function packageInstalled() {
  const out = adb(["shell", "pm", "list", "packages", PACKAGE]);
  return out.includes(PACKAGE);
}

export function getLogcatSlice(msBack = 15000) {
  try {
    // dump recent and filter for ReactNativeJS / OkHttp / selorg
    const out = adb(["logcat", "-d", "-t", "200"], { timeout: 15_000 });
    return out
      .split(/\r?\n/)
      .filter((l) => /ReactNativeJS|OkHttp|selorg|ERROR|Exception|FATAL/i.test(l))
      .slice(-120)
      .join("\n");
  } catch {
    return "";
  }
}

export function clearLogcat() {
  try {
    adb(["logcat", "-c"]);
  } catch {
    /* ignore */
  }
}

export function setAirplane(on) {
  const flag = on ? "enable" : "disable";
  try {
    adb(["shell", "cmd", "connectivity", "airplane-mode", flag]);
  } catch {
    adb(["shell", "settings", "put", "global", "airplane_mode_on", on ? "1" : "0"]);
    try {
      adb(["shell", "am", "broadcast", "-a", "android.intent.action.AIRPLANE_MODE", "--ez", "state", on ? "true" : "false"]);
    } catch {
      /* ignore */
    }
  }
}

export { ARTIFACTS, PACKAGE, SERIAL, ROOT };
