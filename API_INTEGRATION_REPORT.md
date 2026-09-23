# Rider App ↔ Backend API Integration Report

**Date:** 2026-09-07  
**Frontend:** `Selorg-RiderApp-v1.3`  
**Backend:** `selorg-service` (`/api/v1/picker/*`)  
**Contract:** `Selorg-RiderApp-v1.3/API_CONTRACT.md`  
**Backend changes made:** **None**

---

## 1. APIs successfully integrated (frontend wired)

### AUTH
| Contract | Method | Endpoint | Frontend |
|----------|--------|----------|----------|
| Send OTP | POST | `/picker/auth/send-otp` | LoginScreen → `authApi.sendOtp` |
| Send OTP email | POST | `/picker/auth/send-otp-email` | LoginScreen |
| Resend OTP | POST | `/picker/auth/resend-otp` (+ email) | OtpScreen → `authApi.resendOtp` |
| Verify OTP | POST | `/picker/auth/verify-otp` (+ email) | OtpScreen → `authApi.verifyOtp` → token + `nextScreen` |
| Logout | POST | `/picker/auth/logout` | Profile → `actions.logout` |
| Refresh | POST | `/picker/auth/refresh` | `client.ts` 401 interceptor |

### PROFILE / ONBOARDING
| Endpoint | Frontend |
|----------|----------|
| GET/PUT `/picker/user/profile` | Home, Profile |
| GET `/picker/onboarding/state` | PendingScreen |
| POST `/picker/onboarding/submit` | ObReviewScreen |
| POST `/picker/onboarding/kit-ack` | ObTrainingScreen |
| GET `/picker/work-locations` | ObHubScreen |
| GET `/picker/documents` | DocsScreen |
| GET `/picker/training/videos` + PUT watch-progress | ObTrainingScreen |

### DASHBOARD / SHIFTS
| Endpoint | Frontend |
|----------|----------|
| GET `/picker/dashboard/today` | HomeScreen |
| GET `/picker/incentives/today` | HomeScreen |
| GET `/picker/shifts/available` | ShiftSelectSheet, ShiftsScreen |
| POST `/picker/shifts/select` / `deselect` | ShiftsScreen toggle |
| POST `/picker/shifts/start` / `end` | ShiftSelectSheet / goOffline |

### ORDERS / DELIVERY
| Endpoint | Frontend |
|----------|----------|
| GET `/picker/shared-orders/assignorders` | OrdersScreen |
| GET `/picker/shared-orders/:orderId` | BagScreen items |
| PUT `/picker/shared-orders/:orderId/status` | accept / pickup / cancel |
| POST `/picker/shared-orders/:orderId/complete` | PhotoScreen |
| POST `/picker/shared-orders/:orderId/proof-photo` | `orderApi.uploadProofPhoto` (available; Photo uses transitional `photo: boolean`) |

### BULK
| Endpoint | Frontend |
|----------|----------|
| GET `/picker/bulk/batch` | BulkOverview / Orders |
| POST `/picker/bulk/bag/load` | BulkLoading |
| POST `/picker/bulk/start` | startBulkDelivery |
| POST `/picker/bulk/stops/:stopId/arrive` | BulkActive |
| POST `/picker/bulk/stops/:stopId/deliver` | BulkVerify |
| POST `/picker/bulk/stops/:stopId/fail` | BulkExceptionSheet |
| GET `/picker/bulk/batches` (+ detail) | History / BulkHistoryDetail |

### EARNINGS / CASH / HISTORY
| Endpoint | Frontend |
|----------|----------|
| GET `/picker/wallet/earnings-breakdown` | EarningsScreen |
| GET `/picker/wallet/history` | EarningsScreen |
| GET `/picker/shared-orders/completed` | HistoryScreen |
| GET `/picker/cash/summary` | FloatCashScreen |
| GET `/picker/cash/transactions` | FloatCashScreen |
| POST `/picker/cash/deposits` | DepositSheet |

### SUPPORT / SETTINGS / LEGAL / CONFIG
| Endpoint | Frontend |
|----------|----------|
| GET `/picker/faq` | SupportScreen |
| GET/POST `/picker/support/chat/messages` | SupportScreen |
| GET/PUT `/picker/settings/preferences` | SettingsScreen |
| GET `/picker/config` | LanguageSheet languages |
| GET `/picker/config/cancel-reasons` | CancelOrderSheet |
| GET `/picker/legal/terms` / `privacy` | Terms / Privacy |

### LOCATION
| Endpoint | Frontend |
|----------|----------|
| POST `/picker/locations/track` | `locationApi.track` module ready — **not auto-pinged** (no GPS library in app) |

