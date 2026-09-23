# APP_BACKEND_API_AUTOMATION_TEST_REPORT

Generated: **2026-09-17T07:21:02.632Z**

## 1. Test environment

| Item | Value |
|------|-------|
| Date | 2026-09-17T07:21:02.632Z |
| Frontend | Selorg-RiderApp-v1.3 (React Native 0.75) |
| Backend | selorg-service @ `http://127.0.0.1:3333` |
| API prefix | `/api/v1/picker` |
| Auth strategy | Minted ACTIVE rider JWT (sid-bound) + live OTP when provider accepts |
| Test mobile | `OTP_TEST_MOBILE` / default `9698790921` |
| OS | Windows |
| Data policy | Real backend only — no API mocks (`useMockData=false`) |

## 2. Testing tools used

- **Playwright** (`@playwright/test`) — APIRequestContext + flow journeys
- Auth helper: `mongodb` + `jsonwebtoken` against `picker_users` / `picker_otps`
- Config: `playwright.config.ts`, specs under `e2e/api/*` and `e2e/flows/*`
- Report source: `test-results/playwright-report.json`
- Optional direct verify: `node scripts/verify-go-online-logout.mjs`

## 3. API inventory (Rider App services → `/api/v1/picker`)

> Extracted from `Selorg-RiderApp-v1.3/src/services/api/*`.
> Base: `environment.apiBaseUrl` → `DEV_API_BASE_URL` / Metro host / `http://127.0.0.1:3333/api/v1`.
> HTTP client: `src/services/api/client.ts` (Bearer, 8s timeout, refresh on 401).
> `environment.useMockData = false`.

