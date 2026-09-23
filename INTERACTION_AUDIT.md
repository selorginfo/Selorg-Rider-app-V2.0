# INTERACTION_AUDIT.md — Selorg Rider App

Every interactive element in `Selorg Rider.dc.html`, its React Native equivalent, the handler, and
the expected result. Handlers live in `src/store/RiderContext.tsx` (global reducer/actions) unless
noted. `nav.*` = React Navigation call. `dispatch(...)` = context action.

Legend: **RN** column component — `Pressable` (P), `TouchableOpacity` (TO), `TextInput` (TI),
`Switch`-like custom (SW), `Modal` (MOD), `FlatList`/`ScrollView` row (LR).

---

## App shell

| HTML element | RN | Handler | Result |
|---|---|---|---|
| Bottom tab "Home" | P | `nav.navigate('Home')` | Home tab; icon chip active |
| Bottom tab "Orders" | P | `nav.navigate('Orders')` | Orders tab |
| Bottom tab "Earnings" | P | `nav.navigate('Earnings')` | Earnings tab |
| Bottom tab "History" | P | `nav.navigate('History')` | History tab |
| Bottom tab "Profile" | P | `nav.navigate('Profile')` | Profile tab |

## Auth Landing

| HTML | RN | Handler | Result |
|---|---|---|---|
| "Log In" | P | `dispatch(setAuthIntent('login')); nav.navigate('Login')` | Login screen, title "Sign in to ride" |
| "Create Rider Account" | P | `dispatch(setAuthIntent('signup')); nav.navigate('Login')` | Login screen, title "Create your rider account" |

## Login

| HTML | RN | Handler | Result |
|---|---|---|---|
| "‹ Back" | P | `nav.goBack()` | back to Auth Landing |
| Method pill Mobile/WhatsApp/Email | P | `dispatch(setLoginMethod(id))` | active pill styled; field + copy switch |
| Phone `<input>` | TI | `dispatch(setPhone(digitsOnly.slice(0,10)))` | controlled value; send enabled at 10 |
| Email `<input>` | TI | `dispatch(setEmail(v))` | controlled; send enabled on `/.+@.+\..+/` |
| Send OTP button | P | `if valid: nav.navigate('Otp')` | OTP screen; no-op if invalid (disabled style) |
| Switch-intent link | P | `dispatch(toggleAuthIntent())` | signup↔login title + link text swap |

## OTP

| HTML | RN | Handler | Result |
|---|---|---|---|
| "‹ Back" | P | `dispatch(resetOtp()); nav.goBack()` | Login, otp cleared |
| OTP box ×4 | TI | `dispatch(setOtpDigit(i, d))` + `refs[i+1].focus()` | auto-advance; backspace on empty → prev box |
| "Autofill demo code" | P | `dispatch(setOtp('1234'))` | boxes filled |
| "Verify & Continue" | P | `verifyOtp()` | len<4 → no-op; phone `9000000000` → error banner; signup → Onboarding Welcome (or Home if approved); login → Home |

## Home

| HTML | RN | Handler | Result |
|---|---|---|---|
| Online/offline toggle | SW (P) | online→`dispatch(goOffline())`; offline→`dispatch(openShiftSheet())` | offline sets `isOnline=false`; going online opens Shift-select sheet |
| "View Details ›" | P | `nav.navigate('Earnings')` | Earnings tab |
| Standard "2 new orders available" card | P | `nav.navigate('Orders')` | Orders tab |
| Bulk "ACTIVE BULK DELIVERY" card | P | `openBulkFromHome()` — status `assigned`→`nav.navigate('BulkOverview')`, `loading`→`BulkLoading`, else `BulkActive` | resumes batch at correct stage |
| "Book More Slots" row | P | `dispatch(setPrev('home')); nav.navigate('Shifts')` | Shifts screen |

## Orders

| HTML | RN | Handler | Result |
|---|---|---|---|
| Bulk batch banner | P | `openBulkFromHome()` | resume bulk batch |
| Active-order resume card | P | `nav.navigate(flowScreenRoute)` | jumps to `accept/travel/bag/nav/photo/complete` |
| "Accept Order" (per available order) | P | `dispatch(acceptOrder(id)); nav.navigate('Accept')` | sets `activeId`, `flowScreen='accept'`, clears checklist/photo; Accept screen |

## Earnings / Privacy / Terms / Docs

Static screens — only the header back button is interactive (`nav.goBack()` / to Settings/Profile).

