import { afterAll, afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { createConsentSessionCookie } from '@/lib/consent-session';
import { readSiteSession } from '@/lib/site-session';

const ORIGINAL_FETCH = globalThis.fetch;
const OLD_SESSION_SECRET = process.env.MANNAN_SESSION_SECRET;
const OLD_EXCHANGE_SECRET = process.env.CLOUDFLARE_AUTH_EXCHANGE_SECRET;
const ACCOUNT_ID = '0123456789abcdef0123456789abcdef';

process.env.MANNAN_SESSION_SECRET = 'test-secret-with-enough-entropy';
process.env.CLOUDFLARE_AUTH_EXCHANGE_SECRET = 'test-exchange-secret';

const { POST } = await import('./route');

async function consentRequest(
  body: { accepted: 'yes' | 'no' },
  pending: 'valid' | null = 'valid',
  origin = 'https://mannan.is',
): Promise<Request> {
  const cookie =
    pending === 'valid'
      ? await createConsentSessionCookie({
          accountId: ACCOUNT_ID,
          email: 'person@example.com',
          role: 'user',
          returnTo: '/meet/abc',
        })
      : '';
  return new Request('https://mannan.is/api/auth/consent', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      origin,
      ...(cookie ? { cookie } : {}),
    },
    body: new URLSearchParams(body),
  });
}

function installActiveResponse(overrides: Record<string, unknown> = {}) {
  globalThis.fetch = (async (_input, init) => {
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({
      accountId: ACCOUNT_ID,
      termsVersion: '2026-07-18',
      privacyVersion: '2026-07-18',
    });
    return Response.json({
      accountId: ACCOUNT_ID,
      email: 'person@example.com',
      role: 'user',
      admin: false,
      status: 'active',
      termsVersion: '2026-07-18',
      privacyVersion: '2026-07-18',
      ...overrides,
    });
  }) as typeof fetch;
}

describe('account consent completion', () => {
  beforeEach(() => {
    process.env.MANNAN_SESSION_SECRET = 'test-secret-with-enough-entropy';
    process.env.CLOUDFLARE_AUTH_EXCHANGE_SECRET = 'test-exchange-secret';
  });

  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  afterAll(() => {
    if (OLD_SESSION_SECRET === undefined) delete process.env.MANNAN_SESSION_SECRET;
    else process.env.MANNAN_SESSION_SECRET = OLD_SESSION_SECRET;
    if (OLD_EXCHANGE_SECRET === undefined) delete process.env.CLOUDFLARE_AUTH_EXCHANGE_SECRET;
    else process.env.CLOUDFLARE_AUTH_EXCHANGE_SECRET = OLD_EXCHANGE_SECRET;
  });

  test('activates the account, replaces cookies, and resumes the intended flow', async () => {
    installActiveResponse();

    const response = await POST(await consentRequest({ accepted: 'yes' }));

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('https://mannan.is/meet/abc');
    const cookies = response.headers.get('set-cookie');
    expect(cookies).toContain('__Host-mannan-session=');
    expect(cookies).toContain('__Host-mannan-consent=;');
    expect(cookies).toContain('Max-Age=0');
    expect(await readSiteSession(cookies)).toMatchObject({
      accountId: ACCOUNT_ID,
      email: 'person@example.com',
      role: 'user',
    });
  });

  test.each([
    ['missing pending cookie', { accepted: 'yes' } as const, null, 'https://mannan.is', 401],
    ['unchecked consent', { accepted: 'no' } as const, 'valid' as const, 'https://mannan.is', 400],
    [
      'wrong origin',
      { accepted: 'yes' } as const,
      'valid' as const,
      'https://evil.example',
      403,
    ],
  ])('%s fails closed', async (_label, body, pending, origin, status) => {
    expect((await POST(await consentRequest(body, pending, origin))).status).toBe(status);
  });

  test('rejects an activation response for a different account', async () => {
    installActiveResponse({ accountId: 'fedcba9876543210fedcba9876543210' });

    const response = await POST(await consentRequest({ accepted: 'yes' }));

    expect(response.status).toBe(409);
    expect(response.headers.get('set-cookie')).toBeNull();
  });
});
