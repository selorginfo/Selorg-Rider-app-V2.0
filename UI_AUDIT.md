# UI_AUDIT.md — Selorg Rider App

Source of truth: `Selorg Rider.dc.html` (the most complete of the 3 provided HTML files — it is a
superset of `Selorg Rider - standalone.dc.html` / `Selorg Rider App.html`, adding the full **Bulk
Delivery** batch feature). The design is a single-file "DC" (design-canvas) app: one `Component`
class holding all state, a flat `state.screen` string selecting the visible screen, and phone-level
`sc-if` overlays for the 5 bottom sheets + the bottom tab bar.

The HTML renders inside a 402×858 phone mock (bezel/notch/status-bar chrome). In the React Native
port the bezel is dropped and each screen fills the device; the iOS-style status bar row, notch and
home-indicator are **not** reproduced (they are presentation chrome, not app UI). Everything inside
the scroll viewport **is** reproduced 1:1.

Global palette: primary green `#237227`, dark green `#1B5A1F`, bulk purple `#4F39F6` / `#3730D6`,
danger red `#E7000B` / `#FB2C36`, ink `#101828` / `#071123`, muted `#6B7280` / `#9CA3AF`,
hairline `#EDEFF2` / `#F2F4F6`, surface `#F7F8FA`, card `#FFFFFF`. Font family: **Inter**
(400/500/600/700/800). Logo asset: `assets/selorg-logo.png`.

Animations in HTML: `selUp` (fade+rise, screen enter + sheet enter), `selPop` (scale-in, success
check marks), `selPulse` (opacity pulse, live-status dots + new-order badge). Reproduced with
`Animated` in RN (`useScreenEnter`, `PulseDot`, `PopIn`).

Legend for interaction column: N=navigates, M=opens modal/sheet, S=state change, F=form submit,
T=toggle, ↕=expand/collapse.

---

## 0. App shell (persistent)

| Element | Type | Notes |
|---|---|---|
| Bottom tab bar | nav | 5 items: Home, Orders, Earnings, History, Profile. Only shown on those 5 screens (`showTabs`). Active item: filled green rounded icon-chip + green label; inactive: grey. Icons are inline SVG (home, box, bar-chart, clock, user). |
| Screen-enter animation | anim | `.selscreen` → fade + 10px rise, 0.28s |
| Status-bar tint | style | `statusFg` white on dark/map/bulk screens, ink elsewhere (RN: `StatusBar` barStyle) |

## 1. AuthLandingScreen  — `screen: 'authLanding'`

| # | Element | Type | Interaction |
|---|---|---|---|
|1| Logo tile 132×132 rounded 32, shadow | Image | — |
|2| "Selorg Rider" title 800/26 | Text | — |
|3| "DELIVERY PARTNER" tracked caption, green | Text | — |
|4| "Log In" primary button (green, 56h) | Button | N → Login (authIntent='login') |
|5| "Create Rider Account" outline button | Button | N → Login (authIntent='signup') |
|6| "By continuing you agree to Selorg's Terms of Service & Privacy Policy" legal caption | Text | — |
- States: none. Background: white→#F1F7F1 vertical gradient.

## 2. LoginScreen — `screen: 'login'`

| # | Element | Type | Interaction |
|---|---|---|---|
|1| "‹ Back" text button | Button | N → AuthLanding |
|2| Logo tile 88×88 | Image | — |
|3| Card: title (`loginTitle` — "Sign in to ride" / "Create your rider account") | Text | — |
|4| Subtitle (`loginSubtitle` — varies by method) | Text | — |
|5| "Choose login method" label | Text | — |
|6| Segmented switch: Mobile / WhatsApp / Email (3 pills) | SegmentedControl | S → `loginMethod`; active pill white w/ shadow |
|7| Field label (`loginFieldLabel`) | Text | — |
|8| Phone input row: "+91" prefix, divider, numeric TextInput (10-digit, digits only) | TextInput | S → `phone` (strip non-digits, max 10) — shown when method≠email |
|9| Email input row: ✉️ prefix, divider, email TextInput | TextInput | S → `email` — shown when method=email |
|10| Info banner (ⓘ) with `loginHint` (mentions demo hint / 9000000000 wrong-OTP / not-found) | Banner | — |
|11| Send button (`sendBtnLabel` — "Send OTP" / "Send code on WhatsApp") | Button | F → validates (email regex OR phone.length==10) → N → OTP. Disabled style when invalid (`#C7D6C8`). |
|12| Switch-intent link (`switchAuthLabel`) | Link | S → togg`authIntent` signup↔login |
- States: disabled/enabled send button; phone vs email field; not-found hint variant (`loginNotFound`).