## History

| HTML | RN | Handler | Result |
|---|---|---|---|
| Filter tab All/Standard/Bulk | P | `dispatch(setHistoryFilter(f))` | active pill; lists show/hide (`historyFilter !== 'standard'` shows bulk entry; `!== 'bulk'` shows standard list) |
| Bulk batch history card | P | `nav.navigate('BulkHistoryDetail')` | detail screen |

## Bulk Overview

| HTML | RN | Handler | Result |
|---|---|---|---|
| ‹ back chip | P | `nav.navigate('Orders')` | Orders |
| "View Route" row | P | `dispatch(setBulkReturn('BulkOverview')); nav.navigate('BulkAllStops')` | All-stops list |
| "Go to Dark Store · Load Orders" | P | `dispatch(setBulkStatus('loading')); nav.navigate('BulkLoading')` | Loading screen |

## Bulk Loading

| HTML | RN | Handler | Result |
|---|---|---|---|
| ‹ back | P | `nav.navigate('BulkOverview')` | Overview |
| Bag checkbox row ×10 | P | `dispatch(toggleBulkBag(bag))` | check/uncheck; counter + warning banner update |
| Start button | P | `if allLoaded: dispatch(startBulkDelivery()); nav.navigate('BulkActive')` | sets status `dispatched`, `bulkStopPhase='toNav'`; disabled label otherwise |

## Bulk Active

| HTML | RN | Handler | Result |
|---|---|---|---|
| "All Stops ›" | P | `dispatch(setBulkReturn('BulkActive')); nav.navigate('BulkAllStops')` | list |
| "Order Details ›" | P | `dispatch(openStopDetail(currentIdx,'BulkActive')); nav.navigate('BulkStopDetail')` | detail |
| Phase button | P | `bulkPhaseAction()` — `toNav`→phase `navigating`; `navigating`→phase `arrived`; `arrived`→`nav.navigate('BulkVerify')` (reset `bulkPhotoTaken`) | advances current-stop phase / proof screen |
| "Report Delivery Issue" | P | `dispatch(openException(currentIdx)); ` open sheet | Bulk-exception sheet |
| "📞 Call" pill | P | `noop` | — |

## Bulk All Stops

| HTML | RN | Handler | Result |
|---|---|---|---|
| ‹ back | P | `nav.navigate(bulkReturnTo)` | returns to Active/Overview |
| Search input | TI | `dispatch(setBulkSearch(v))` | filters rows (customer/num/addr, case-insensitive) |
| Filter tab All/Current/Upcoming/Delivered/Failed | P | `dispatch(setBulkFilter(f))` | filters rows |
| Stop row | P | `dispatch(openStopDetail(idx,'BulkAllStops')); nav.navigate('BulkStopDetail')` | detail |

## Bulk Stop Detail

| HTML | RN | Handler | Result |
|---|---|---|---|
| ‹ back | P | `nav.navigate(bulkReturnTo)` | back to Active/AllStops |
| "📞 Call" | P | `noop` | — |
| "Report Issue" | P | `dispatch(openException(detailIdx ?? currentIdx))` | Bulk-exception sheet |
| "Navigate to This Stop" (only if current) | P | `dispatch(setBulkPhase('navigating')); nav.navigate('BulkActive')` | Active, phase navigating |

## Bulk Verify

| HTML | RN | Handler | Result |
|---|---|---|---|
| ‹ back | P | `nav.navigate('BulkActive')` | Active |
| Photo box | P | `dispatch(toggleBulkPhoto())` | toggles captured state |
| "Confirm Delivery" (disabled until photo) | P | `dispatch(confirmBulkDelivery())` | marks current stop `delivered`, phase `toNav`; if all stops resolved → `nav.navigate('BulkComplete')` + status `completed`, else `nav.navigate('BulkActive')` |

## Bulk Complete

| HTML | RN | Handler | Result |
|---|---|---|---|
| "Back to Home" | P | `dispatch(resetBulkBatch()); nav.navigate('Home')` | status `assigned`, statuses/loaded cleared |

## Bulk Exception Sheet

| HTML | RN | Handler | Result |
|---|---|---|---|
| scrim | P | `dispatch(closeException())` | close |
| reason row ×4 | P | `dispatch(setExceptionReason(id))` | select (red) |
| note textarea (when 'other') | TI | `dispatch(setExceptionNote(v))` | required for validity |
| "Cancel" | P | `dispatch(closeException())` | close |
| "Mark Failed" (disabled until valid) | P | `dispatch(confirmException())` | target stop → `failed`, phase reset; if it was current stop, ensure on BulkActive |

