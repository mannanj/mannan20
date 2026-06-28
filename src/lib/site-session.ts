import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = '__Host-mannan-session';
const SESSION_TTL_SEC = 60 * 60 * 24 * 30;

export type SiteSessionRole = 'admin' | 'user';

export interface SiteSession {
  email: string;
  role: SiteSessionRole;
  admin: boolean;
  exp: number;
}

interface SignedSessionPayload {
  email: string;
  role: SiteSessionRole;
  exp: number;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  return Buffer.from(padded, 'base64').toString('utf8');
}

function sessionSecret(): string {
  const secret = process.env.MANNAN_SESSION_SECRET;
  if (!secret) {
    throw new Error('MANNAN_SESSION_SECRET is required for site sessions');
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
}

function signaturesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function normalizeRole(role: unknown): SiteSessionRole | null {
  if (role === 'admin') return 'admin';
  if (role === 'user') return 'user';
  return null;
}

function cookieValue(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(/;\s*/)
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  return match ? match.slice(COOKIE_NAME.length + 1) : null;
}

export async function createSiteSessionCookie(input: {
  email: string;
  role: SiteSessionRole;
}): Promise<string> {
  const payload: SignedSessionPayload = {
    email: input.email.trim().toLowerCase(),
    role: input.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SEC,
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  return `${COOKIE_NAME}=${encoded}.${sign(encoded)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SEC}`;
}

export function clearSiteSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export async function readSiteSession(cookieHeader: string | null): Promise<SiteSession | null> {
  const value = cookieValue(cookieHeader);
  if (!value) return null;

  const [payload, signature] = value.split('.');
  if (!payload || !signature) return null;
  if (!signaturesMatch(sign(payload), signature)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(base64UrlDecode(payload));
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') return null;
  const record = parsed as Record<string, unknown>;
  const email = typeof record.email === 'string' ? record.email.trim().toLowerCase() : '';
  const role = normalizeRole(record.role);
  const exp = typeof record.exp === 'number' ? record.exp : 0;

  if (!email || !role || exp < Math.floor(Date.now() / 1000)) return null;
  return { email, role, admin: role === 'admin', exp };
}
