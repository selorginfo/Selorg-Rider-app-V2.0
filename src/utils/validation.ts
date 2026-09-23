/** Client-side checks aligned with picker Zod + auth service rules. */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Backend `otpCode` is always exactly 4 digits. */
export const OTP_LENGTH = 4;
export const NAME_MIN = 2;
export const NAME_MAX = 100;
export const NOTE_MAX = 500;
export const TICKET_SUBJECT_MIN = 3;
export const TICKET_SUBJECT_MAX = 200;
export const TICKET_MESSAGE_MAX = 2000;
export const CHAT_MESSAGE_MAX = 2000;
export const VEHICLE_REG_MIN = 4;
export const VEHICLE_REG_MAX = 20;
/** Matches `registrationNumber` in picker.rider.validation.ts (after uppercasing). */
export const VEHICLE_REG_RE = /^[A-Z0-9][A-Z0-9 -]*$/;

export function digitsOnly(value: string, max = 10): string {
  return value.replace(/\D/g, '').slice(0, max);
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(normalizeEmail(value));
}

/** 10 Indian digits; rejects all-zeros (auth `normalizePhone`). */
export function isValidIndianMobile(value: string): boolean {
  const p = digitsOnly(value);
  return /^\d{10}$/.test(p) && !/^0+$/.test(p);
}

export function isValidOtp(value: string, length = OTP_LENGTH): boolean {
  return new RegExp(`^\\d{${length}}$`).test(value.trim());
}

export function emailError(value: string): string | null {
  const e = normalizeEmail(value);
  if (!e) {
    return 'Enter your email address.';
  }
  if (!isValidEmail(e)) {
    return 'Enter a valid email address.';
  }
  return null;
}

export function phoneError(value: string): string | null {
  const p = digitsOnly(value);
  if (!p) {
    return 'Enter your mobile number.';
  }
  if (p.length < 10) {
    return 'Enter a 10-digit mobile number.';
  }
  if (!isValidIndianMobile(p)) {
    return 'Enter a valid 10-digit mobile number.';
  }
  return null;
}

export function nameError(value: string): string | null {
  const n = value.trim();
  if (!n) {
    return 'Enter your full name.';
  }
  if (n.length < NAME_MIN) {
    return `Name must be at least ${NAME_MIN} characters.`;
  }
  if (n.length > NAME_MAX) {
    return `Name must be at most ${NAME_MAX} characters.`;
  }
  return null;
}

export function normalizeVehicleReg(value: string): string {
  return value.trim().toUpperCase().slice(0, VEHICLE_REG_MAX);
}

export function vehicleRegError(value: string): string | null {
  const raw = value.trim();
  if (!raw) {
    return 'Enter your vehicle registration number.';
  }
  const v = normalizeVehicleReg(raw);
  if (v.length < VEHICLE_REG_MIN) {
    return `Registration number must be at least ${VEHICLE_REG_MIN} characters.`;
  }
  if (v.length > VEHICLE_REG_MAX) {
    return 'Registration number is too long.';
  }
  if (!VEHICLE_REG_RE.test(v)) {
    return 'Enter a valid vehicle registration number.';
  }
  return null;
}

export function authTargetError(
  method: 'email' | 'mobile' | 'whatsapp',
  email: string,
  phone: string,
): string | null {
  if (method === 'email') {
    return emailError(email);
  }
  return phoneError(phone);
}