## 3. OtpScreen — `screen: 'otp'`

| # | Element | Type | Interaction |
|---|---|---|---|
|1| "‹ Back" button | Button | S → clear otp/error, N → Login |
|2| "Verify OTP" title | Text | — |
|3| "Enter the 4-digit code sent to \<otpTarget\>" (email or +91 masked phone) | Text | — |
|4| 4 OTP boxes (56×64, single char, numeric) w/ auto-advance + backspace-to-prev | TextInput ×4 | S → `otp`; focus mgmt via refs; active box green border |
|5| Error banner (⚠, "Incorrect code. Please try again.") | Banner | shown when `otpError` (phone==9000000000) |
|6| "Autofill demo code" button | Button | S → otp='1234' |
|7| "Resend in 0:24" static text | Text | — (static, no timer in HTML) |
|8| "Verify & Continue" primary button | Button | F → if otp.len==4: wrong-code check → signup→ObWelcome (or home if approved) / login→Home. Disabled when <4. |
- States: error / no-error; button enabled at 4 digits.

## 4. HomeScreen (Dashboard) — `screen: 'home'` (tab)

| # | Element | Type | Interaction |
|---|---|---|---|
|1| "Welcome back," + "Arjun" heading | Text | — |
|2| Active-shift chip (clock SVG + `activeShiftLabel`) | Chip | — (label: shift time when online, "Not working · tap to go online" when offline) |
|3| Bulk-mode chip 🚐 "\<VEH\> · \<NO\> · BULK DELIVERY" | Chip | shown only when `isBulkMode` |
|4| Online/Offline toggle switch + label | Switch | T → if online: go offline; if offline: open Shift-select sheet |
|5| "Today's Performance" header + "View Details ›" | Text/Link | Link N → Earnings |
|6| 4 stat cards: ₹1,240 COD Collected / 14 Orders Delivered / 5.2 Online Hours / 2 Slots Completed (each: colored icon tile + value + label) | Card ×4 | — |
|7| Daily-incentive gradient card: "DAILY INCENTIVE / Complete 20 orders", "₹150 earned" pill, progress bar 70% (14/20), "Delivered on time: 13, late: 1" | Card | — |
|8| **Standard mode**, online: "2 new orders available / Tap to view and accept" card w/ pulsing red "2" badge | Card | N → Orders |
|8b| **Bulk mode**, online, batch not done: purple "ACTIVE BULK DELIVERY / Batch #\<id\>" card — "\<n\> orders" pill, Delivered/Remaining/Failed counts, progress bar, "\<View Batch/Continue Loading/Continue Delivery\> →" CTA | Card | N → bulkOverview / bulkLoading / bulkActive (by `bulkBatchStatus`) |
|9| Offline: "You're currently offline / Turn on the toggle above…" empty-state card | Card | — |
|10| "Book More Slots / Schedule your upcoming shifts" row w/ calendar icon + chevron | Row | N → Shifts (prev='home') |
- States: online vs offline; bulk vs standard mode; batch status.

## 5. OrdersScreen (Live Orders) — `screen: 'orders'` (tab)

| # | Element | Type | Interaction |
|---|---|---|---|
|1| "Live Orders" title + "New assignments and deliveries in progress" sub | Text | — |
|2| Bulk batch banner (purple) "BULK BATCH · #\<id\>" + "\<label\> ›" + "\<c\> delivered · \<r\> remaining · \<f\> failed" | Banner | shown when bulk mode + not done; N → bulk screen |
|3| "Active Order" section (badge "1") — resume card: live status pill (`activeStatusLabel`), order #, deliver addr, "\<dist\> · \<items\> items · ₹\<payout\>", "Continue Delivery →" bar | Card | shown when `flowActive`; N → `flowScreen` |
|4| "Available to Accept" header + count badge | Text | — |
|5| Available-order cards (×`availCount`, from ORDERS minus active): PRIORITY corner ribbon (conditional), ₹payout + "Estimated Payout", order # chip, pickup→deliver timeline (green/red dots + connector), PICKUP name+bay, DELIVER addr, 3 pill stats (📍 dist / ⏱ time / 🛍 items), "Accept Order" pill button | Card | button → S set activeId+flowScreen='accept', N → Accept |
|6| Empty state: "No new orders right now / New assignments will appear here." | Card | shown when `noAvailable` |
- States: has-active vs none; has-available vs empty; bulk banner.

