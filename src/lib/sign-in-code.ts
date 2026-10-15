export const SIGN_IN_CODE_DIGITS = 8;
export const SIGN_IN_CODE_REJECTED = "That code didn't work. Check it or send a new one.";
export const RESEND_COOLDOWN_SECONDS = 30;

export function normalizeSignInCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const digits = raw.replace(/\D/g, '');
  return digits.length === SIGN_IN_CODE_DIGITS ? digits : null;
}

export function formatSignInCodeInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, SIGN_IN_CODE_DIGITS);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
}
