# SCREEN_MATRIX.md — Selorg Rider App

`Selorg Rider.dc.html` uses one flat `state.screen` string. In the RN port these map to React
Navigation routes across three navigators:

- **RootStack** (`src/navigation/RootNavigator.tsx`) — auth + onboarding + all full-screen flows
- **MainTabs** (`src/navigation/BottomTabNavigator.tsx`) — the 5 `showTabs` screens
- Bottom sheets are **not routes** — they are `<Modal>` components mounted at the app root, driven
  by `RiderContext` state (`shiftSheetOpen`, `depositStage`, `cancelStage`, `langOpen`,
  `bulkExceptionOpen`).

| # | HTML `screen` | RN Screen file | Route | Navigator | UI Complete | Interactions Complete |
|---|---|---|---|---|---|---|
| 1 | `authLanding` | `screens/auth/AuthLandingScreen.tsx` | `AuthLanding` | RootStack | YES | YES |
| 2 | `login` | `screens/auth/LoginScreen.tsx` | `Login` | RootStack | YES | YES |
| 3 | `otp` | `screens/auth/OtpScreen.tsx` | `Otp` | RootStack | YES | YES |
| 4 | `home` | `screens/dashboard/HomeScreen.tsx` | `Home` | MainTabs | YES | YES |
| 5 | `orders` | `screens/orders/OrdersScreen.tsx` | `Orders` | MainTabs | YES | YES |
| 6 | `earnings` | `screens/earnings/EarningsScreen.tsx` | `Earnings` | MainTabs | YES | YES |
| 7 | `history` | `screens/history/HistoryScreen.tsx` | `History` | MainTabs | YES | YES |
| 8 | `bulkHistoryDetail` | `screens/history/BulkHistoryDetailScreen.tsx` | `BulkHistoryDetail` | RootStack | YES | YES |
| 9 | `bulkOverview` | `screens/bulk/BulkOverviewScreen.tsx` | `BulkOverview` | RootStack | YES | YES |
| 10 | `bulkLoading` | `screens/bulk/BulkLoadingScreen.tsx` | `BulkLoading` | RootStack | YES | YES |
| 11 | `bulkActive` | `screens/bulk/BulkActiveScreen.tsx` | `BulkActive` | RootStack | YES | YES |
| 12 | `bulkAllStops` | `screens/bulk/BulkAllStopsScreen.tsx` | `BulkAllStops` | RootStack | YES | YES |
| 13 | `bulkStopDetail` | `screens/bulk/BulkStopDetailScreen.tsx` | `BulkStopDetail` | RootStack | YES | YES |
| 14 | `bulkVerify` | `screens/bulk/BulkVerifyScreen.tsx` | `BulkVerify` | RootStack | YES | YES |
| 15 | `bulkComplete` | `screens/bulk/BulkCompleteScreen.tsx` | `BulkComplete` | RootStack | YES | YES |
| 16 | `profile` | `screens/profile/ProfileScreen.tsx` | `Profile` | MainTabs | YES | YES |
| 17 | `accept` | `screens/delivery/AcceptScreen.tsx` | `Accept` | RootStack | YES | YES |
| 18 | `travel` | `screens/delivery/TravelScreen.tsx` | `Travel` | RootStack | YES | YES |
| 19 | `bag` | `screens/delivery/BagScreen.tsx` | `Bag` | RootStack | YES | YES |
| 20 | `nav` | `screens/delivery/NavScreen.tsx` | `Nav` | RootStack | YES | YES |
| 21 | `orderChat` | `screens/delivery/OrderChatScreen.tsx` | `OrderChat` | RootStack | YES | YES |
| 22 | `photo` | `screens/delivery/PhotoScreen.tsx` | `Photo` | RootStack | YES | YES |
| 23 | `complete` | `screens/delivery/CompleteScreen.tsx` | `Complete` | RootStack | YES | YES |
| 24 | `obWelcome` | `screens/onboarding/ObWelcomeScreen.tsx` | `ObWelcome` | RootStack | YES | YES |
| 25 | `obPersonal` | `screens/onboarding/ObPersonalScreen.tsx` | `ObPersonal` | RootStack | YES | YES |
| 26 | `obVehicle` | `screens/onboarding/ObVehicleScreen.tsx` | `ObVehicle` | RootStack | YES | YES |
| 27 | `obHub` | `screens/onboarding/ObHubScreen.tsx` | `ObHub` | RootStack | YES | YES |
| 28 | `obKyc` | `screens/onboarding/ObKycScreen.tsx` | `ObKyc` | RootStack | YES | YES |
| 29 | `obTraining` | `screens/onboarding/ObTrainingScreen.tsx` | `ObTraining` | RootStack | YES | YES |
| 30 | `obReview` | `screens/onboarding/ObReviewScreen.tsx` | `ObReview` | RootStack | YES | YES |
| 31 | `obDone` | `screens/onboarding/ObDoneScreen.tsx` | `ObDone` | RootStack | YES | YES |
| 32 | `pending` | `screens/onboarding/PendingScreen.tsx` | `Pending` | RootStack | YES | YES |
| 33 | `rejected` | `screens/onboarding/RejectedScreen.tsx` | `Rejected` | RootStack | YES | YES |
| 34 | `docs` | `screens/profile/DocsScreen.tsx` | `Docs` | RootStack | YES | YES |
| 35 | `shifts` | `screens/profile/ShiftsScreen.tsx` | `Shifts` | RootStack | YES | YES |
| 36 | `floatcash` | `screens/profile/FloatCashScreen.tsx` | `FloatCash` | RootStack | YES | YES |
| 37 | `wallet` | `screens/profile/WalletScreen.tsx` | `Wallet` | RootStack | YES | YES |
| 38 | `notifications` | `screens/profile/NotificationsScreen.tsx` | `Notifications` | RootStack | YES | YES |
| 39 | `support` | `screens/profile/SupportScreen.tsx` | `Support` | RootStack | YES | YES |
| 40 | `settings` | `screens/profile/SettingsScreen.tsx` | `Settings` | RootStack | YES | YES |
| 41 | `privacy` | `screens/profile/PrivacyScreen.tsx` | `Privacy` | RootStack | YES | YES |
| 42 | `terms` | `screens/profile/TermsScreen.tsx` | `Terms` | RootStack | YES | YES |