## 6. EarningsScreen — `screen: 'earnings'` (tab)

| # | Element | Type |
|---|---|---|
|1| "Earnings" title | Text |
|2| "THIS WEEK" gradient hero card: ₹6,480, + Deliveries 68 / Avg/order ₹95 / Online 28.5h | Card |
|3| "Next payout" row card: "Every Monday · UPI" / ₹6,480 "in 2 days" | Card |
|4| "Earnings breakdown" list card: Standard Deliveries ₹4,120 / Bulk Delivery ₹1,680 (purple) / Incentives ₹680 | Card |
|5| "Daily breakdown" list card: 5 rows (MON…THU) — day chip, date, "\<orders\> orders · \<hours\>", ₹amount | List |
- States: none (static data).

## 7. HistoryScreen — `screen: 'history'` (tab)

| # | Element | Type | Interaction |
|---|---|---|---|
|1| "History" title + "Your completed deliveries" | Text | — |
|2| Filter tabs: All / Standard / Bulk (horizontal scroll pills) | Tabs | S → `historyFilter`; active = dark pill |
|3| Bulk batch history entry card (🛺 "Bulk Batch" pill, "Yesterday, 6:20 PM", "Batch #BD-10475 · Koramangala → HSR Layout", "18 orders · 17 delivered · 14.2 km", ₹868) | Card | shown when filter ≠ 'standard'; N → BulkHistoryDetail |
|4| Standard history cards ×4 (✓ Delivered pill, time, addr, "#num · items · dist", ₹payout) | Card | shown when filter ≠ 'bulk' |
- States: filter selection; conditional lists.

## 8. BulkHistoryDetailScreen — `screen: 'bulkHistoryDetail'`

| # | Element | Type | Interaction |
|---|---|---|---|
|1| Header: ‹ back + "Batch #BD-10475" + "Yesterday · Koramangala → HSR Layout" | Header | back → History |
|2| 3 stat tiles: 18 Orders / 17 Delivered (green) / 1 Failed (red) | Tiles |
|3| Detail rows card: Vehicle "Auto · KA 01 AB 1234" / Distance 14.2 km / Duration 1h 12m / Earnings ₹868 (green) | List |

## 9. BulkOverviewScreen — `screen: 'bulkOverview'`

| # | Element | Type | Interaction |
|---|---|---|---|
|1| Purple header: ‹ back (chip) + "Bulk Delivery" + "Batch #\<id\>" + "\<VEH\> · \<NO\> · Koramangala" | Header | back → Orders |
|2| "Batch Summary" card: 6 cells — Total Orders / Completed (green) / Remaining / Failed (red) / Distance 14.6 km / Est. Time 1h 42m | Card |
|3| "View Route / All \<n\> stops in delivery order" row (🗺 icon + chevron) | Row | N → BulkAllStops (return='bulkOverview') |
|4| "Go to Dark Store · Load Orders" purple primary button | Button | S → bulkBatchStatus='loading', N → BulkLoading |

## 10. BulkLoadingScreen — `screen: 'bulkLoading'`

| # | Element | Type | Interaction |
|---|---|---|---|
|1| Header: ‹ back + "Load Bulk Orders" + "Selorg Darkstore — Koramangala" + "\<loaded\>/\<total\>" counter (purple) | Header | back → BulkOverview |
|2| Missing-bags warning banner ("⚠️ \<n\> bags not loaded yet — scan each to continue") | Banner | shown when `bulkMissingCount` |
|3| Bag checklist ×10 (checkbox tile + customer name + "Bag \<code\> · \<num\>") | Checkbox list | T → `bulkLoaded[bag]` |
|4| Start button (`startBulkBtnLabel` — "Start Bulk Delivery" / "Load all bags to continue (n/total)") | Button | S → bulkBatchStatus='dispatched', stopPhase='toNav', N → BulkActive. Disabled until all loaded. |
- States: partial vs all-loaded; warning banner.

## 11. BulkActiveScreen — `screen: 'bulkActive'`

