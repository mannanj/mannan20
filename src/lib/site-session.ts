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

/**
 * The site's PRIVATE Ed25519 key (base64url PKCS#8), or null when not set.
 *
 * Sessions carry a second, public-key signature so other apps on mannan.is
 * (the calendar first) can check a session THEMSELVES with only the public
 * key — no network call per request, nothing to rate-limit or time out —
 * while still being unable to mint one. The HMAC stays the site's own check.
 * Unset: cookies are HMAC-only and those apps ask the site, as before.
 */
let signingKey: Promise<CryptoKey> | null = null;
let signingKeySource: string | undefined;
function edSigningKey(): Promise<CryptoKey> | null {
  const raw = process.env.SESSION_SIGNING_KEY?.trim();
  if (!raw) return null;
  if (raw !== signingKeySource) {
    signingKeySource = raw;
    signingKey = crypto.subtle.importKey('pkcs8', Buffer.from(raw, 'base64url'), { name: 'Ed25519' }, false, ['sign']);
  }
  return signingKey;
}

/** The public-key signature over the payload, base64url, or null when no key is set. */
async function publicSign(payload: string): Promise<string | null> {
  const key = edSigningKey();
  if (!key) return null;
  const sig = await crypto.subtle.sign({ name: 'Ed25519' }, await key, new TextEncoder().encode(payload));
  return Buffer.from(sig).toString('base64url');
}

/** `payload.hmac[.ed25519]` — the third part only when a signing key is set. */
async function sessionValue(payload: string): Promise<string> {
  const ed = await publicSign(payload);
  return ed ? `${payload}.${sign(payload)}.${ed}` : `${payload}.${sign(payload)}`;
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

export function cookieValue(cookieHeader: string | null): string | null {
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
  return `${COOKIE_NAME}=${await sessionValue(encoded)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SEC}`;
}

/**
 * A valid session cookie that predates the public-key signature, re-issued
 * WITH it — same payload, same expiry (never extended), so nobody is signed
 * out by the change and nothing is granted that was not already. Null when
 * there is nothing to upgrade (no key set, no valid session, already signed).
 */
export async function upgradeSiteSessionCookie(cookieHeader: string | null): Promise<string | null> {
  const value = cookieValue(cookieHeader);
  if (!value || value.split('.').length !== 2 || !edSigningKey()) return null;
  const session = await readSiteSession(cookieHeader);
  if (!session) return null;
  const [payload] = value.split('.');
  const maxAge = session.exp - Math.floor(Date.now() / 1000);
  if (maxAge <= 0) return null;
  return `${COOKIE_NAME}=${await sessionValue(payload!)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
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
