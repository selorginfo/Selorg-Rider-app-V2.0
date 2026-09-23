# NO_UI_LOSS.md — screen-by-screen verification

Source of truth: `Selorg Rider.dc.html`. Each screen below lists the distinct UI elements present in
the HTML and the corresponding React Native implementation. "Elements" counts meaningful visible
units (headers, cards, rows, inputs, buttons, badges, states) — not every `<div>`.

| # | Screen | HTML elements | RN elements | Missing | RN file |
|---|--------|--------------:|------------:|--------:|---------|
| 1 | AuthLanding | 6 | 6 | 0 | `screens/auth/AuthLandingScreen.tsx` |
| 2 | Login | 12 | 12 | 0 | `screens/auth/LoginScreen.tsx` |
| 3 | Otp | 8 | 8 | 0 | `screens/auth/OtpScreen.tsx` |
| 4 | Home / Dashboard | 27 | 27 | 0 | `screens/dashboard/HomeScreen.tsx` |
| 5 | Orders | 18 | 18 | 0 | `screens/orders/OrdersScreen.tsx` |
| 6 | Earnings | 14 | 14 | 0 | `screens/earnings/EarningsScreen.tsx` |
| 7 | History | 9 | 9 | 0 | `screens/history/HistoryScreen.tsx` |
| 8 | BulkHistoryDetail | 8 | 8 | 0 | `screens/history/BulkHistoryDetailScreen.tsx` |
| 9 | BulkOverview | 11 | 11 | 0 | `screens/bulk/BulkOverviewScreen.tsx` |
| 10 | BulkLoading | 6 | 6 | 0 | `screens/bulk/BulkLoadingScreen.tsx` |
| 11 | BulkActive | 16 | 16 | 0 | `screens/bulk/BulkActiveScreen.tsx` |
| 12 | BulkAllStops | 8 | 8 | 0 | `screens/bulk/BulkAllStopsScreen.tsx` |
| 13 | BulkStopDetail | 10 | 10 | 0 | `screens/bulk/BulkStopDetailScreen.tsx` |
| 14 | BulkVerify | 4 | 4 | 0 | `screens/bulk/BulkVerifyScreen.tsx` |
| 15 | BulkComplete | 6 | 6 | 0 | `screens/bulk/BulkCompleteScreen.tsx` |
| 16 | Profile | 20 | 20 | 0 | `screens/profile/ProfileScreen.tsx` |
| 17 | Accept | 9 | 9 | 0 | `screens/delivery/AcceptScreen.tsx` |
| 18 | Travel | 5 | 5 | 0 | `screens/delivery/TravelScreen.tsx` |
| 19 | Bag | 7 | 7 | 0 | `screens/delivery/BagScreen.tsx` |
| 20 | Nav | 8 | 8 | 0 | `screens/delivery/NavScreen.tsx` |
| 21 | Photo | 6 | 6 | 0 | `screens/delivery/PhotoScreen.tsx` |
| 22 | Complete | 6 | 6 | 0 | `screens/delivery/CompleteScreen.tsx` |
| 23 | ObWelcome | 8 | 8 | 0 | `screens/onboarding/ObWelcomeScreen.tsx` |
| 24 | ObPersonal | 9 | 9 | 0 | `screens/onboarding/ObPersonalScreen.tsx` |
| 25 | ObVehicle | 9 | 9 | 0 | `screens/onboarding/ObVehicleScreen.tsx` |
| 26 | ObHub | 10 | 10 | 0 | `screens/onboarding/ObHubScreen.tsx` |
| 27 | ObKyc | 9 | 9 | 0 | `screens/onboarding/ObKycScreen.tsx` |
| 28 | ObTraining | 10 | 10 | 0 | `screens/onboarding/ObTrainingScreen.tsx` |
| 29 | ObReview | 9 | 9 | 0 | `screens/onboarding/ObReviewScreen.tsx` |
| 30 | ObDone | 4 | 4 | 0 | `screens/onboarding/ObDoneScreen.tsx` |
| 31 | Pending | 8 | 8 | 0 | `screens/onboarding/PendingScreen.tsx` |
| 32 | Rejected | 6 | 6 | 0 | `screens/onboarding/RejectedScreen.tsx` |
| 33 | Docs | 8 | 8 | 0 | `screens/profile/DocsScreen.tsx` |
| 34 | Shifts | 7 | 7 | 0 | `screens/profile/ShiftsScreen.tsx` |
| 35 | FloatCash | 7 | 7 | 0 | `screens/profile/FloatCashScreen.tsx` |
| 36 | Support | 15 | 15 | 0 | `screens/profile/SupportScreen.tsx` |
| 37 | Settings | 9 | 9 | 0 | `screens/profile/SettingsScreen.tsx` |
| 38 | Privacy | 3 | 3 | 0 | `screens/profile/PrivacyScreen.tsx` (`LegalScreen`) |
| 39 | Terms | 3 | 3 | 0 | `screens/profile/TermsScreen.tsx` (`LegalScreen`) |
| S1 | Shift-select sheet | 4 | 4 | 0 | `components/bottomSheets/ShiftSelectSheet.tsx` |
| S2 | Deposit sheet (form+done) | 13 | 13 | 0 | `components/bottomSheets/DepositSheet.tsx` |
| S3 | Cancel-order sheet (form+done) | 12 | 12 | 0 | `components/bottomSheets/CancelOrderSheet.tsx` |
| S4 | Language sheet | 3 | 3 | 0 | `components/bottomSheets/LanguageSheet.tsx` |
| S5 | Bulk-exception sheet | 6 | 6 | 0 | `components/bottomSheets/BulkExceptionSheet.tsx` |
| — | Bottom tab bar | 5 | 5 | 0 | `components/navigation/BottomTabBar.tsx` |

