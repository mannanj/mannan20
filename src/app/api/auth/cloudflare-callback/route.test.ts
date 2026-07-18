import { afterAll, beforeEach, describe, expect, test } from 'bun:test';

const OLD_FETCH = globalThis.fetch;
const OLD_SECRET = process.env.MANNAN_SESSION_SECRET;
const OLD_EXCHANGE_SECRET = process.env.CLOUDFLARE_AUTH_EXCHANGE_SECRET;
const ACCOUNT_ID = '0123456789abcdef0123456789abcdef';

process.env.MANNAN_SESSION_SECRET = 'test-secret-with-enough-entropy';
process.env.CLOUDFLARE_AUTH_EXCHANGE_SECRET = 'test-exchange-secret';

const callback = await import('./route');
const { readConsentSession } = await import('@/lib/consent-session');
const { readSiteSession } = await import('@/lib/site-session');

function installExchangeResponse(body: Record<string, unknown>) {
  globalThis.fetch = (async (_input, init) => {
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ code: 'verified-code' });
    return Response.json(body);
  }) as typeof fetch;
}

describe('Cloudflare auth callback', () => {
  beforeEach(() => {
    process.env.MANNAN_SESSION_SECRET = 'test-secret-with-enough-entropy';
    process.env.CLOUDFLARE_AUTH_EXCHANGE_SECRET = 'test-exchange-secret';
  });

  afterAll(() => {
    globalThis.fetch = OLD_FETCH;
    if (OLD_SECRET === undefined) delete process.env.MANNAN_SESSION_SECRET;
    else process.env.MANNAN_SESSION_SECRET = OLD_SECRET;
    if (OLD_EXCHANGE_SECRET === undefined) delete process.env.CLOUDFLARE_AUTH_EXCHANGE_SECRET;
    else process.env.CLOUDFLARE_AUTH_EXCHANGE_SECRET = OLD_EXCHANGE_SECRET;
  });

  test('starts an active site session and resumes the intended flow', async () => {
    installExchangeResponse({
      accountId: ACCOUNT_ID,
      email: 'person@example.com',
      role: 'client',
      status: 'active',
      returnTo: '/meet/room-123?from=invite',
    });

    const response = await callback.GET(
      new Request('https://mannan.is/api/auth/cloudflare-callback?code=verified-code'),
    );

    expect(response.headers.get('location')).toBe(
      'https://mannan.is/meet/room-123?from=invite',
    );
    const cookie = response.headers.get('set-cookie');
    expect(cookie).toContain('__Host-mannan-session=');
    expect(cookie).toContain('__Host-mannan-consent=;');
    expect(await readSiteSession(cookie)).toMatchObject({
      accountId: ACCOUNT_ID,
      email: 'person@example.com',
      role: 'user',
    });
  });

  test('starts a short consent session for a new account', async () => {
    installExchangeResponse({
      accountId: ACCOUNT_ID,
      email: 'new.person@example.com',
      role: 'client',
      status: 'pending_consent',
      returnTo: '/meet/room-123',
    });

    const response = await callback.GET(
      new Request('https://mannan.is/api/auth/cloudflare-callback?code=verified-code'),
    );

    expect(response.headers.get('location')).toBe('https://mannan.is/auth/consent');
    const cookie = response.headers.get('set-cookie');
    expect(cookie).toContain('__Host-mannan-consent=');
    expect(cookie).toContain('__Host-mannan-session=;');
    expect(readConsentSession(cookie)).toMatchObject({
      accountId: ACCOUNT_ID,
      email: 'new.person@example.com',
      role: 'user',
      returnTo: '/meet/room-123',
    });
  });
});
