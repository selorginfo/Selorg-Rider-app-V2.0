# Rider OTP fix — aligned with Customer delivery

**Date:** 2026-09-07

## What was wrong

1. Picker/Rider auth skipped providers when `OTP_DEV_MODE=true`, or returned **fake success** on Twilio/Resend failure in non-prod.
2. Hosted `dev-api.selorg.com` picker auth still returns `data.otp` in JSON (providers skipped) — Rider stripped it, so users saw nothing.
3. Rider `.env` was not loaded (no `react-native-dotenv`), so the app always preferred hosted.

## What we changed

- Shared delivery: `selorg-service/src/services/otpDelivery.service.ts` (same `sms.service` / `email.service` as Customer).
- Picker send OTP: call providers always; store OTP **only** on provider accept; HTTP error on failure.
- Rider: dotenv wiring, API base → local `selorg-service`, surface provider errors.

## Providers (same as Customer)

| Channel | Provider |
|---------|----------|
| SMS | MSG91 → Fast2SMS → Twilio (`sms.service`) |
| WhatsApp | Twilio WhatsApp |
| Email | Resend (`email.service`) |

## Backend env that controls OTP

`selorg-service/.env` — **not** Rider `.env`.

- `OTP_DEV_MODE=False` (does not skip Rider delivery)
- `TWILIO_*`, `RESEND_*`, optional `MSG91_*`

## Live local results (this session)

| Check | Result |
|-------|--------|
| Email OTP send | **PASS** — Resend accepted (`deliveryStatus: sent`) |
| WhatsApp OTP send | **PASS** — Twilio accepted |
| SMS OTP send | **PASS** — SpearUC `SMS_VENDOR_URL` from `config.json` (`deliveryStatus: sent`) |
| Fake success removed | **PASS** — provider failure returns HTTP 502 |

## SMS config (OTP_PROCESS_WORKFLOW.md)

Phone SMS now uses project `config.json` `smsvendor` via `selorg-service/.env`:

- `SMS_VENDOR_URL` = SpearUC URL (`to_mobileno` + `sms_text`)
- `SMS_MESSAGE_TEMPLATE` = DLT template with `{otp}`
- Provider order: **config smsvendor → MSG91 → Fast2SMS → Twilio**

## Remaining blocker for SMS

None for local realtime SMS when SpearUC credentials are valid. Hosted `dev-api.selorg.com` still needs this env deployed.
