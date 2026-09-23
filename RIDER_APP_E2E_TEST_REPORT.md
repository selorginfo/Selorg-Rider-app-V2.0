# Rider App E2E Test Report

Date: 22 Sep 2026  
App: `selorg-rider-app-Ai` (`com.selorgriderapp`) on Android emulator `emulator-5554`  
Backend: live picker/rider API `http://127.0.0.1:3333/api/v1/picker` (`useMockData: false`)  
Rider used: phone `9556735105`, user `6aaa78006d1b1c92cacfd432`, name “Automation Picker”, status `ACTIVE`, delivery mode `standard`  
Live order: `ORD-20260921-00042` in `customer_orders`, hub `DS-Adyar-01`, status `getting-packed`, `riderStage=offered`, `pickerId=null`  
Harness: existing ADB + UIAutomator driver (`e2e/mobile/adb-driver.mjs`), same approach as the picker, customer, and HSD apps. Jest was not used. App source was not changed during the test.

A step is PASS only when the UI action, the API, and the Mongo business state agree. A toast, a banner, or a navigation change alone is not a pass.

The primary rider chain stopped on Login. The app stored a real OTP and then refused to open Verify OTP. Hub selection, shift, accept, pickup, delivery OTP, completion, earnings, and logout were not executed on the device.

## Totals

| | Count |
|---|---|
| Screens discovered | 43 screens, 5 overlays |
| Screens tested | 2 (Auth landing, Login) |
| Unique checks | 32 |
| Passed | 9 |
| Failed | 1 |
| Blocked | 22 |
| Skipped | 0 |

Evidence: `test-results/rider-e2e-results.json`, launch screenshot `test-results/mobile-artifacts/2026-09-22T11-17-17-108Z-launch.png`. The login screen after Send OTP was read from the accessibility tree: “OTP sent successfully” while “Sign in to ride” and “Send OTP” were still showing.

## Screens discovered

Auth landing, Login, OTP, Home, Orders, Earnings, History, Profile, Accept, Travel to store, Verify & collect (bag/rack), Customer navigation, Delivery photo + OTP, Delivery complete, Order chat.

Bulk: overview, loading, active, all stops, stop detail, verify, complete, bulk history detail.

Onboarding: welcome, personal, vehicle, hub, KYC, training, review, done, pending, rejected.

Account: documents, upload document, shifts, floating cash, wallet, notifications, support, settings, privacy, terms.

Overlays: shift / go-online sheet, cancel-order sheet, bulk exception sheet, logout confirm, camera/gallery chooser.

Not reachable from any button: Shifts. The screen is registered on the stack and nothing navigates to it. Going online is the Home toggle, which calls `POST /picker/shifts/go-online` or opens the shift sheet.

## Primary rider chain

`ORD-20260921-00042` was still an unassigned offer at the end of the run (`riderStage=offered`, `pickerId=null`). It was not accepted, collected, or delivered.

| Step | Result | What was verified |
|---|---|---|
| Cold start | PASS | “Selorg Rider”, “Log In”, “Create Rider Account” |
| Login screen | PASS | Mobile, WhatsApp, Email, Send OTP |
| Empty phone | PASS | “Enter your mobile number.” Stayed on Login |
| 5-digit phone | PASS | “Enter a 10-digit mobile number.” Stayed on Login |
| Send OTP for `9556735105` | FAIL | OTP row written in `picker_otps`. UI stayed on Login |
| Verify OTP, hub, vehicle, shift, orders, accept, pickup, delivery, earnings, logout | BLOCKED | OTP screen never opened |

## 1. Working functionality

- The debug app launches against the local API. Logcat showed `[SelorgRider] API base URL: http://127.0.0.1:3333/api/v1` and `useMockData` is false. No mock order was rendered because the orders screen was never reached.
- Auth landing and the login form render. Mobile, WhatsApp, and Email are on the form.
- Empty submit shows “Enter your mobile number.” A 5-digit number shows “Enter a 10-digit mobile number.” Neither call opened OTP, and neither wrote a usable login.
- `POST /picker/auth/send-otp` for this rider returns HTTP 200 and stores a 4-digit OTP in `picker_otps`.
- `POST /picker/auth/verify-otp` with `0000` returns HTTP 400 `INCORRECT_OTP` (“Invalid OTP. Please try again.”). The UI could not submit that code because it never left Login.
- The same endpoint with the stored OTP returns HTTP 200, `nextScreen: main`, and a bearer token. That call was made from the test runner after the UI had already failed to navigate. It proves the backend would have signed the rider in. It is not a UI login pass.
- `GET /picker/dashboard/today` without a token returns 401.
- `GET /picker/shared-orders/assignorders?scope=available` with a valid token while `isOnline` is false returns 403 `RIDER_OFFLINE` (“Go online to see available orders.”).
- `GET /picker/work-locations` returns four live hubs, including `DS-Adyar-01` (Adyar Darkstore) and `chennai-adyar-ds` (Adyar Dark Store).
- The customer order was not mutated. It is still `getting-packed` / `offered` / unassigned.

## 2. Failed functionality

### F1. Send OTP never opens Verify OTP