## Profile

| HTML | RN | Handler | Result |
|---|---|---|---|
| ⚙️ settings | P | `dispatch(setPrev('profile')); nav.navigate('Settings')` | Settings |
| "Switch (demo)" | P | `dispatch(toggleVehicleMode())` | `vehicleType` auto↔motorcycle → bulk/standard mode everywhere |
| Menu row Documents & KYC | P | `dispatch(setPrev('profile')); nav.navigate('Docs')` | Docs |
| Menu row My Shifts | P | `nav.navigate('Shifts')` | Shifts |
| Menu row Floating Cash & Deposits | P | `nav.navigate('FloatCash')` | FloatCash |
| Menu row Help & Support | P | `nav.navigate('Support')` | Support |
| Menu row Settings | P | `nav.navigate('Settings')` | Settings |
| "⏻ Log out" | P | `dispatch(logout()); nav.reset → AuthLanding` | resets auth state |

## Accept / Travel / Bag / Nav / Photo / Complete (standard flow)

| HTML | RN | Handler | Result |
|---|---|---|---|
| Accept: ‹ back | P | `nav.navigate('Orders')` | Orders |
| Accept: "Start Navigation to Store →" | P | `dispatch(setFlow('travel')); nav.navigate('Travel')` | Travel |
| Travel: ‹ back | P | `nav.navigate('Orders')` | Orders |
| Travel: "I've Arrived at Store" | P | `dispatch(setFlow('bag')); nav.navigate('Bag')` | Bag |
| Bag: ‹ back | P | `nav.navigate('Orders')` | Orders |
| Bag: item checkbox ×4 | P | `dispatch(toggleItem(i))` | check; counter updates |
| Bag: "Confirm Pickup" (disabled until all) | P | `dispatch(setFlow('nav')); nav.navigate('Nav')` | Nav |
| Nav: ‹ back | P | `nav.navigate('Orders')` | Orders |
| Nav: "📞 Call" / "💬 Chat" | P | `noop` | — |
| Nav: "I've Reached the Customer" | P | `dispatch(setFlow('photo')); nav.navigate('Photo')` | Photo |
| Nav: "Cancel order" | P | `dispatch(openCancel())` | Cancel sheet |
| Photo: ‹ back | P | `nav.navigate('Nav')` | Nav |
| Photo: photo box | P | `dispatch(togglePhoto())` | toggles captured |
| Photo: "Confirm Delivery" (disabled until photo) | P | `dispatch(setFlow('complete')); nav.navigate('Complete')` | Complete |
| Complete: "Back to Orders" | P | `dispatch(finishFlow()); nav.navigate('Orders')` | clears `activeId`/flow; Orders |

## Onboarding

| HTML | RN | Handler | Result |
|---|---|---|---|
| Welcome: "Get Started" | P | `nav.navigate('ObPersonal')` | step 1 |
| Personal: back | P | `nav.goBack()` | Welcome |
| Personal: name / email TI | TI | `dispatch(setObName/Email)` | Continue enabled when both non-empty |
| Personal: "Continue" | P | `nav.navigate('ObVehicle')` | step 2 |
| Vehicle: back | P | `nav.goBack()` | Personal |
| Vehicle: vehicle card ×4 | P | `dispatch(setObVehicle(id))` | select |
| Vehicle: regNo TI (uppercase) | TI | `dispatch(setObVehicleNo(v.toUpperCase()))` | Continue enabled when vehicle + len≥4 |
| Vehicle: "Continue" | P | `nav.navigate('ObHub')` | step 3 |
| Hub: back | P | `nav.goBack()` | Vehicle |
| Hub: "Enable location" | P | `dispatch(enableLocation())` → `locating`, then 1.1s timer → `ready` | reveals hub list |
| Hub: hub radio ×3 | P | `dispatch(setObHub(id))` | select |
| Hub: "Continue" (disabled until hub) | P | `nav.navigate('ObKyc')` | step 4 |
| KYC: back | P | `nav.goBack()` | Hub |
| KYC: doc "Upload" badge ×5 | P | `dispatch(toggleObDoc(code))` | simulated upload toggle; count updates |
| KYC: "Continue" (disabled until 5/5) | P | `nav.navigate('ObTraining')` | step 5 |
| Training: back | P | `nav.goBack()` | KYC |
| Training: video box | P | `dispatch(playVideo())` | `obVideo=true`, box turns green |
| Training: kit checkbox ×4 | P | `dispatch(toggleObKit(id))` | check |
| Training: "Review & Submit" (disabled until video + 4/4) | P | `nav.navigate('ObReview')` | review |
| Review: back | P | `nav.goBack()` | Training |
| Review: "Submit Application" | P | `dispatch(submitOnboard())` → status `pending`; `nav.navigate('Pending')` | Pending screen |
| Pending: ‹ back | P | `dispatch(logout()); nav.reset` | Auth Landing |
| Pending: "Check application status" | P | `dispatch(approveAccount()); nav.navigate('ObDone')` | Done screen |
| Done: "Go to Dashboard" | P | `dispatch(enterApp())` → `onboarded`, `approved`, copy profile fields; `nav.reset → Main/Home` | Home |
| Rejected: ‹ back | P | `dispatch(logout()); nav.reset` | Auth Landing |
| Rejected: "Resubmit Documents" | P | `dispatch(resubmitDocs())` → status `none`, docs cleared; `nav.navigate('ObKyc')` | KYC |