| Domain | Method | Path | Auth | Frontend usage |
|--------|--------|------|------|----------------|
| Auth | POST | /auth/send-otp | skip | LoginScreen |
| Auth | POST | /auth/resend-otp | skip | OtpScreen |
| Auth | POST | /auth/verify-otp | skip | OtpScreen |
| Auth | POST | /auth/send-otp-email | skip | LoginScreen email |
| Auth | POST | /auth/resend-otp-email | skip | OtpScreen email |
| Auth | POST | /auth/verify-otp-email | skip | OtpScreen email |
| Auth | POST | /auth/refresh | Bearer | client.ts |
| Auth | POST | /auth/logout | Bearer | Profile logout |
| Config | GET | /config | skip | LanguageSheet |
| Config | GET | /config/cancel-reasons | Bearer | CancelOrderSheet |
| Legal | GET | /legal/terms\|privacy | skip | Onboarding / settings |
| FAQ | GET | /faq | skip | SupportScreen |
| Profile | GET/PUT | /profile | Bearer | Profile / Home (includes isOnline) |
| Onboarding | GET/POST | /onboarding/* | Bearer | Pending / Ob* |
| Hubs | GET | /work-locations | skip | ObHubScreen |
| Documents | GET/POST | /documents | Bearer | Docs / KYC |
| Uploads | POST | /uploads | Bearer | Avatar |
| Training | GET/PUT | /training/* | mixed | ObTraining |
| Shifts | GET/POST | /shifts/* | Bearer | Shifts / ShiftSelect |
| Shifts | POST | /shifts/go-online\|go-offline | Active | HomeScreen — **registered** in picker.routes.ts |
| Dashboard | GET | /dashboard/today | Active | HomeScreen |
| Incentives | GET | /incentives/today | Active | HomeScreen |
| Orders | GET/PUT/POST | /shared-orders/* | Active | Orders / delivery |
| Bulk | GET/POST | /bulk/* | Active | Bulk screens |
| Wallet/Cash | GET/POST | /wallet/* /cash/* | mixed | Earnings / Float |
| Notifications | GET/PUT | /notifications* | Bearer | NotificationsScreen |
| Settings | GET/PUT | /settings/preferences | Bearer | SettingsScreen |
| Location | POST | /locations/track | Bearer | locationTracker |
| Push | POST | /push-token | Bearer | pushService |
| Support | GET/POST | /support/* | Bearer | SupportScreen |

**N/A (customer-only):** cart, catalog/search, address CRUD, checkout payment.

**Total frontend-mapped picker endpoints:** ~55.

## 4. Totals

| Metric | Count |
|--------|------:|
| Total tests executed | 96 |
| Passed | 92 |
| Failed | 0 |
| Skipped | 4 |
| Blocked (OTP/env) | 4 |
| API project tests | 85 |
| E2E/flow project tests | 11 |
| Playwright stats.expected | 92 |
| Playwright stats.unexpected | 0 |
| Playwright stats.skipped | 4 |

## 5. Passed tests

- ✅ [api] Auth-gated APIs without token (negative) › GET /profile without token → 401/403
- ✅ [api] Auth-gated APIs without token (negative) › GET /dashboard/today without token → 401/403
- ✅ [api] Auth-gated APIs without token (negative) › GET /wallet without token → 401/403
- ✅ [api] Auth-gated APIs without token (negative) › GET /cash/summary without token → 401/403
- ✅ [api] Auth-gated APIs without token (negative) › GET /shared-orders/assignorders?scope=all without token → 401/403
- ✅ [api] Auth-gated APIs without token (negative) › GET /notifications?page=1&limit=10 without token → 401/403
- ✅ [api] Auth-gated APIs without token (negative) › GET /settings/preferences without token → 401/403
- ✅ [api] Auth-gated APIs without token (negative) › GET /support/tickets?status=all&limit=20 without token → 401/403
- ✅ [api] Auth-gated APIs without token (negative) › POST /auth/logout without token → 401/403
- ✅ [api] Auth-gated APIs without token (negative) › POST /auth/refresh without token → 401/403
- ✅ [api] Auth-gated APIs without token (negative) › POST /shifts/go-online without token → 401/403
- ✅ [api] Auth-gated APIs without token (negative) › POST /locations/track without token → 401/403
- ✅ [api] Auth-gated APIs without token (negative) › invalid Bearer token → 401
- ✅ [api] Auth-gated APIs without token (negative) › malformed Authorization header → 401
- ✅ [api] OTP auth contract (authApi) › send-otp rejects missing phone
- ✅ [api] OTP auth contract (authApi) › send-otp rejects invalid phone
- ✅ [api] OTP auth contract (authApi) › verify-otp rejects missing fields
- ✅ [api] OTP auth contract (authApi) › loginRider helper establishes session (otp or minted fallback)
- ✅ [api] Public / guest-tolerant APIs used by Rider App › GET /config — config
- ✅ [api] Public / guest-tolerant APIs used by Rider App › GET /legal/terms — legal terms
- ✅ [api] Public / guest-tolerant APIs used by Rider App › GET /legal/privacy — legal privacy
- ✅ [api] Public / guest-tolerant APIs used by Rider App › GET /faq?limit=10 — faq
- ✅ [api] Public / guest-tolerant APIs used by Rider App › GET /training/videos — training videos
- ✅ [api] Public / guest-tolerant APIs used by Rider App › GET /work-locations — work locations
- ✅ [api] Public / guest-tolerant APIs used by Rider App › GET /config exposes otpLength=4 matching environment.otpLength
- ✅ [api] Environment & connectivity › backend is reachable on configured API_BASE
- ✅ [api] Environment & connectivity › Rider APP_API_BASE resolves picker config
- ✅ [api] Environment & connectivity › OPTIONS preflight on picker config (CORS soft check)
- ✅ [api] Meta: OTP path status › record whether OTP path was blocked
- ✅ [api] Support / settings / notifications / location / config › GET /faq
- ✅ [api] Support / settings / notifications / location / config › GET /support/tickets
- ✅ [api] Support / settings / notifications / location / config › POST /support/tickets create
- ✅ [api] Support / settings / notifications / location / config › GET /support/chat/messages
- ✅ [api] Support / settings / notifications / location / config › POST /support/chat/messages
- ✅ [api] Support / settings / notifications / location / config › GET /settings/preferences
- ✅ [api] Support / settings / notifications / location / config › PUT /settings/preferences
- ✅ [api] Support / settings / notifications / location / config › GET /notifications
- ✅ [api] Support / settings / notifications / location / config › PUT /notifications/read-all
- ✅ [api] Support / settings / notifications / location / config › GET /config/cancel-reasons?context=standard
- ✅ [api] Support / settings / notifications / location / config › POST /locations/track
- ✅ [api] Support / settings / notifications / location / config › POST /push-token
- ✅ [api] Wallet / cash / earnings (riderApi) › GET /wallet
- ✅ [api] Wallet / cash / earnings (riderApi) › GET /wallet/earnings-breakdown?period=week
- ✅ [api] Wallet / cash / earnings (riderApi) › GET /wallet/history?period=week&limit=7
- ✅ [api] Wallet / cash / earnings (riderApi) › GET /wallet/transactions?page=1&limit=20
- ✅ [api] Wallet / cash / earnings (riderApi) › GET /cash/summary
- ✅ [api] Wallet / cash / earnings (riderApi) › GET /cash/transactions
- ✅ [api] Wallet / cash / earnings (riderApi) › POST /cash/deposits invalid amount → 4xx
- ✅ [api] Bulk delivery (bulkApi) › GET /bulk/batch
- ✅ [api] Bulk delivery (bulkApi) › GET /bulk/batches?status=completed
- ✅ [api] Bulk delivery (bulkApi) › POST /bulk/bag/load missing bag → 4xx
- ✅ [api] Orders / delivery (orderApi) › GET /shared-orders/assignorders?scope=all
- ✅ [api] Orders / delivery (orderApi) › GET /shared-orders/completed?type=all
- ✅ [api] Orders / delivery (orderApi) › GET /shared-orders/:orderId detail
- ✅ [api] Orders / delivery (orderApi) › GET /shared-orders/invalid-id → 4xx
- ✅ [api] Orders / delivery (orderApi) › PUT status accepted on invalid id → 4xx
- ✅ [api] Orders / delivery (orderApi) › POST complete missing otp → 4xx
- ✅ [api] Dashboard / shifts / online (riderApi + HomeScreen) › GET /dashboard/today
- ✅ [api] Dashboard / shifts / online (riderApi + HomeScreen) › GET /incentives/today
- ✅ [api] Dashboard / shifts / online (riderApi + HomeScreen) › GET /shifts/available maps to ShiftSlot[]
- ✅ [api] Dashboard / shifts / online (riderApi + HomeScreen) › GET /shifts/my
- ✅ [api] Dashboard / shifts / online (riderApi + HomeScreen) › POST /shifts/go-online (frontend HomeScreen critical path)
- ✅ [api] Dashboard / shifts / online (riderApi + HomeScreen) › POST /shifts/go-offline (frontend HomeScreen)
- ✅ [api] Dashboard / shifts / online (riderApi + HomeScreen) › POST /shifts/select with invalid shiftId → 4xx
- ✅ [api] Session / profile (profileApi + authApi) › GET /profile returns rider profile shape
- ✅ [api] Session / profile (profileApi + authApi) › PUT /profile with name updates
- ✅ [api] Session / profile (profileApi + authApi) › PUT /profile invalid email → 4xx validation
- ✅ [api] Session / profile (profileApi + authApi) › GET /onboarding/state
- ✅ [api] Session / profile (profileApi + authApi) › GET /documents list
- ✅ [api] Session / profile (profileApi + authApi) › POST /auth/refresh rotates or returns token
- ✅ [api] Frontend client error mapping expectations › 401 responses include success=false for friendlyMessage(401)
- ✅ [api] Frontend client error mapping expectations › validation error uses appCode or message
- ✅ [api] Frontend client error mapping expectations › test mobile constant available
- ✅ [api] Negative / failure contracts › expired/invalid token rejected on profile
- ✅ [api] Negative / failure contracts › customer audience token must not work on picker routes
- ✅ [api] Negative / failure contracts › missing required fields on send-otp-email
- ✅ [api] Negative / failure contracts › invalid email format on send-otp-email
- ✅ [api] Negative / failure contracts › empty body on location track → 4xx
- ✅ [api] Negative / failure contracts › unexpected response structure still yields JSON envelope on 404
- ✅ [api] Negative / failure contracts › wrong HTTP method on config (POST) → 4xx/405
- ✅ [api] Negative / failure contracts › bulk stop deliver with invalid stopId → 4xx
- ✅ [api] Negative / failure contracts › notifications mark-read invalid id → 4xx
- ✅ [flows] Response mapping contracts (frontend mappers) › assignorders envelope matches orderApi.listAvailable
- ✅ [flows] Response mapping contracts (frontend mappers) › wallet history envelope matches riderApi.getDailyBreakdown
- ✅ [flows] Response mapping contracts (frontend mappers) › error envelope has success=false for UI error state
- ✅ [flows] Flow: Logout › logout invalidates session for subsequent profile
- ✅ [flows] Flow: Support › FAQ → tickets → chat message
- ✅ [flows] Flow: Wallet / cash (earnings + float) › earnings breakdown + cash summary
- ✅ [flows] Flow: Go online → orders → history › go-online then list assignorders then completed history
- ✅ [flows] Flow: Profile / account › load profile + hubs + update name
- ✅ [flows] Flow: Profile / account › preferences get/put (SettingsScreen)
- ✅ [flows] Flow: Login / OTP / session › session persistence via refresh

## 6. Failed tests

- _(none)_

## 7. Blocked tests

- ⏸️ [api] verify-otp rejects wrong otp
  - Reason: `OTP send blocked/unavailable: 502 {"success":false,"message":"OTP delivery is not enabled for this number yet. Please contact support.","data":null,"error":{"code":502,"appCode":"SMS_SENDER_NOT_PROVISIONED","title":"An error occurred while communicating with an upstream service","message":"OTP delivery is not enabled for this number yet. Please contact support.","details":null},"pagination":null,"timestamp":"2026-09-17T07:20:38.965Z"}`
- ⏸️ [api] send-otp + verify with stored OTP returns token (authApi shape)
  - Reason: `OTP provider/env blocked send: 502 {"success":false,"message":"OTP delivery is not enabled for this number yet. Please contact support.","data":null,"error":{"code":502,"appCode":"SMS_SENDER_NOT_PROVISIONED","title":"An error occurred while communicating with an upstream service","message":"OTP delivery is not enabled for this number yet. Please contact support.","details":null},"pagination":null,"timestamp":"2026-09-17T07:20:39.469Z"}`
- ⏸️ [api] verify-otp with intent=login for unknown phone → ACCOUNT_NOT_FOUND or similar
  - Reason: `OTP send unavailable for unknown-phone login intent test`
- ⏸️ [flows] send OTP → verify (or skip if provider blocked) → token persisted shape
  - Reason: `OTP send blocked: 502 {"success":false,"message":"OTP delivery is not enabled for this number yet. Please contact support.","data":null,"error":{"code":502,"appCode":"SMS_SENDER_NOT_PROVISIONED","title":"An error occurred while communicating with an upstream service","message":"OTP delivery is not enabled for this number yet. Please contact support.","details":null},"pagination":null,"timestamp":"2026-09-17T07:20:55.618Z"}`

## 8. E2E flows tested

| Flow | Status |
|------|--------|
| Login / OTP | Live when SMS provider OK; otherwise **blocked** (§7) — other flows use minted JWT |
| Session persistence (refresh) | PASS |
| Logout invalidation | PASS |
| Profile / preferences | PASS |
| Go online → orders → detail → history → go offline | PASS |
| Wallet / cash / support / notifications | PASS |
| Cart / catalog / checkout payment | **N/A** (not in Rider App) |

## 9. API integration issues

- No hard frontend/backend contract failures in this run.

## 10. Authentication / session status

- Bearer auth + refresh: PASS
- Logout sid invalidation: PASS (old JWT → 401 AUTH_SESSION_EXPIRED)

## 11. Go-online / go-offline route verification

| Check | Result |
|-------|--------|
| `picker.routes.ts` `POST /shifts/go-online` | **Registered** |
| `picker.routes.ts` `POST /shifts/go-offline` | **Registered** |
| `picker.shift.service` `goOnline` / `goOffline` | **Present** |
| Controller wired | **Yes** |
| Rider `riderApi.goOnline/goOffline` | **Matches** |
| Automation go-online | **PASS** |
| Automation go-offline | **PASS** |

### Why an older report said "not registered" while tests PASSed

The previous `generate-api-test-report.mjs` **hard-coded** §11 text from the first audit ("backend route may be missing") even after routes were implemented and automation PASSed. That was a **report-generator bug**, not a runtime missing-route bug. This generator now derives go-online status from Playwright results + known registered routes.

## 12. Error-handling

- Negative cases return 4xx envelopes with `success:false` as expected by `client.ts` friendlyMessage mapping.

## 13. Critical issues

- None in this run.

## 14. OTP status (remaining blocker)

Live `POST /picker/auth/send-otp` returns **502** `SMS_SENDER_NOT_PROVISIONED`.

Mapped in `selorg-service/src/services/sms.service.ts`: SMS sender/account cannot deliver to this destination (Twilio trial/unverified number/region, or Indian DLT sender not ready). Provider chain: SpearUC (`SMS_VENDOR_URL`) → MSG91 → Fast2SMS → Twilio.

**To unblock (ops — do not fake OTP in code):**
1. Fix `SMS_VENDOR_URL` / DLT template for India, or
2. Upgrade Twilio / verify destination / enable India SMS, or
3. Configure working MSG91/Fast2SMS India route.
Env already expected in `selorg-service/.env` (secrets not committed): `SMS_*`, `TWILIO_*`, `PICKER_OTP_*`, `RESEND_*`.

Blocked OTP tests remain **blocked** — not marked PASS.

## 15. Reproduction

1. `cd selorg-service && npm run dev`
2. `cd Selorg-RiderApp-v1.3 && npm run test:automation`
3. Optional: `node scripts/verify-go-online-logout.mjs`

## 16. Recommended next steps

| Priority | Action |
|----------|--------|
| P1 | Provision SMS for India / verify test mobile so send-otp returns 200 |
| P2 | Optional Detox/Maestro for native UI states |