| # | Element | Type | Interaction |
|---|---|---|---|
|1| Purple header: "BULK DELIVERY · #\<id\>" + "All Stops ›" | Header | link N → BulkAllStops (return='bulkActive') |
|2| Progress row: "\<c\>/\<total\> Delivered" / "\<r\> Remaining" / "\<f\> Failed" | Stats |
|3| Stop rail: horizontal-scroll numbered chips (✓ delivered green / ✕ failed red / n current dark / n upcoming grey) | Rail |
|4| Map placeholder (gradient + dashed route SVG, purple) | Map |
|5| Current-stop card: "STOP \<n\> OF \<total\>" pill + "Order Details ›" link, customer name, "\<num\> · \<addr\>", 3 pills (📍 dist / ⏱ eta / 📞 Call), navigating note (conditional), phase button (`bulkPhaseBtnLabel`: Start Navigation → Mark Arrived → Deliver Order), "Report Delivery Issue" outline button | Card | Order Details → N BulkStopDetail; phase btn → S stopPhase / N BulkVerify; Report → M bulk exception sheet |
- States: stopPhase (toNav/navigating/arrived); shown only when `bulkNotDone`.

## 12. BulkAllStopsScreen — `screen: 'bulkAllStops'`

| # | Element | Type | Interaction |
|---|---|---|---|
|1| Header: ‹ back + "All Stops · \<total\>" | Header | back → `bulkReturnTo` |
|2| Search input ("Search order, customer, or address") | TextInput | S → `bulkSearch` (filters list) |
|3| Filter tabs: All / Current / Upcoming / Delivered / Failed (scroll pills) | Tabs | S → `bulkFilter` |
|4| Empty state "No stops match" | Text | when filtered list empty |
|5| Stop rows ×N: number badge (colored by status), customer, "\<num\> · \<addr\>" (ellipsis), status pill (Current/Upcoming/Delivered/Failed) | Row list | row → N BulkStopDetail (return='bulkAllStops') |
- States: search text; filter; empty.

## 13. BulkStopDetailScreen — `screen: 'bulkStopDetail'`

| # | Element | Type | Interaction |
|---|---|---|---|
|1| Header: ‹ back + "Stop \<n\> of \<total\>" | Header | back → `bulkReturnTo` |
|2| Status pill (Current/Delivered/Failed/Upcoming) | Badge |
|3| Customer name + "\<num\> · \<items\> items · Bag \<code\>" | Text |
|4| Address card: "DELIVERY ADDRESS" + addr + "📍 dist / ⏱ eta" | Card |
|5| "📞 Call" button + "Report Issue" button | Buttons | Report → M bulk exception sheet (target = this stop) |
|6| "Navigate to This Stop" purple primary button | Button | shown only if this stop is current; S → N BulkActive, stopPhase='navigating' |

## 14. BulkVerifyScreen — `screen: 'bulkVerify'`

| # | Element | Type | Interaction |
|---|---|---|---|
|1| Header: ‹ back + "Proof of Delivery" + "Stop \<n\> of \<total\>" | Header | back → BulkActive |
|2| Photo capture box (dashed; empty: 📷 "Tap to capture photo / Show the package at the door"; taken: green check pop + "Photo captured / Tap to retake") | Pressable | T → `bulkPhotoTaken` |
|3| "Confirm Delivery" primary button (disabled until photo) | Button | S → mark current stop 'delivered'; if all done → bulkComplete else BulkActive |
- States: photo taken vs not.

## 15. BulkCompleteScreen — `screen: 'bulkComplete'`

| # | Element | Type | Interaction |
|---|---|---|---|
|1| Full-bleed purple gradient, big check (pop) | Visual |
|2| "Batch Completed!" + "Batch #\<id\> finished" | Text |
|3| Summary card: Orders / Delivered / Failed (row 1); Distance 14.6 km / Duration 58 min / ₹\<earning\> (row 2) | Card |
|4| "Back to Home" white button | Button | S → reset batch (status='assigned', clear statuses/loaded), N → Home |

## 16. ProfileScreen — `screen: 'profile'` (tab)

