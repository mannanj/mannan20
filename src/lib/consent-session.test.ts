import { afterAll, beforeEach, describe, expect, test } from 'bun:test';

const OLD_SECRET = process.env.MANNAN_SESSION_SECRET;
const ACCOUNT_ID = '0123456789abcdef0123456789abcdef';

process.env.MANNAN_SESSION_SECRET = 'test-secret-with-enough-entropy';

const consent = await import('./consent-session');

describe('consent session cookies', () => {
  beforeEach(() => {
    process.env.MANNAN_SESSION_SECRET = 'test-secret-with-enough-entropy';
  });

  afterAll(() => {
    if (OLD_SECRET === undefined) delete process.env.MANNAN_SESSION_SECRET;
    else process.env.MANNAN_SESSION_SECRET = OLD_SECRET;
  });

  test('round trips a short-lived pending account session', async () => {
    const cookie = await consent.createConsentSessionCookie({
      accountId: ACCOUNT_ID,
      email: ' New.Person@Example.com ',
      role: 'user',
      returnTo: '/meet/room-123?from=invite',
    });

    expect(cookie).toContain('__Host-mannan-consent=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('Max-Age=1800');

    const parsed = await consent.readConsentSession(cookie);
    expect(parsed).toMatchObject({
      purpose: 'legal_consent',
      accountId: ACCOUNT_ID,
      email: 'new.person@example.com',
      role: 'user',
      returnTo: '/meet/room-123?from=invite',
    });
  });

  test('rejects a tampered consent session', async () => {
    const cookie = await consent.createConsentSessionCookie({
      accountId: ACCOUNT_ID,
      email: 'person@example.com',
      role: 'user',
      returnTo: '/',
    });
    const value = cookie.match(/__Host-mannan-consent=([^;]+)/)?.[1];
    expect(value).toBeString();
    const [payload, signature] = value!.split('.');
    const tamperedPayload = `${payload.slice(0, -1)}${payload.endsWith('a') ? 'b' : 'a'}`;

    expect(
      await consent.readConsentSession(
        cookie.replace(value!, `${tamperedPayload}.${signature}`),
      ),
    ).toBeNull();
  });

  test('clears the consent cookie after activation', () => {
    expect(consent.clearConsentSessionCookie()).toContain('Max-Age=0');
  });
});