- Screen: Login
- Rider action: Enter `9556735105`, tap Send OTP
- Expected: Verify OTP opens, and the code in `picker_otps` can be entered
- Actual: Login stays up. Banner text is “OTP sent successfully” next to the warning icon. “Send OTP” is still on screen. `picker_otps` has an unexpired OTP for that phone (`expiresAt` about five minutes ahead).
- API: `POST /picker/auth/send-otp`
- Request: `{ "phone": "9556735105", "preferredChannel": "sms" }`
- Response: HTTP 200  
  `{ "success": true, "data": { "success": true, "message": "OTP sent successfully", "channel": "sms", "deliveryStatus": "failed" } }`
- WhatsApp is the same shape: `channel: "whatsapp"`, `deliveryStatus: "failed"`, HTTP 200.
- Error: the client treats `deliveryStatus === "failed"` as a failed send even when the envelope is `success: true`. `LoginScreen` copies `result.error` into the banner and returns before `navigate('Otp')`. The error string is the backend message “OTP sent successfully”.
- Root cause: `authApi.normalizeSendOtpResult` in `src/services/api/authApi.ts` rejects `deliveryStatus: "failed"`. The backend still stores the OTP when the provider did not confirm delivery and dev fallback is on (`picker.auth.service.ts` returns success plus `deliveryStatus: "failed"`). The rider sees a success sentence and cannot continue.
- Severity: blocker
- Reproduction:
  1. Launch the Rider app against `http://127.0.0.1:3333/api/v1`.
  2. Log In → Mobile → `9556735105` → Send OTP.
  3. Observe the banner and that Verify OTP does not appear.
  4. Read `picker_otps` for identifier `9556735105`. The OTP is present and unexpired.

## 3. Missing functionality

- Shifts has a route and a screen, and no control opens it. Shift start on Home is a separate go-online path.
- Van is not in the onboarding vehicle list. Configured choices in the UI source are Motorbike, Scooter, Auto, EV Auto, and Bicycle. Auto and EV Auto map to bulk delivery. This was not exercised on device.
- The running app did not show dummy order cards. `src/mock/orders.ts` still exists and is used only when `useMockData` is true.

## 4. Frontend issues

- F1 above. The success message is rendered as the send failure, and navigation to OTP is skipped.
- After a successful API verify, `GET /picker/profile` for this user returned `hub.id: null` and `hub.name: null` while `picker_users.currentLocationId` was `DS-Adyar-01` on the following read. Login routing sends an approved rider to Choose your hub when `profile.hub.id` is missing. That path was not opened in the UI, so it is not marked as a UI fail. It will matter on the first successful login.

## 5. Backend / API issues

- Send OTP reports `deliveryStatus: "failed"` and `success: true` together, and still writes `picker_otps`. SMS and WhatsApp both did this for `9556735105`.
- Work locations expose two Adyar ids: `chennai-adyar-ds` (“Adyar Dark Store”) and `DS-Adyar-01` (“Adyar Darkstore”). The live offer is tagged `DS-Adyar-01`. Picking the other Adyar name would be the wrong hub. Not confirmed in the UI because login never finished.
- Invalid OTP, missing token, and offline order list behave as specified (400, 401, 403).

## 6. Business-logic issues

- A rider cannot start a shift, see `ORD-20260921-00042`, or accept it until Verify OTP opens. The order is eligible on the server: offered, unassigned, hub `DS-Adyar-01`, type standard, status `getting-packed`.
- Available orders are hidden until the rider is online (403 `RIDER_OFFLINE`). That rule is correct. It could not be checked on the Home toggle.

## 7. Realtime / concurrency issues

Not run. Socket connect, a second rider accepting the same order, and network loss during accept/pickup/delivery all require a signed-in rider on the order screen.

## 8. Location / GPS issues

Not run. Location permission was granted on the emulator before launch. No map, distance, or location upload was exercised.

## 9. Permission / device issues

- First launches were a blank screen. Logcat: JavaScript `0.87.1`, native `0.75.4`, then `"SelorgRiderApp" has not been registered`. The emulator’s default packager host `10.0.2.2:8081` is the Picker app Metro, which is React Native 0.87. The Rider app is 0.75.4. Pinning `debug_http_host` to `localhost:8083` before the JS bundle loaded fixed launch. That is an environment clash, not a Rider product defect.
- After that pin, cold start passed.

## 10. Test-environment blockers

- F1 blocks every signed-in screen. The 22 blocked checks are the same root cause, not 22 separate product defects.
- `9556735105` is an ACTIVE picker user (`workforceRole` null) with no vehicle type. It is the account that can pass auth into the rider shell. The dedicated rider phone `9698790921` is `under_review` and was not used for the delivery chain.
- A seed document `rider-automation-seed-1789628719000` is also offered at `DS-Adyar-01`. It was not used. The target order was the real customer order `ORD-20260921-00042`.

## Blocked checks

Each of these was not run on the device because Verify OTP never opened:

OTP entry, invalid OTP in the UI, resend, expired OTP in the UI, session token on device, relaunch while signed in, hub select / change / persistence, vehicle and delivery type, Home stats and online toggle, start and end shift, available-order list, accept, duplicate accept, second-rider 409, order detail, rack and bag, confirm pickup, navigation, call/chat, delivery photo, wrong and correct delivery OTP, complete delivery, earnings, history, profile edit, settings toggles, notifications, logout.

## What was not changed

Application source was not modified. No order status write was made. `ORD-20260921-00042` is still offered.