## Shifts

| HTML | RN | Handler | Result |
|---|---|---|---|
| ‹ back | P | `nav.goBack()` | Profile or Home (by `prev`) |
| slot "Book slot" / "✓ Booked" ×4 | P | `dispatch(toggleBooked(id))` | toggles; header count updates |

## Float Cash

| HTML | RN | Handler | Result |
|---|---|---|---|
| ‹ back | P | `nav.goBack()` | Profile/Home |
| "Deposit cash to Selorg" | P | `dispatch(openDeposit())` | Deposit sheet (form) |

## Deposit Sheet

| HTML | RN | Handler | Result |
|---|---|---|---|
| scrim | P | `dispatch(closeDeposit())` | close |
| amount TI | TI | `dispatch(setDepositAmt(digits.slice(0,5)))` | controlled |
| "Deposit full amount" | P | `dispatch(setDepositAmt(String(floatingCash)))` | fills amount |
| pay-method radio ×3 | P | `dispatch(setPayMethod(id))` | select; button label changes |
| submit button | P | `dispatch(confirmDeposit())` | 0/empty → error; > cash → error; else decrement `floatingCash`, prepend txn, ref generated, stage → `done` |
| "Done" (done view) | P | `dispatch(closeDeposit())` | close |

## Cancel-order Sheet

| HTML | RN | Handler | Result |
|---|---|---|---|
| scrim / "Keep order" | P | `dispatch(closeCancel())` | close |
| reason radio ×6 | P | `dispatch(setCancelReason(id))` | select |
| note textarea (when 'other') | TI | `dispatch(setCancelNote(v))` | required for 'other' |
| "Cancel order" (red, disabled until valid) | P | `dispatch(confirmCancel())` | stage → `done` |
| "Back to Orders" (done view) | P | `dispatch(finishCancel()); nav.navigate('Orders')` | clears flow; Orders |

## Language Sheet

| HTML | RN | Handler | Result |
|---|---|---|---|
| scrim | P | `dispatch(closeLang())` | close |
| language radio ×5 | P | `dispatch(setLanguage(id))` | sets `language`, closes sheet |

## Settings

| HTML | RN | Handler | Result |
|---|---|---|---|
| ‹ back | P | `nav.goBack()` | Profile/Home |
| Push / Location / Sound toggles | SW | `dispatch(toggleSetting(id))` | flips `toggles[id]` |
| "Language" row | P | `dispatch(openLang())` | Language sheet |
| "Privacy Policy" row | P | `nav.navigate('Privacy')` | Privacy |
| "Terms of Service" row | P | `nav.navigate('Terms')` | Terms |
| "App version" row | — | none | — |

## Support

| HTML | RN | Handler | Result |
|---|---|---|---|
| ‹ back | P | `nav.goBack()` | Profile/Home |
| 📞 Call tile | P | `dispatch(setContactVia('call'))` | helpline note banner |
| ✉️ Email tile | P | `dispatch(setContactVia('email'))` | email note banner |
| 💬 Live Chat tile | P | `dispatch(setContactVia('chat'))` | live-chat note banner + scroll to input |
| chat input | TI | `dispatch(setChatInput(v))` | controlled |
| ➤ send | P | `dispatch(sendChat())` | appends my bubble; 0.9s later canned reply bubble |
