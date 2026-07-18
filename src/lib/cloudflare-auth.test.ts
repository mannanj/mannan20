import { afterEach, describe, expect, test } from 'bun:test';
import {
  normalizeCloudflareSiteUser,
  requestCloudflareContinueEmail,
  sanitizeAuthReturnPath,
} from './cloudflare-auth';

const ACCOUNT_ID = '0123456789abcdef0123456789abcdef';
const OLD_FETCH = globalThis.fetch;
const OLD_EXCHANGE_SECRET = process.env.CLOUDFLARE_AUTH_EXCHANGE_SECRET;

afterEach(() => {
  globalThis.fetch = OLD_FETCH;
  if (OLD_EXCHANGE_SECRET === undefined) delete process.env.CLOUDFLARE_AUTH_EXCHANGE_SECRET;
  else process.env.CLOUDFLARE_AUTH_EXCHANGE_SECRET = OLD_EXCHANGE_SECRET;
});

describe('cloudflare auth bridge', () => {
  test('accepts a well formed admin exchange response', () => {
    expect(
      normalizeCloudflareSiteUser({
        accountId: ACCOUNT_ID,
        email: 'HELLO@MANNAN.IS',
        role: 'admin',
        admin: true,
        status: 'active',
        returnTo: '/meet/room-123',
      }),
    ).toEqual({
      accountId: ACCOUNT_ID,
      email: 'hello@mannan.is',
      role: 'admin',
      admin: true,
      status: 'active',
      returnTo: '/meet/room-123',
    });
  });

  test('maps non-admin exchange responses to normal users', () => {
    expect(
      normalizeCloudflareSiteUser({
        accountId: ACCOUNT_ID,
        email: 'person@example.com',
        role: 'client',
        admin: false,
        status: 'pending_consent',
        returnTo: '/',
      }),
    ).toEqual({
      accountId: ACCOUNT_ID,
      email: 'person@example.com',
      role: 'user',
      admin: false,
      status: 'pending_consent',
      returnTo: '/',
    });
  });

  test('rejects malformed exchange responses', () => {
    expect(normalizeCloudflareSiteUser({ email: 'not-an-email', role: 'admin' })).toBeNull();
    expect(
      normalizeCloudflareSiteUser({
        accountId: ACCOUNT_ID,
        email: 'person@example.com',
        role: 1,
        status: 'active',
        returnTo: '/',
      }),
    ).toBeNull();
    expect(
      normalizeCloudflareSiteUser({
        accountId: 'wrong',
        email: 'person@example.com',
        role: 'user',
        status: 'active',
        returnTo: '/',
      }),
    ).toBeNull();
    expect(
      normalizeCloudflareSiteUser({
        accountId: ACCOUNT_ID,
        email: 'person@example.com',
        role: 'user',
        status: 'unknown',
        returnTo: '/',
      }),
    ).toBeNull();
    expect(normalizeCloudflareSiteUser(null)).toBeNull();
  });

  test('only permits local return paths', () => {
    expect(sanitizeAuthReturnPath('/meet/room-123?from=invite')).toBe(
      '/meet/room-123?from=invite',
    );
    expect(sanitizeAuthReturnPath('https://attacker.example/steal')).toBe('/');
    expect(sanitizeAuthReturnPath('//attacker.example/steal')).toBe('/');
    expect(sanitizeAuthReturnPath('/auth/consent')).toBe('/');
    expect(sanitizeAuthReturnPath(null)).toBe('/');
  });

  test('forwards a sanitized return path when requesting an email', async () => {
    process.env.CLOUDFLARE_AUTH_EXCHANGE_SECRET = 'test-exchange-secret';
    let body: unknown;
    globalThis.fetch = (async (_input, init) => {
      body = JSON.parse(String(init?.body));
      return new Response(null, { status: 202 });
    }) as typeof fetch;

    const result = await requestCloudflareContinueEmail({
      email: 'person@example.com',
      ip: '203.0.113.5',
      returnTo: 'https://attacker.example/steal',
    });

    expect(result).toEqual({ ok: true, status: 202 });
    expect(body).toEqual({ email: 'person@example.com', returnTo: '/' });
  });
});
