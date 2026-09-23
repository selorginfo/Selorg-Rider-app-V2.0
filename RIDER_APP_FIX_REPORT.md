# Rider App E2E Test Report

Date: 22 Sep 2026  
App: `selorg-rider-app-Ai` (`com.selorgriderapp`) on Android emulator `emulator-5554`  
Backend: live picker/rider API `http://127.0.0.1:3333/api/v1` (`useMockData: false`)  
Rider used: phone `9556735105`, user `6aaa78006d1b1c92cacfd432`, name “Automation Picker”, status `ACTIVE`, delivery mode `standard`  
Email used for sign-in: `automation.picker@selorg.com` (saved on that rider because mobile OTP cannot be delivered)  
Live order: `ORD-20260921-00042`, hub `DS-Adyar-01` (Adyar Darkstore)  
Harness: existing ADB + UIAutomator driver (`e2e/mobile/adb-driver.mjs`). Jest was not used. No mock order was used.

The pre-fix record is still `RIDER_APP_E2E_TEST_REPORT.md` (9 passed, 1 failed, 22 blocked, 0 skipped). This file is the same kind of report after the fixes, from the device runs that followed.

A step is PASS only when the UI action, the API, and the Mongo business state agree. A toast or a tap by itself is not a pass.

## Totals

| | Count |
|---|---|
| Screens discovered | 43 screens, 5 overlays |
| Screens tested | 22 |
| Unique checks | 47 |
| Passed | 42 |
| Failed | 1 |
| Blocked | 4 |
| Skipped | 0 |

Screens tested: Auth landing, Login, Verify OTP, Vehicle, Home, Orders, Earnings, History, Profile, Accept, Travel to store, Verify & collect, Customer navigation, Proof of delivery, Delivered, Shifts, Settings, Documents & KYC, Wallet, Floating cash, Notifications, Help & Support.

Overlays used: gallery photo picker, logout confirm.

## Primary rider chain

`ORD-20260921-00042` was accepted, collected, and delivered by rider `6aaa78006d1b1c92cacfd432`.

| Step | Result | What was verified |
|---|---|---|
| Cold start | PASS | “Selorg Rider”, “Log In”, “Create Rider Account” |
| Login validation | PASS | Empty phone and a 5-digit phone stay on Login |
| Mobile OTP while SMS is paused | PASS | Stayed on Login. Banner does not say the OTP was sent |
| Email OTP | PASS | Verify OTP opened. `0000` rejected. Resend worked. An expired code was rejected. Sign-in reached Home |
| Motorbike `TN09RD1001` | PASS | Standard delivery. Saved on the rider |
| Go online and see the order | PASS | `ORD-20260921-00042` on the available list for `DS-Adyar-01` |
| Accept | PASS | `riderStage=accepted`, assigned to this rider |
| Second rider | PASS | `409 ORDER_ALREADY_ASSIGNED` |
| Pickup | PASS | Bag `SG-2026092100042-A`, rack `Rack-C4-Slot21`. Both items checked. `riderStage=picked_up`, customer status `on-the-way` |
| I've Reached the Customer | PASS | Proof of Delivery opened |
| Proof photo | PASS | Gallery photo. Screen showed “Photo captured” after upload |
| Wrong delivery OTP `0000` | PASS | Order stayed `picked_up` / `on-the-way`. OTP attempts went from 0 to 1 |
| Confirm delivery | PASS | UI “Delivered!” for this order. Mongo `status=delivered`, `riderStage=delivered`, `otpVerified=true` |
| After delivery | PASS | Earnings ₹56 and 1 delivery. History shows this order. Wallet ₹56. Floating cash ₹152, matching the COD row. Home “Orders Delivered” 1 |

## 1. Working functionality

- The debug app launches against `http://127.0.0.1:3333/api/v1`. `useMockData` is false. The order on screen was `ORD-20260921-00042`, not the seed order.
- Mobile send while the SMS provider is paused stays on Login and does not claim the OTP was sent. Email send returns `deliveryStatus: sent` and opens Verify OTP.
- Login OTP `0000` is rejected. Resend works after the cooldown. An expired code is rejected. A live email code signs the rider in.
- Vehicle choices on device: Motorbike, Scooter, Auto, EV Auto, Bicycle. A too-short registration is rejected. Motorbike `TN09RD1001` saves as standard delivery.
- Home, the dashboard API, and go-online agree. The available list shows the real order only while the rider is online and the hub is `DS-Adyar-01`.
- Accept assigns the order. A second active rider gets `409 ORDER_ALREADY_ASSIGNED`. Travel, rack `Rack-C4-Slot21`, and bag `SG-2026092100042-A` match the order. Confirm pickup sets `picked_up` and customer status `on-the-way`.
- “I've Reached the Customer” opens Proof of Delivery. A gallery photo uploads. Delivery OTP `0000` does not complete the order. The customer OTP completes it: UI “Delivered!”, “#ORD-20260921-00042 handed over successfully”, earned ₹56, 17 min, 3.9 km. Mongo is `delivered` / `delivered` / `otpVerified=true`.
- The same figures show up afterwards. Earnings: ₹56, 1 delivery. History: this order, Delivered, today. Wallet available balance ₹56. Floating cash in hand ₹152, the COD amount collected on the proof screen. Notifications include “Order ORD-20260921-00042 ready at Rack-C4-Slot21”.
- Profile opens Shifts (“No shifts available right now.”), Settings (push notifications, location sharing, order sound alerts), Documents & KYC, and Help & Support. Logout returns to “Sign in to ride”.
- `GET /picker/dashboard/today` without a token returns 401. Verify OTP for an unknown phone returns 400.

