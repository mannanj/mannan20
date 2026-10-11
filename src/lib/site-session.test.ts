import { afterAll, beforeEach, describe, expect, test } from 'bun:test';

const OLD_SECRET = process.env.MANNAN_SESSION_SECRET;

process.env.MANNAN_SESSION_SECRET = 'test-secret-with-enough-entropy';

const session = await import('./site-session');

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
      email: 'hello@mannan.is',
      role: 'admin',
      admin: true,
    });
  });

  test('rejects a tampered signed session', async () => {
    const cookie = await session.createSiteSessionCookie({
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

const pair = (await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])) as CryptoKeyPair;
const pkcs8 = Buffer.from(await crypto.subtle.exportKey('pkcs8', pair.privateKey)).toString('base64url');
const publicKey = pair.publicKey;

describe('public-key (Ed25519) session signature', () => {
  const valueOf = (cookie: string) => cookie.match(/__Host-mannan-session=([^;]+)/)![1]!;
  const verifies = async (value: string) => {
    const [payload, , ed] = value.split('.');
    return crypto.subtle.verify({ name: 'Ed25519' }, publicKey, Buffer.from(ed!, 'base64url'), new TextEncoder().encode(payload));
  };

  beforeEach(() => {
    process.env.MANNAN_SESSION_SECRET = 'test-secret-with-enough-entropy';
    delete process.env.SESSION_SIGNING_KEY;
  });
  afterAll(() => {
    delete process.env.SESSION_SIGNING_KEY;
  });

  test('without a key, cookies stay payload.hmac (unchanged)', async () => {
    const cookie = await session.createSiteSessionCookie({ email: 'a@b.co', role: 'user' });
    expect(valueOf(cookie).split('.')).toHaveLength(2);
  });

  test('with a key, a new cookie is payload.hmac.ed25519 and the public key verifies it', async () => {
    process.env.SESSION_SIGNING_KEY = pkcs8;
    const cookie = await session.createSiteSessionCookie({ email: 'a@b.co', role: 'user' });
    const value = valueOf(cookie);
    expect(value.split('.')).toHaveLength(3);
    expect(await verifies(value)).toBe(true);
    // The site's own check is unchanged and still passes.
    expect(await session.readSiteSession(cookie)).toMatchObject({ email: 'a@b.co', role: 'user' });
  });

  test('an old (HMAC-only) session is upgraded: same payload and expiry, plus the signature', async () => {
    const old = await session.createSiteSessionCookie({ email: 'a@b.co', role: 'admin' });
    process.env.SESSION_SIGNING_KEY = pkcs8;
    const upgraded = await session.upgradeSiteSessionCookie(old);
    expect(upgraded).not.toBeNull();
    const [oldPayload, oldHmac] = valueOf(old).split('.');
    const [payload, hmac] = valueOf(upgraded!).split('.');
    expect([payload, hmac]).toEqual([oldPayload, oldHmac]);
    expect(await verifies(valueOf(upgraded!))).toBe(true);
    const maxAge = Number(upgraded!.match(/Max-Age=(\d+)/)![1]);
    expect(maxAge).toBeLessThanOrEqual(60 * 60 * 24 * 30);
    expect(upgraded).toContain('HttpOnly');
  });

  test('nothing to upgrade: no key, already signed, invalid, or no cookie', async () => {
    const old = await session.createSiteSessionCookie({ email: 'a@b.co', role: 'user' });
    expect(await session.upgradeSiteSessionCookie(old)).toBeNull(); // no key
    process.env.SESSION_SIGNING_KEY = pkcs8;
    const fresh = await session.createSiteSessionCookie({ email: 'a@b.co', role: 'user' });
    expect(await session.upgradeSiteSessionCookie(fresh)).toBeNull(); // already signed
    expect(await session.upgradeSiteSessionCookie(old.replace(/\.[^.;]+;/, '.forged;'))).toBeNull(); // bad HMAC
    expect(await session.upgradeSiteSessionCookie(null)).toBeNull();
  });
});