**Total RN screens: 42 — Missing: 0**

## Bottom sheets (Modal components, not routes)

| # | HTML overlay | RN component | Driven by |
|---|---|---|---|
| S1 | Shift-select sheet | `components/bottomSheets/ShiftSelectSheet.tsx` | `shiftSheetOpen` |
| S2 | Deposit sheet (form + done) | `components/bottomSheets/DepositSheet.tsx` | `depositStage` |
| S3 | Cancel-order sheet (form + done) | `components/bottomSheets/CancelOrderSheet.tsx` | `cancelStage` |
| S4 | Language sheet | `components/bottomSheets/LanguageSheet.tsx` | `langOpen` |
| S5 | Bulk delivery-issue sheet | `components/bottomSheets/BulkExceptionSheet.tsx` | `bulkExceptionOpen` |

All five are rendered once in `src/navigation/RootNavigator.tsx` above the navigator so they overlay
every screen, exactly like the HTML phone-level `sc-if` overlays.

## Navigation flows verified

1. AuthLanding → Login → Otp → **(login)** → Home
2. AuthLanding → Login(signup) → Otp → ObWelcome → ObPersonal → ObVehicle → ObHub → ObKyc → ObTraining → ObReview → Pending → (API approve) → ObDone → Home | (API reject) → Rejected
3. Pending/Rejected → (‹ back / confirm) → logout → AuthLanding
4. Rejected → ObKyc (resubmit)
5. Home ⇆ Orders ⇆ Earnings ⇆ History ⇆ Profile (tab bar)
6. Home → Shifts / Notifications / Orders / BulkOverview|BulkLoading|BulkActive
7. Orders → Accept → Travel → Bag → Nav → Photo → Complete → reset Orders
8. Nav → Cancel sheet → reset Orders
9. Orders(resume active) → flowScreen
10. Profile → Settings → { Language sheet, Privacy, Terms }
11. Profile → Docs / Shifts / FloatCash / Wallet / Notifications / Support / Settings
12. FloatCash → Deposit sheet → done
13. History → BulkHistoryDetail
14. BulkOverview → BulkAllStops → BulkStopDetail (return → BulkAllStops)
15. BulkOverview → BulkLoading → BulkActive → (per stop) BulkVerify → … → BulkComplete → reset Home
16. BulkActive → BulkStopDetail (return → BulkActive) / BulkActive → BulkAllStops
17. BulkActive / BulkStopDetail → Bulk-exception sheet → mark failed
18. Profile → "Switch (demo)" toggles standard/bulk delivery mode app-wide
19. Cold restore: approved→Main | pending→Pending | rejected→Rejected | else→ObWelcome
20. Nav → OrderChat → goBack
