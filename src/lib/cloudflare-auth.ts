import type { SiteSessionRole } from '@/lib/site-session';

const DEFAULT_WORKER_URL = 'https://cloud-worker.mannanteam.workers.dev';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface CloudflareSiteUser {
  email: string;
  role: SiteSessionRole;
  admin: boolean;
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

export function normalizeCloudflareSiteUser(input: unknown): CloudflareSiteUser | null {
  if (!input || typeof input !== 'object') return null;
  const record = input as Record<string, unknown>;
  const email = typeof record.email === 'string' ? record.email.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(email) || email.length > 254) return null;
  if (typeof record.role !== 'string') return null;
  const role: SiteSessionRole = record.role === 'admin' ? 'admin' : 'user';
  return { email, role, admin: role === 'admin' };
}

export async function requestCloudflareContinueEmail(input: {
  email: string;
  ip: string;
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
    body: JSON.stringify({ email: input.email }),
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