---

## 2. Screens connected to APIs

AuthLanding, Login, Otp, Home, Orders, Accept, Travel, Bag, Nav, Photo, Complete,  
BulkOverview/Loading/Active/AllStops/StopDetail/Verify/Complete, BulkHistoryDetail,  
Earnings, History, FloatCash, Profile, Docs, Shifts, Support, Settings, Privacy, Terms,  
ObHub, ObTraining, ObReview, Pending, ShiftSelectSheet, CancelOrderSheet, DepositSheet, LanguageSheet.

---

## 3. APIs already present and reused

Existing clients expanded (not replaced): `authApi`, `orderApi`, `bulkApi`, `riderApi`, `client.ts`.  
New modules: `profileApi`, `supportApi`, `configApi`, `locationApi`.  
Response envelope + Bearer auth preserved.

---

## 4. APIs missing from backend / not wired in UI

| Item | Status |
|------|--------|
| Dedicated notifications inbox UI | Backend has `/picker/notifications*` — **no screen** in app (Settings push toggle only) |
| Push token registration | Backend `POST /picker/push-token` — **no FCM SDK** in app |
| Multipart POD in PhotoScreen | Client has `uploadProofPhoto`; UI still uses transitional `{ photo: boolean }` on complete |
| Live GPS tracking loop | `locationApi` ready; **no geolocation dependency** |

---

## 5. Contract / backend / client mismatches fixed on frontend

| Issue | Fix |
|-------|-----|
| Base URL port 3000 vs backend 3333 | `environment.ts` → platform host + **3333** |
| Deposit posted to `/wallet/deposit` | Now `POST /picker/cash/deposits` |
| History used `/wallet/transactions` | Now `GET /picker/shared-orders/completed` |
| Bulk stops used numeric `:idx` | Now `:stopId` |
| Token in-memory only | AsyncStorage persistence + hydrate |
| No refresh / logout | Implemented |

**No backend route changes were required** for this integration.

---

## 6. Backend changes made

**None.** Frontend-only integration against existing `selorg-service` picker routes.

---

## 7. Mock data removed / retained

**Removed as primary data source:** orders, bag items, shifts list, home performance, earnings, history, bulk batch, float cash defaults, demo OTP (`1234` / `9000000000`), canned support auto-reply.

**Retained as fallbacks when API empty/fails:** FAQ copy, legal text, cancel/exception reason labels, PAY_METHODS, SETTINGS_ROWS labels, KIT/VEHICLES/OB_STEPS static onboarding labels, HUBS if work-locations empty.

---

## 8. Environment configuration

```ts
apiBaseUrl: http://{10.0.2.2|localhost}:3333/api/v1
```

- Android emulator: `10.0.2.2`
- iOS simulator: `localhost`
- Physical device: set LAN IP in `src/config/environment.ts` (commented)
- Auth: `Authorization: Bearer <picker JWT>`
- Dependency added: `@react-native-async-storage/async-storage`

---

## 9. Remaining issues

1. **GPS / location pings** not running (no location library).
2. **Push notifications** not registered (no FCM).
3. **Proof photo** is simulated UI toggle; complete still sends `photo: true` (contract allows transitional boolean). Real camera + multipart upload not hooked.
4. **Maps** still `MapPlaceholder`.
5. Runtime data quality depends on backend seed data (empty lists show empty states, not fake orders).
6. ESLint: remaining **warnings** only (`no-void`, curly); **0 errors**.
7. Manual E2E against a live `selorg-service` instance was not executed in this session (backend must be running on :3333).

---

## 10. Validation commands

```bash
cd Selorg-RiderApp-v1.3
npm run typecheck   # pass
npm run lint        # 0 errors (warnings only)
npm test            # pass (AsyncStorage inline mock in jest.setup.js)
```

### Manual checklist (requires running backend)

```
AUTH
[ ] Login / OTP / Resend / Token persistence / Logout / 401 refresh

HOME
[ ] Dashboard / profile name / online-offline (start/end shift)

ORDERS
[ ] List / Accept / Cancel

DELIVERY
[ ] Pickup / Complete (OTP) / transitional photo flag

BULK
[ ] Load / Start / Arrive / Deliver / Fail

EARNINGS / HISTORY / FLOAT CASH
[ ] Summary / completed history / cash deposit

PROFILE / DOCS / ONBOARDING / SUPPORT / SETTINGS / LEGAL
[ ] Load + update paths as above
```

---

## Architecture note

```
Screens → services/api/* → client (Bearer, refresh, timeout, envelope)
                         → AsyncStorage token
                         → selorg-service :3333 /api/v1/picker/*
```
