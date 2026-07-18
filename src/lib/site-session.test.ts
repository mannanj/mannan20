import { afterAll, beforeEach, describe, expect, test } from 'bun:test';

const OLD_SECRET = process.env.MANNAN_SESSION_SECRET;

process.env.MANNAN_SESSION_SECRET = 'test-secret-with-enough-entropy';

const session = await import('./site-session');
const ACCOUNT_ID = '0123456789abcdef0123456789abcdef';

describe('site session cookies', () => {
  beforeEach(() => {
    process.env.MANNAN_SESSION_SECRET = 'test-secret-with-enough-entropy';
  });

  afterAll(() => {
    if (OLD_SECRET === undefined) delete process.env.MANNAN_SESSION_SECRET;
    else process.env.MANNAN_SESSION_SECRET = OLD_SECRET;
  });

  test('round trips a signed admin session without exposing a writable cookie', async () => {
    const cookie = await session.createSiteSessionCookie({
      accountId: ACCOUNT_ID,
      email: 'hello@mannan.is',
      role: 'admin',
    });

    expect(cookie).toContain('__Host-mannan-session=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');

    const parsed = await session.readSiteSession(cookie);
    expect(parsed).toMatchObject({
      accountId: ACCOUNT_ID,
      email: 'hello@mannan.is',
      role: 'admin',
      admin: true,
    });
  });

  test('rejects a tampered signed session', async () => {
    const cookie = await session.createSiteSessionCookie({
      accountId: ACCOUNT_ID,
      email: 'reader@example.com',
      role: 'user',
    });
    const value = cookie.match(/__Host-mannan-session=([^;]+)/)?.[1];
    expect(value).toBeString();
    const [payload, signature] = value!.split('.');
    const tamperedPayload = `${payload.slice(0, -1)}${payload.endsWith('a') ? 'b' : 'a'}`;
    const tampered = cookie.replace(value!, `${tamperedPayload}.${signature}`);

    const parsed = await session.readSiteSession(tampered);

    expect(parsed).toBeNull();
  });
});
