# Rider App — Issues Solved (Last 6 Hours)

**Date:** 24 Sep 2026  
**Window:** ~09:18 – 15:18 IST  
**App:** `Selorg-Rider-app-V2.0` (`com.selorgriderapp`)  
**Related backend:** `Selorg-backend-V2.0` (`picker.auth.*` workforce auth, `orderRealtime`)

---

## Summary

In this window, Rider work focused on **auth isolation** so Rider login/OTP/session cannot be confused with Picker (branding, OTP reuse, and JWT audience).

No separate Rider UI/runtime bugs (e.g. black screen) were worked in this window; the Rider change set is auth-only.

---

## Issue 1 — Rider auth not always declaring role (cross-app OTP / branding risk)

| | |
|--|--|
| **When** | ~14:55 – 15:05 IST |
| **Symptom / risk** | Workforce auth shared one path for Picker and Rider. OTP emails and templates could use the wrong brand; OTP storage keys and JWT audience were not strictly Rider-scoped. Rider client did not send `workforceRole` on every auth call (only some paths), so the backend could not reliably treat the request as Rider-only. |
| **Root cause** | Shared auth service leaned on Rider defaults for branding; OTP keys were not prefixed by role; tokens used a single legacy audience; Rider `authApi` omitted `workforceRole` on check-account, send/resend OTP, and several verify/register paths. |
| **Status** | **Solved** |

### What was fixed

1. **Rider app always sends** `workforceRole: 'rider'` on all workforce auth calls (check account, register, send/resend OTP phone & email, verify OTP, etc.).
2. **Backend role-aware branding** — Rider OTPs use `Selorg Rider` + `RIDER_EMAIL_FROM` and Rider SMS/WhatsApp templates (`RIDER_OTP_*`).
3. **Role-scoped OTP keys** — e.g. `rider|email|…` / `rider|phone|…` so a Picker code cannot verify a Rider login (and vice versa).
4. **Client required** — Missing role/client identity → `CLIENT_REQUIRED`; wrong role → `ROLE_MISMATCH`; **no OTP sent** on mismatch.
5. **Separate JWT audience** — New Rider tokens use `selorg-rider` (legacy audience still accepted during migration where appropriate).
6. **Middleware + sockets** — HTTP auth rejects tokens whose audience / token role do not match the Rider account; realtime accepts `selorg-rider` among workforce socket audiences.

### Files touched

**Rider app**

| File | Change |
|------|--------|
| `src/services/api/authApi.ts` | Introduced `RIDER_ROLE`; every auth request body includes `workforceRole: 'rider'` |

**Backend (workforce auth used by Rider)**

| File | Change |
|------|--------|
| `src/modules/picker/picker.auth.service.ts` | Role-aware branding, OTP keys, JWT `selorg-rider`, client-required / role mismatch gates |
| `src/modules/picker/picker.auth.middleware.ts` | Audience + token role must match account; `x-selorg-client` vs account role enforced |
| `src/realtime/orderRealtime.ts` | Socket JWT audience allow-list includes `selorg-rider` |

### Verification

- Restart backend so auth changes load.
- From the Rider app, request email/SMS OTP — message should say **Selorg Rider** (not Selorg Picker).
- A Picker OTP must not verify a Rider login (role-scoped keys + `ROLE_MISMATCH` when roles disagree).

### Note on commit state

As of documentation time, Rider `authApi.ts` changes were present in the working tree; backend auth isolation was committed as `b952483` (`Update backend changes for picker app`). Commit the Rider app change if it is still uncommitted.

---

## Out of scope this window

- No Rider black-screen / Metro issues were investigated in this 6-hour window (that work was Picker-only).
- No new Rider delivery-flow or Home screen product bugs were fixed in this window (file mtimes on `HomeScreen.tsx` / `riderApi.ts` reflect earlier commits from 23 Sep, not new edits today).