| # | Element | Type | Interaction |
|---|---|---|---|
|1| Green gradient header: "Profile" + ⚙️ settings icon | Header | ⚙️ N → Settings |
|2| Avatar (initial) + name + email + "★ 4.9 · Verified Rider" pill | Text |
|3| 3 stat tiles: 1,284 Total trips / 98% On-time / ₹\<floatCash\> Float cash (green) | Tiles |
|4| "Vehicle & Mode" card: vehicle icon, "\<VEH\> · \<NO\>", mode label ("Bulk Delivery" purple / "Standard Delivery" green), "Switch (demo)" link | Card | link → S toggle `vehicleType` auto↔motorcycle |
|5| Menu group "Account": Documents & KYC / My Shifts / Floating Cash & Deposits (icon tile + label + sub + chevron) | List | rows → N docs / shifts / floatcash (prev='profile') |
|6| Menu group "Support & Settings": Help & Support / Settings | List | rows → N support / settings |
|7| "⏻ Log out" danger outline button | Button | S → reset auth, N → AuthLanding |
|8| "Selorg Rider · v1.0.0" caption | Text |

## 17. AcceptScreen (Order Accepted) — `screen: 'accept'`

| # | Element | Type | Interaction |
|---|---|---|---|
|1| Green gradient header: ‹ back chip, check tile (pop), "Order Accepted!", "Head to the darkstore to pick up \<num\>" | Header | back → Orders |
|2| Payout + pickup→deliver timeline card | Card |
|3| 3 stat cards: Distance / Est. time / Items | Cards |
|4| "Start Navigation to Store →" primary button | Button | S → N Travel, flowScreen='travel' |

## 18. TravelScreen (to darkstore) — `screen: 'travel'`

| # | Element | Type | Interaction |
|---|---|---|---|
|1| Map placeholder (gradient + dashed route SVG, green dot + red square) w/ ‹ back chip | Map | back → Orders |
|2| Floating store card: 🏬 + `activePickup` + "\<dist\> · ~6 min away" | Card |
|3| "Heading to darkstore / Navigate to \<bay\> and tap…" copy | Text |
|4| "I've Arrived at Store" primary button | Button | S → N Bag, flowScreen='bag' |

## 19. BagScreen (Verify & Collect) — `screen: 'bag'`

| # | Element | Type | Interaction |
|---|---|---|---|
|1| Header: ‹ back + "Verify & Collect" + "\<num\> · \<bay\>" | Header | back → Orders |
|2| Bag banner: 🛍 "Bag SG-\<raw\>-A / Check each item before confirming" + "\<checked\>/\<total\>" | Banner |
|3| Item checklist ×4 (checkbox + name + qty; checked row tinted) | Checkbox list | T → `checked[i]` |
|4| Confirm button (`pickupBtnLabel` — "Confirm Pickup" / "Check all items to continue") | Button | S → N Nav (flowScreen='nav'); disabled until all checked |
- States: partial vs all checked.

## 20. NavScreen (Customer Navigation) — `screen: 'nav'`

| # | Element | Type | Interaction |
|---|---|---|---|
|1| Map placeholder + ‹ back chip + "Out for delivery" pill | Map | back → Orders |
|2| Floating customer card: 📍 + `activeDeliver` + "\<dist\> · ~9 min to customer" + "📞 Call" / "💬 Chat" buttons (noop) | Card |
|3| "I've Reached the Customer" primary button | Button | S → N Photo, flowScreen='photo' |
|4| "Cancel order" danger outline button | Button | M → cancel-order sheet |

## 21. PhotoScreen (Proof of Delivery) — `screen: 'photo'`

| # | Element | Type | Interaction |
|---|---|---|---|
|1| Header: ‹ back + "Proof of Delivery" + "Photo at the drop location" | Header | back → Nav |
|2| Photo capture box (dashed; empty: 📷; taken: green check pop) | Pressable | T → `photoTaken` |
|3| Tip banner "💡 Make sure the package and door number are clearly visible…" | Banner |
|4| "Confirm Delivery" primary button (disabled until photo) | Button | S → N Complete, flowScreen='complete' |

## 22. CompleteScreen (Delivered) — `screen: 'complete'`

| # | Element | Type | Interaction |
|---|---|---|---|
|1| Full-bleed green gradient, big check (pop), "Delivered!", "\<num\> handed over successfully" | Visual |
|2| Earnings card: "You earned" ₹\<payout\> (40px); Trip time 11 min / Distance / Today's trips 15 | Card |
|3| "Back to Orders" white button | Button | S → reset active order, N → Orders |

## 23. Onboarding — Welcome — `screen: 'obWelcome'`

