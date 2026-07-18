import type { SiteSessionRole } from '@/lib/site-session';

const DEFAULT_WORKER_URL = 'https://cloud-worker.mannanteam.workers.dev';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ACCOUNT_ID_RE = /^[a-f0-9]{32}$/u;

export type CloudflareAccountStatus = 'active' | 'pending_consent';

export interface CloudflareAccount {
  accountId: string;
  email: string;
  role: SiteSessionRole;
  admin: boolean;
  status: CloudflareAccountStatus;
}

export interface CloudflareSiteUser extends CloudflareAccount {
  returnTo: string;
}

interface AuthRequestResult {
  ok: boolean;
  status: number;
  error?: string;
}

function workerUrl(): string {
  return (process.env.CLOUDFLARE_AUTH_WORKER_URL ?? DEFAULT_WORKER_URL).replace(/\/+$/, '');
}

function exchangeSecret(): string | null {
  return process.env.CLOUDFLARE_AUTH_EXCHANGE_SECRET ?? null;
}

export function cloudflareAuthConfigured(): boolean {
  return Boolean(exchangeSecret());
}

export function sanitizeAuthReturnPath(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    /[\u0000-\u001f\u007f]/u.test(value)
  ) {
    return '/';
  }
  try {
    const parsed = new URL(value, 'https://mannan.is');
    if (parsed.origin !== 'https://mannan.is' || parsed.pathname === '/auth/consent') return '/';
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '/';
  }
}

export function browserAuthReturnPath(location: {
  pathname: string;
  search: string;
  hash: string;
}): string {
  return sanitizeAuthReturnPath(`${location.pathname}${location.search}${location.hash}`);
}

export function normalizeCloudflareAccount(input: unknown): CloudflareAccount | null {
  if (!input || typeof input !== 'object') return null;
  const record = input as Record<string, unknown>;
  const accountId = typeof record.accountId === 'string' ? record.accountId : '';
  const email = typeof record.email === 'string' ? record.email.trim().toLowerCase() : '';
  if (!ACCOUNT_ID_RE.test(accountId) || !EMAIL_RE.test(email) || email.length > 254) return null;
  if (typeof record.role !== 'string') return null;
  if (record.status !== 'active' && record.status !== 'pending_consent') return null;
  const role: SiteSessionRole = record.role === 'admin' ? 'admin' : 'user';
  return { accountId, email, role, admin: role === 'admin', status: record.status };
}

export function normalizeCloudflareSiteUser(input: unknown): CloudflareSiteUser | null {
  const account = normalizeCloudflareAccount(input);
  if (account === null || !input || typeof input !== 'object') return null;
  const record = input as Record<string, unknown>;
  if (typeof record.returnTo !== 'string') return null;
  return { ...account, returnTo: sanitizeAuthReturnPath(record.returnTo) };
}

export async function requestCloudflareContinueEmail(input: {
  email: string;
  ip: string;
  returnTo: string;
}): Promise<AuthRequestResult> {
  const secret = exchangeSecret();
  if (!secret) return { ok: false, status: 503, error: 'not-configured' };

  const res = await fetch(`${workerUrl()}/auth/site/request`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/json',
      'x-site-auth-ip': input.ip,
    },
    body: JSON.stringify({
      email: input.email,
      returnTo: sanitizeAuthReturnPath(input.returnTo),
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const error =
      body && typeof body === 'object' && typeof (body as Record<string, unknown>).error === 'string'
        ? ((body as Record<string, unknown>).error as string)
        : 'request-failed';
    return { ok: false, status: res.status, error };
  }
  return { ok: true, status: res.status };
}

export async function exchangeCloudflareCode(code: string): Promise<CloudflareSiteUser | null> {
  const secret = exchangeSecret();
  if (!secret) return null;

  const res = await fetch(`${workerUrl()}/auth/site/exchange`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) return null;
  return normalizeCloudflareSiteUser(await res.json().catch(() => null));
}

export async function acceptCloudflareLegalConsent(input: {
  accountId: string;
  termsVersion: string;
  privacyVersion: string;
}): Promise<CloudflareAccount | null> {
  const secret = exchangeSecret();
  if (!secret) return null;

  const res = await fetch(`${workerUrl()}/auth/site/consent`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) return null;

  const body: unknown = await res.json().catch(() => null);
  const account = normalizeCloudflareAccount(body);
  if (account === null || account.status !== 'active' || !body || typeof body !== 'object') {
    return null;
  }
  const record = body as Record<string, unknown>;
  if (
    record.termsVersion !== input.termsVersion ||
    record.privacyVersion !== input.privacyVersion
  ) {
    return null;
  }
  return account;
}