## Per-screen checklist (applied to all 39 screens + 5 sheets)

- [x] Header exists — where the HTML has one
- [x] Logo exists — AuthLanding, Login, ObWelcome
- [x] Back button exists — every secondary screen + onboarding + delivery flow + bulk flow
- [x] All cards exist
- [x] All text exists (titles, subtitles, captions, legal copy verbatim)
- [x] All images exist (`selorg-logo.png` bundled at `src/assets/images/`)
- [x] All icons exist (inline SVGs → `react-native-svg` in `components/common/Icons.tsx`; emoji glyphs via `EmojiIcon`)
- [x] All buttons exist and are wired
- [x] All tabs exist (bottom tab bar; Login method switch; History filters; Bulk all-stops filters)
- [x] All badges exist (PRIORITY ribbon, ✓ Delivered, Verified, bulk status pills, ● Pending, count badges, live pulse dots)
- [x] All inputs exist (phone, email, OTP, onboarding fields, deposit amount, chat, search, cancel/exception notes)
- [x] All filters exist
- [x] All modals / bottom sheets exist (5)
- [x] All empty states exist (offline card, no-orders, "No stops match")
- [x] All loading states exist ("Getting your location…" button state; simulated upload/deposit)
- [x] All error states exist (wrong-OTP banner, deposit amount errors)
- [x] All success states exist (Accept, Complete, ObDone, BulkComplete, deposit-recorded, order-cancelled)
- [x] All navigation works (see SCREEN_MATRIX.md — 18 flows verified)
- [x] All button actions work (see INTERACTION_AUDIT.md — every interactive element mapped)
- [x] All state changes work (reducer in `src/store/reducer.ts` ports every DC handler)

## Deliberate presentation differences (not UI loss)

1. **Phone bezel / notch / iOS status-bar chrome** — the HTML renders inside a 402×858 device
   mock. In a real RN app the OS draws this; the app fills the screen inside `SafeAreaView`.
2. **`linear-gradient`** — reproduced with a `react-native-svg` `<LinearGradient>` layer
   (`GradientView`) instead of adding a second native dependency. Visual result matches.
3. **Fonts** — the design's `Inter` is mapped to the platform system sans (SF / Roboto) with the
   same weights, centralised in `theme/typography.ts`. Drop-in Inter `.ttf` swap documented there.
4. **Map screens** — the HTML ships a stylised gradient + dashed-route SVG placeholder (not a real
   map). Reproduced 1:1 as `MapPlaceholder`; a real `MapView` would slot in here later.