| # | Element | Type | Interaction |
|---|---|---|---|
|1| Logo tile + "Let's get you on the road 🛵" + "Complete a quick 5-step setup…" | Text |
|2| 5 step rows (icon tile + label + number): Personal details / Vehicle information / Choose your hub / Upload documents / Training & kit | List |
|3| "Get Started" primary button | Button | N → obPersonal |

## 24. Onboarding — Personal — `screen: 'obPersonal'`

| # | Element | Type | Interaction |
|---|---|---|---|
|1| ‹ back | Button | N → obWelcome |
|2| 5-segment progress bar (`obBar1..5`) | Progress |
|3| "STEP 1 OF 5" + "Personal details" + "Tell us who you are" | Text |
|4| "Full name" TextInput | TextInput | S → `obName` |
|5| "Email address" TextInput | TextInput | S → `obEmail` |
|6| "Mobile number" — read-only "+91 \<masked\>" + "✓ Verified" | Field |
|7| "Continue" button (disabled until name+email) | Button | F → N obVehicle |

## 25. Onboarding — Vehicle — `screen: 'obVehicle'`

| # | Element | Type | Interaction |
|---|---|---|---|
|1| ‹ back → obPersonal | Button |
|2| Progress bar (step 2) | Progress |
|3| "STEP 2 OF 5" + "Your vehicle" + "What will you deliver with?" | Text |
|4| Vehicle grid 2×2: Motorbike 🏍 / Scooter 🛵 / Electric Vehicle ⚡ / Bicycle 🚲 (selectable card) | RadioGrid | S → `obVehicle` |
|5| "Vehicle registration number" TextInput (uppercased) | TextInput | S → `obVehicleNo` |
|6| "Continue" button (disabled until vehicle + regNo≥4 chars) | Button | F → N obHub |

## 26. Onboarding — Hub — `screen: 'obHub'`

| # | Element | Type | Interaction |
|---|---|---|---|
|1| ‹ back → obVehicle | Button |
|2| Progress bar (step 3) | Progress |
|3| "STEP 3 OF 5" + "Choose your hub" + "Pick the darkstore you'll ride from" | Text |
|4| **loc not ready**: 📍 empty-state "Enable location / We use your location…" + "Enable location" button (label → "Getting your location…" while locating) | EmptyState + Button | S → locStage 'locating' → (1.1s) 'ready' |
|5| **loc ready**: "📍 Location on · showing hubs near Koramangala" banner + 3 hub radio cards (radio + name + dist + addr + bays) + "Continue" button | RadioList + Button | radio → S `obHub`; Continue → N obKyc (disabled until hub) |
- States: locStage idle/locating/ready.

## 27. Onboarding — KYC — `screen: 'obKyc'`

| # | Element | Type | Interaction |
|---|---|---|---|
|1| ‹ back → obHub | Button |
|2| Progress bar (step 4) | Progress |
|3| "STEP 4 OF 5" + "\<count\>/\<total\>" + "Upload documents" + "Verify your identity & vehicle" | Text |
|4| 5 doc rows: Aadhaar / PAN / Driving License / Vehicle RC / Vehicle Insurance (icon + label + sub + "Upload" / "✓ Uploaded" badge) | List | badge → T `obDocs[code]` (simulated upload) |
|5| Continue button (`kycBtnLabel` — "Continue" / "Upload all documents to continue") | Button | F → N obTraining; disabled until all 5 |
- States: per-doc uploaded; button disabled.

## 28. Onboarding — Training & Kit — `screen: 'obTraining'`

| # | Element | Type | Interaction |
|---|---|---|---|
|1| ‹ back → obKyc | Button |
|2| Progress bar (step 5) | Progress |
|3| "STEP 5 OF 5" + "Training & kit" + "Watch the intro and confirm your kit" | Text |
|4| Video box (pending: ▶ "Rider onboarding · 3 min" on dark; done: ✓ "Training completed" on green) | Pressable | S → `obVideo`=true |
|5| "Confirm you've received your kit (\<n\>/\<total\>)" | Text |
|6| Kit checklist ×4: Insulated delivery bag 🛍 / Selorg uniform t-shirt 👕 / Rider ID card 🪪 / Safety helmet ⛑ | Checkbox list | T → `obKit[id]` |
|7| "Review & Submit" button (disabled until video + all kit) | Button | F → N obReview |

## 29. Onboarding — Review — `screen: 'obReview'`