## 2. Failed functionality

### F1. Force-stop drops the signed-in session

- Screen: Auth landing, after a signed-in Home
- Rider action: Force-stop the app and open it again
- Expected: Home, still signed in
- Actual: “Selorg Rider”, “Log In”, “Create Rider Account”
- This happened after a normal email sign-in that had already reached “Welcome back”, and again after the token write was awaited before navigation. The 2.5 second storage timeout that could treat a slow read as logged-out was removed. Relaunch still shows Log In.
- Severity: high
- The delivery chain does not depend on this. The rider can sign in again with email OTP.

## 3. Missing functionality

- Shifts had a screen and no menu row. Profile now has “Shifts” and it opens. The live account has no bookable slot (“No shifts available right now.”).
- Van is not an onboarding choice. The list is Motorbike, Scooter, Auto, EV Auto, and Bicycle. Auto and EV Auto are the bulk options. That matches the vehicle screen that was shown on the device.

## 4. Frontend issues

- F1 above. The session is not restored after the process is killed.
- The customer map was a Google SurfaceView, and a bike marker was updating about every 30ms. Presses on “I've Reached the Customer” did not run, and UI dumps stopped returning. Android now uses a static lite map and does not run that marker loop. After that change, the reached button opened Proof of Delivery on the device.
- Profile → Shifts was added. Hub rows show the warehouse id, so `DS-Adyar-01` is distinct from `chennai-adyar-ds`.

## 5. Backend / API issues

- Mobile OTP still cannot be delivered. The provider is paused. Send now returns a failure message instead of “OTP sent successfully”, and the app stays on Login. Email OTP is the path that was used for every sign-in in this run.
- Work locations still include both `DS-Adyar-01` (Adyar Darkstore) and `chennai-adyar-ds` (Adyar Dark Store). The live order is `DS-Adyar-01`. The rider was already on that hub, so the hub picker was not submitted again.
- Invalid login OTP, missing token, offline order list, and a second accept return 400, 401, 403, and 409 as specified. The second-accept 409 was confirmed while the order was assigned to this rider.

## 6. Business-logic issues

- The order moved offered → accepted → picked_up → delivered, and the customer status moved to `on-the-way` at pickup and to delivered only after the customer OTP. Wrong OTP `0000` left it `picked_up`.
- COD ₹152 had to be confirmed on the proof screen before Confirm Delivery would submit. Floating cash then showed ₹152 in hand.
- “Save with no vehicle selected” did not show “Select your vehicle type.” The vehicle screen already had types on it, and the check matched the registration label. A short registration was rejected and `TN09RD1001` saved. This is not counted as a product failure.

## 7. Realtime / concurrency issues

- A second active rider accepting `ORD-20260921-00042` after this rider had accepted it returned `409 ORDER_ALREADY_ASSIGNED`. The order stayed with `6aaa78006d1b1c92cacfd432`.
- Socket delivery of a new offer was not run. The order was already assigned.

## 8. Location / GPS issues

- The navigation screen showed the drop address “E2E API 938449, Adyar, Home, Chennai, 600020”, Call, Chat, and “I've Reached the Customer”. The reached action opened the proof screen after the map stopped consuming touches.
- The delivered screen showed 3.9 km and 17 min for this order. History shows the same distance.

## 9. Permission / device issues

- Camera and gallery were granted. The proof photo was chosen from the device photo picker and the proof screen showed “Photo captured”.
- An earlier blank launch was the emulator loading the Picker Metro bundle on port 8081. The Rider app is React Native 0.75.4 and uses Metro on 8083. That is an environment clash, not a Rider defect. Cold start passed once the packager host was `localhost:8083`.

## 10. Test-environment blockers

- The emulator process died once during the first cancel and proof attempt. Profile rows recorded in that window were the launcher or the login screen. Those were run again after a stable sign-in. They are not counted as separate screen failures.
- Mobile OTP cannot be delivered until the SMS provider is paid. Email OTP was used instead. That is a provider outage, not an app defect, and the app now says so.
- `9698790921` is `under_review` and was not used. The ACTIVE account above is the one that can complete a delivery.

## Blocked checks

- Cancel order. The sheet was not opened. The emulator dropped on the first attempt, and the order was then delivered, so cancel was no longer available.
- Customer chat thread. Call and Chat were on the navigation screen. The dump after the chat tap was still that screen, while the map was taking the touches. Chat was not opened again after the map fix, because the order was already delivered.
- Orders list in airplane mode. The recorded result had an empty UI dump and was taken from the login screen. It is not an orders-offline pass.
- Unknown order id. The call returned 401 because it had no live token. A signed-in 404 was not recorded.

## What changed in the app

- Mobile OTP failure no longer shows “OTP sent successfully”, and Verify OTP does not open when the SMS provider did not deliver.
- Profile has a Shifts row. Hub rows include the warehouse id. Home loads the rider’s assigned order when the screen opens.
- The Android customer map is a static lite map, and the bike marker no longer updates in a tight loop, so “I've Reached the Customer” receives the press.
- The session token write is awaited, and a slow storage read is no longer treated as “logged out” after 2.5 seconds. Force-stop still returns to Log In, so F1 remains open.

## Order left in the database

`ORD-20260921-00042` is delivered. `riderStage=delivered`, `otpVerified=true`, assigned to rider `6aaa78006d1b1c92cacfd432`. COD collected on the proof screen was ₹152. The rider payout shown on Delivered, Earnings, Wallet, and History is ₹56.
