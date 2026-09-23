/**
 * Finish the open rider checks: proof, delivery OTP, shifts, settings, logout.
 * Email OTP. Real order ORD-20260921-00042.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
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
  pressBack,
  screenshot,
  sleep,
  swipe,
  tap,
  typeText,
  visibleTexts,
  waitForText,
} from "./adb-driver.mjs";
import { fetchOrderById, fetchRiderOtp, resetOtpWindow } from "./fetch-otp.mjs";

const EMAIL = "automation.picker@selorg.com";
const ORDER = "ORD-20260921-00042";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "test-results", "rider-final-results.json");
const results = [];

function save() {
  const counts = { PASS: 0, FAIL: 0, BLOCKED: 0, SKIP: 0 };
  for (const r of results) counts[r.status] = (counts[r.status] || 0) + 1;
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ updatedAt: new Date().toISOString(), counts, results }, null, 2));
}
function record(id, action, status, actual, extra = {}) {
  results.push({ id, action, status, actual, ...extra, at: new Date().toISOString() });
  console.log(`[${status}] ${id} — ${action}`);
  if (status !== "PASS") console.log(`    ${String(actual).slice(0, 360)}`);
  save();
}

async function ui() {
  await dismissDialogs(3);
  const dump = dumpUi("final");
  return { ...dump, texts: visibleTexts(dump.nodes) };
}
function hasText(dump, text) {
  return findByText(dump.nodes, text, { exact: false, partial: true }).length > 0;
}
async function waitAny(needles, timeoutMs = 20000) {
  const start = Date.now();
  let last = await ui();
  while (Date.now() - start < timeoutMs) {
    const hay = (last.texts || []).join("\n");
    const hit = needles.find((n) => hay.toLowerCase().includes(String(n).toLowerCase()));
    if (hit) return { ...last, hit };
    await sleep(700);
    last = await ui();
  }
  const hay = (last.texts || []).join("\n");
  const hit = needles.find((n) => hay.toLowerCase().includes(String(n).toLowerCase()));
  if (!hit) screenshot("final-timeout");
  return { ...last, hit: hit || null };
}
function smallest(nodes, text) {
  return findByText(nodes, text, { exact: false, partial: true })
    .filter((n) => n.bounds && n.bounds.h > 16 && n.bounds.h < 260)
    .sort((a, b) => a.bounds.h - b.bounds.h)[0];
}
async function tapLabel(text, timeoutMs = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const dump = dumpUi("tap");
    const hit = smallest(dump.nodes, text) || findByText(dump.nodes, text, { exact: false, partial: true })[0];
    if (hit) {
      tap(hit.bounds.cx, hit.bounds.cy);
      await sleep(500);
      return true;
    }
    await sleep(400);
  }
  throw new Error(`Timeout waiting for ${text}`);
}
async function typeFirst(value) {
  const dump = dumpUi("field");
  const edits = findEditTexts(dump.nodes).filter((n) => n.bounds.h > 20 && n.bounds.w > 30);
  if (!edits.length) throw new Error("No text field");
  tap(edits[0].bounds.cx, edits[0].bounds.cy);
  await sleep(300);
  clearFocusedField(8);
  typeText(value);
  await sleep(250);
  hideKeyboard();
}

async function loginIfNeeded() {
  let screen = await waitAny(
    ["Log In", "Sign in to ride", "Welcome back", "Active delivery", "Live Orders", "I've Reached the Customer", "Proof of Delivery"],
    25000,
  );
  if (
    screen.hit === "Welcome back" ||
    screen.hit === "Active delivery" ||
    screen.hit === "Live Orders" ||
    screen.hit === "I've Reached the Customer" ||
    screen.hit === "Proof of Delivery" ||
    (screen.hit && hasText(screen, "Home") && hasText(screen, "Profile"))
  ) {
    record("LOGIN-FINAL", "Session still signed in", "PASS", screen.hit);
    return true;
  }
  await resetOtpWindow(EMAIL);
  if (hasText(screen, "Log In") || hasText(screen, "Create Rider Account")) {
    await tapLabel("Log In");
    await waitAny(["Send OTP", "Email"], 15000);
  }
  await tapLabel("Email");
  await sleep(400);
  await typeFirst(EMAIL);
  await tapLabel("Send OTP");
  const otpScreen = await waitAny(["Verify OTP", "unavailable", "Too many"], 20000);
  if (otpScreen.hit !== "Verify OTP") {
    record("LOGIN-FINAL", "Email OTP login", "FAIL", (otpScreen.texts || []).slice(0, 12).join(" | "));
    return false;
  }
  const otp = await fetchRiderOtp(EMAIL, { attempts: 6 });
  await typeFirst(otp.otp);
  if (hasText(await ui(), "Verify & Continue")) await tapLabel("Verify & Continue");
  else await tapLabel("Verify");
  const landed = await waitAny(["Welcome back", "Active delivery", "Continue delivery", "Orders", "Choose your hub"], 30000);
  record("LOGIN-FINAL", "Email OTP login", landed.hit ? "PASS" : "FAIL", landed.hit || (landed.texts || []).slice(0, 8).join(" | "));
  return !!landed.hit;
}

async function openActiveOrder() {
  const here = await ui();
  if (hasText(here, "I've Reached the Customer")) return true;
  if (hasText(here, "Continue delivery")) {
    await tapLabel("Continue delivery");
  } else if (hasText(here, "Active delivery")) {
    await tapLabel("Active delivery");
  } else {
    await tapLabel("Orders");
    let list = await waitAny(["Continue Delivery", "Active Order", "00042", "Could not load orders"], 20000);
    if (list.hit === "Could not load orders") {
      await tapLabel("Home");
      await sleep(1500);
      await tapLabel("Orders");
      list = await waitAny(["Continue Delivery", "Active Order", "00042"], 20000);
    }
    if (!list.hit || list.hit === "Could not load orders") {
      record("REACH-1", "Open the picked-up order", "FAIL", (list.texts || []).slice(0, 12).join(" | "));
      return false;
    }
    if (hasText(list, "Continue Delivery")) await tapLabel("Continue Delivery");
    else await tapLabel("00042");
  }
  const nav = await waitAny(["I've Reached the Customer", "Customer delivery OTP"], 20000);
  return !!nav.hit;
}

async function reachCustomer() {
  const opened = await openActiveOrder();
  if (!opened) return false;
  if (!hasText(await ui(), "Customer delivery OTP")) {
    await tapLabel("I've Reached the Customer");
  }
  const photo = await waitAny(["Customer delivery OTP", "Tap to capture", "Confirm Delivery"], 15000);
  record(
    "REACH-1",
    "I've Reached the Customer opens the proof screen",
    photo.hit ? "PASS" : "FAIL",
    photo.hit || (photo.texts || []).filter((t) => /Reached|OTP|Photo|Confirm/i.test(t)).join(" | "),
  );
  return !!photo.hit;
}

async function captureProof() {
  const before = await ui();
  if (hasText(before, "Tap to capture")) await tapLabel("Tap to capture");
  else if (hasText(before, "Proof")) await tapLabel("Proof");
  await sleep(800);
  let chooser = await ui();
  if (hasText(chooser, "Choose from gallery")) {
    await tapLabel("Choose from gallery");
    await sleep(2500);
    chooser = await ui();
    const photoHit =
      smallest(chooser.nodes, "proof") ||
      (chooser.texts || []).find((t) => /jpg|jpeg|png|photo|image|recent/i.test(t));
    if (photoHit && typeof photoHit !== "string") tap(photoHit.bounds.cx, photoHit.bounds.cy);
    else if (typeof photoHit === "string") await tapLabel(photoHit);
    else tap(180, 700);
    await sleep(1500);
    const afterPick = await ui();
    if (!hasText(afterPick, "Customer delivery OTP") && !hasText(afterPick, "Confirm Delivery")) {
      const done = (afterPick.texts || []).find((t) => /^(Done|OK|Select|Add)$/i.test(t));
      if (done) await tapLabel(done);
    }
  } else if (hasText(chooser, "Take photo")) {
    await tapLabel("Take photo");
    await sleep(2500);
    const cam = await ui();
    const shutter = (cam.texts || []).find((t) => /shutter|take picture|capture/i.test(t));
    if (shutter) await tapLabel(shutter);
    else tap(540, 2000);
    await sleep(1500);
    const again = await ui();
    const done = (again.texts || []).find((t) => /^(DONE|Done|OK)$/.test(t));
    if (done) await tapLabel(done);
  }
  await sleep(2500);
  const after = await ui();
  const ok = hasText(after, "Photo captured") || hasText(after, "Uploading") || hasText(after, "Customer delivery OTP");
  record(
    "PHO-2",
    "Capture or choose a proof photo",
    ok ? "PASS" : "FAIL",
    (after.texts || []).filter((t) => /Photo|Upload|Confirm|OTP|Gallery|Camera|capture/i.test(t)).join(" | ") || "no photo text",
  );
  return ok;
}

async function enterOtp(code) {
  const dump = dumpUi("otp");
  const edits = findEditTexts(dump.nodes).filter((n) => n.bounds.w < 400);
  const field = edits[0] || findEditTexts(dump.nodes).slice(-1)[0];
  if (!field) return false;
  tap(field.bounds.cx, field.bounds.cy);
  await sleep(250);
  clearFocusedField(6);
  typeText(code);
  hideKeyboard();
  await sleep(400);
  return true;
}

async function finishOtpScreen() {
  const otp = await fetchRiderOtp(EMAIL, { attempts: 6 });
  await typeFirst(otp.otp);
  if (hasText(await ui(), "Verify & Continue")) await tapLabel("Verify & Continue");
  else await tapLabel("Verify");
  const landed = await waitAny(["Welcome back", "Active delivery", "Continue delivery", "Live Orders", "Choose your hub"], 30000);
  record("LOGIN-FINAL", "Email OTP login", landed.hit ? "PASS" : "FAIL", landed.hit || (landed.texts || []).slice(0, 8).join(" | "));
  return !!landed.hit;
}

async function main() {
  ensureReversePorts();
  grantRuntimePermissions();
  let signedIn = false;
  if (process.env.RIDER_FROM === "otp") {
    signedIn = await finishOtpScreen();
  } else {
    forceStop();
    await sleep(800);
    launchApp(false);
    await sleep(7000);
    await dismissDialogs(4);
    signedIn = await loginIfNeeded();
  }
  if (!signedIn) return;

  const reached = await reachCustomer();
  if (!reached) return;
  const photoOk = await captureProof();

  const beforeWrong = await fetchOrderById(ORDER);
  await enterOtp("0000");
  if (hasText(await ui(), "Collect")) {
    try { await tapLabel("Collect"); } catch { /* not COD */ }
  }
  const confirmEnabled = hasText(await ui(), "Confirm Delivery");
  if (confirmEnabled) {
    try { await tapLabel("Confirm Delivery"); } catch { /* disabled control may not click */ }
  }
  await sleep(1500);
  const wrong = await fetchOrderById(ORDER);
  const wrongUi = await ui();
  const wrongCopy = (wrongUi.texts || []).filter((t) => /Incorrect|invalid|OTP/i.test(t)).join(" | ");
  const attemptsRose = (wrong?.otpAttempts || 0) > (beforeWrong?.otpAttempts || 0);
  const stillOpen = wrong?.riderStage === "picked_up" && wrong?.status !== "delivered";
  record(
    "OTP-1",
    "Wrong delivery OTP does not complete the order",
    stillOpen && (attemptsRose || /incorrect|invalid/i.test(wrongCopy)) ? "PASS" : stillOpen ? "BLOCKED" : "FAIL",
    `stage=${wrong?.riderStage} status=${wrong?.status} attempts=${wrong?.otpAttempts} ui=${wrongCopy}`,
  );

  if (photoOk && wrong?.deliveryOtp) {
    await enterOtp(String(wrong.deliveryOtp));
    if (hasText(await ui(), "Collect")) {
      try { await tapLabel("Collect"); } catch { /* ignore */ }
    }
    try { await tapLabel("Confirm Delivery"); } catch { /* ignore */ }
    const done = await waitAny(["Delivered", "Back to Orders", "Incorrect", "complete"], 20000);
    const finalOrder = await fetchOrderById(ORDER);
    record(
      "DEL-1",
      "Complete delivery with the customer OTP",
      finalOrder?.status === "delivered" && finalOrder?.riderStage === "delivered" && finalOrder?.otpVerified ? "PASS" : "FAIL",
      `ui=${done.hit} status=${finalOrder?.status} stage=${finalOrder?.riderStage} otpVerified=${finalOrder?.otpVerified}`,
    );
    if (finalOrder?.status === "delivered") {
      try { await tapLabel("Back to Orders"); } catch { /* ignore */ }
    }
  } else {
    record("DEL-1", "Complete delivery with the customer OTP", "BLOCKED", `photoOk=${photoOk} hadOtp=${!!wrong?.deliveryOtp} beforeAttempts=${beforeWrong?.otpAttempts}`);
  }

  try {
    await tapLabel("Profile");
    swipe(540, 1600, 540, 700, 350);
    await sleep(400);
    await tapLabel("Shifts");
    const shifts = await waitAny(["Shifts", "No shifts", "slot", "Go online"], 10000);
    record("SCR-Shifts", "Open Shifts from Profile", (shifts.texts || []).includes("Shifts") ? "PASS" : "FAIL", (shifts.texts || []).slice(0, 10).join(" | "));
    pressBack();
    await sleep(400);
    swipe(540, 1600, 540, 700, 350);
    await tapLabel("Settings");
    const settings = await waitAny(["Push", "Notifications", "Settings"], 10000);
    record("SET-1", "Open Settings", settings.hit ? "PASS" : "FAIL", (settings.texts || []).slice(0, 10).join(" | "));
    pressBack();
    await sleep(400);
    swipe(540, 1700, 540, 600, 350);
    await tapLabel("Logout");
    await waitAny(["logout", "Are you sure"], 8000);
    await tapLabel("Logout");
    const out = await waitAny(["Log In", "Selorg Rider"], 20000);
    record("OUT-1", "Logout", out.hit ? "PASS" : "FAIL", out.hit || (out.texts || []).slice(0, 6).join(" | "));
  } catch (err) {
    record("TAIL", "Profile shifts settings logout", "FAIL", err.message);
  }
  console.log("FINAL_DONE", results.length);
}

main().catch((err) => {
  record("FATAL", "Finish run", "FAIL", err.stack || err.message);
  process.exitCode = 1;
});