| # | Element | Type | Interaction |
|---|---|---|---|
|1| ‹ back → obTraining | Button |
|2| "Review your details / Confirm everything looks right" | Text |
|3| Rows card: Name / Email / Phone / Vehicle ("\<label\> · \<no\>") / Hub / Documents "✓ All uploaded" | List |
|4| "Submit Application" primary button | Button | S → accountStatus='pending', N → Pending |

## 30. Onboarding — Done — `screen: 'obDone'`

| # | Element | Type | Interaction |
|---|---|---|---|
|1| Full-bleed green gradient, big check (pop), "You're all set! 🎉", approval copy | Visual |
|2| "Go to Dashboard" white button | Button | S → onboarded=true, accountStatus='approved', epName/epEmail/epVehicle from onboarding, N → Home |

## 31. PendingScreen (Application under review) — `screen: 'pending'`

| # | Element | Type | Interaction |
|---|---|---|---|
|1| ‹ back (→ logout) | Button | S → logout → AuthLanding |
|2| ⏳ tile + "Application under review" + "Thanks for signing up, \<obName\>…" | Text |
|3| Info card: Application ID \<appId\> / Hub \<reviewHub\> / Status "● Pending" (amber) | Card |
|4| "Check application status" outline button + "Demo: status check simulates a review outcome" caption | Button | S → accountStatus='approved', N → obDone |

## 32. RejectedScreen (Application needs changes) — `screen: 'rejected'`

| # | Element | Type | Interaction |
|---|---|---|---|
|1| ‹ back (→ logout) | Button |
|2| ⚠️ tile + "Application needs changes" + copy | Text |
|3| Reason card (red): "Driving licence photo was blurry and could not be verified." | Card |
|4| "Resubmit Documents" primary button | Button | S → accountStatus='none', obDocs cleared, N → obKyc |

*(Rejected screen has no direct navigation into it in the shipped flow — it is a designed state
reachable by setting `screen:'rejected'`; reproduced for completeness.)*

## 33. DocsScreen (Documents & KYC) — `screen: 'docs'`

| # | Element | Type | Interaction |
|---|---|---|---|
|1| Header: ‹ back + "Documents & KYC" | Header | back → Profile/Home (by `prev`) |
|2| "✓ KYC Verified / All documents approved" green banner | Banner |
|3| 5 doc rows (icon + label + sub + "Verified" green pill) | List |

## 34. ShiftsScreen (My Shifts) — `screen: 'shifts'`

| # | Element | Type | Interaction |
|---|---|---|---|
|1| Header: ‹ back + "My Shifts" | Header | back → Profile/Home |
|2| "Today · Tue, 13 Feb · \<n\> slots booked" | Text |
|3| 4 slot cards: time + label pill (Morning/Midday/Afternoon/Evening) + "Book slot" / "✓ Booked" button + "💰 \<pay\>" | List | button → T `booked[id]` |
- States: per-slot booked.

## 35. FloatCashScreen (Floating Cash) — `screen: 'floatcash'`

| # | Element | Type | Interaction |
|---|---|---|---|
|1| Header: ‹ back + "Floating Cash" | Header | back → Profile/Home |
|2| Green hero card: "CASH IN HAND (COD)" ₹\<floatCash\> + "Deposit limit: ₹2,000 · Deposit before end of shift" | Card |
|3| "Deposit cash to Selorg" outline button | Button | M → deposit sheet |
|4| "Recent transactions" list: extraTxns + 4 default rows (label + time + signed amount, green/red) | List |
- States: floatCash + txns update after a deposit.

## 36. SupportScreen (Help & Support) — `screen: 'support'`

| # | Element | Type | Interaction |
|---|---|---|---|
|1| Header: ‹ back + "Help & Support" + "● Support online" | Header | back → Profile/Home |
|2| 3 channel tiles: 📞 Call (24×7) / ✉️ Email (~4 hrs) / 💬 Live Chat (● Online) | Tiles | Call → S contactVia='call'; Email → 'email'; Live Chat → 'chat' |
|3| Contact note banner (`contactNote` — helpline / email / live-chat message) | Banner | shown when `contactVia` set |
|4| "Quick help" FAQ list ×3 (q + a) | List |
|5| Chat thread (bubbles, me right green / them left white) | List |
|6| Chat input row: TextInput + ➤ send button | Input | S → `chatInput`; send → append my msg + (0.9s) canned reply |
- States: contact note; growing chat.

## 37. SettingsScreen — `screen: 'settings'`

