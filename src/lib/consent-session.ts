import { createHmac, timingSafeEqual } from 'node:crypto';
import { sanitizeAuthReturnPath } from '@/lib/cloudflare-auth';
import type { SiteSessionRole } from '@/lib/site-session';

const COOKIE_NAME = '__Host-mannan-consent';
const CONSENT_SESSION_TTL_SEC = 60 * 30;
const ACCOUNT_ID_RE = /^[a-f0-9]{32}$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface ConsentSession {
  purpose: 'legal_consent';
  accountId: string;
  email: string;
  role: SiteSessionRole;
  returnTo: string;
  exp: number;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function sessionSecret(): string {
  const secret = process.env.MANNAN_SESSION_SECRET;
  if (!secret) throw new Error('MANNAN_SESSION_SECRET is required for consent sessions');
  return secret;
}

function sign(payload: string): string {
  return createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
}

function signaturesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function cookieValue(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(/;\s*/)
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  return match ? match.slice(COOKIE_NAME.length + 1) : null;
}

function normalizeRole(value: unknown): SiteSessionRole | null {
  if (value === 'admin' || value === 'user') return value;
  return null;
}

export async function createConsentSessionCookie(input: {
  accountId: string;
  email: string;
  role: SiteSessionRole;
  returnTo: string;
}): Promise<string> {
  const payload: ConsentSession = {
    purpose: 'legal_consent',
    accountId: input.accountId,
    email: input.email.trim().toLowerCase(),
    role: input.role,
    returnTo: sanitizeAuthReturnPath(input.returnTo),
    exp: Math.floor(Date.now() / 1000) + CONSENT_SESSION_TTL_SEC,
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  return `${COOKIE_NAME}=${encoded}.${sign(encoded)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${CONSENT_SESSION_TTL_SEC}`;
}

export function clearConsentSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export function readConsentSession(cookieHeader: string | null): ConsentSession | null {
  const value = cookieValue(cookieHeader);
  if (!value) return null;

  const [payload, signature] = value.split('.');
  if (!payload || !signature || !signaturesMatch(sign(payload), signature)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(base64UrlDecode(payload));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;

  const record = parsed as Record<string, unknown>;
  const accountId = typeof record.accountId === 'string' ? record.accountId : '';
  const email = typeof record.email === 'string' ? record.email.trim().toLowerCase() : '';
  const role = normalizeRole(record.role);
  const returnTo = sanitizeAuthReturnPath(record.returnTo);
  const exp = typeof record.exp === 'number' ? record.exp : 0;
  if (
    record.purpose !== 'legal_consent' ||
    !ACCOUNT_ID_RE.test(accountId) ||
    !EMAIL_RE.test(email) ||
    email.length > 254 ||
    !role ||
    exp < Math.floor(Date.now() / 1000)
  ) {
    return null;
  }

  return { purpose: 'legal_consent', accountId, email, role, returnTo, exp };
}