| # | Element | Type | Interaction |
|---|---|---|---|
|1| Header: ‹ back + "Settings" | Header | back → Profile/Home |
|2| Rows list: Push notifications (toggle) / Location sharing (toggle) / Order sound alerts (toggle) / Language (value = current, opens sheet) / Privacy Policy (chevron) / Terms of Service (chevron) / App version (value "v1.0.0") | List | toggles → T `toggles[id]`; Language → M language sheet; Privacy → N privacy; Terms → N terms |

## 38. PrivacyScreen — `screen: 'privacy'`

| # | Element | Type | Interaction |
|---|---|---|---|
|1| Header: ‹ back + "Privacy Policy" | Header | back → Settings |
|2| "Last updated 12 Feb 2026" | Text |
|3| 5 sections (h + body) | List |

## 39. TermsScreen — `screen: 'terms'`

| # | Element | Type | Interaction |
|---|---|---|---|
|1| Header: ‹ back + "Terms of Service" | Header | back → Settings |
|2| "Effective 1 Jan 2026" | Text |
|3| 5 sections (h + body) | List |

---

## Bottom sheets / modals (phone-level overlays)

### A. Shift-select sheet — `shiftSheetOpen`
Grabber, "Select a shift to start / Pick the slot you're working now to go online", 4 slot radio
rows (time + pay), "Start Working" button (disabled until picked). Tap scrim → close.
- Open: Home toggle when going online. Confirm: S isOnline=true, activeShiftId, close.

### B. Deposit sheet — `depositStage` ('form' | 'done')
**form:** "Deposit cash / Hand cash to your hub and record it here", ₹ amount TextInput (numeric,
max 5 digits), "Cash in hand: ₹\<x\>" + "Deposit full amount" link, error text (conditional),
"DEPOSIT METHOD" + 3 pay-method radio rows (UPI / Bank Transfer / Card), submit button
(`depositBtnLabel` by method; disabled until amount>0).
**done:** green check pop, "Deposit recorded", "₹\<amt\> deposited via \<method\>…", remaining
cash + ref card, "Done" button.
- Validation: amount>0, amount ≤ cash in hand (else error). On success: decrement floatCash, prepend txn.

### C. Cancel-order sheet — `cancelStage` ('form' | 'done')
**form:** "Cancel order \<num\>? / Choose a reason. Frequent cancellations may affect your rating.",
6 reason radio rows (unreachable / refused / address / asked / vehicle / other), note textarea
(shown when 'other'), "Keep order" + "Cancel order" (red, disabled until reason (+note if other)).
**done:** red ✕ pop, "Order cancelled", "\<num\> has been returned to the hub…", reason card,
"Back to Orders" button → resets active order flow.

### D. Language sheet — `langOpen`
"Choose language / App text will switch to your selection", 5 radio rows (English / हिन्दी / ಕನ್ನಡ /
தமிழ் / తెలుగు — native + english label). Pick → S language, close.

### E. Bulk delivery-issue sheet — `bulkExceptionOpen`
"Delivery issue / This stop will be marked failed and skipped for now", 4 reason radio rows
(unreachable / refused / address / other), note textarea (when 'other'), "Cancel" + "Mark Failed"
(red, disabled until valid). Confirm → S mark target stop 'failed', reset stopPhase, back to
BulkActive if it was the current stop.

---

## Summary counts

- **HTML files:** 3 (`Selorg Rider.dc.html` chosen as source of truth; other 2 are earlier subsets)
- **Screens:** 39 (`authLanding, login, otp, home, orders, earnings, history, bulkHistoryDetail,
  bulkOverview, bulkLoading, bulkActive, bulkAllStops, bulkStopDetail, bulkVerify, bulkComplete,
  profile, accept, travel, bag, nav, photo, complete, obWelcome, obPersonal, obVehicle, obHub,
  obKyc, obTraining, obReview, obDone, pending, rejected, docs, shifts, floatcash, support,
  settings, privacy, terms`)
- **Bottom sheets:** 5 (shift-select, deposit, cancel-order, language, bulk-exception)
- **Bottom tab items:** 5
- **Reusable component patterns:** primary button, outline/danger button, segmented control,
  radio row, checkbox row, stat card/tile, status/priority badge, live pulse dot, section header,
  info/warning/success banner, screen header w/ back, bottom sheet shell, map placeholder,
  progress-bar (onboarding), filter-tab strip, empty state, success screen, phone-frame(dropped).
