import { describe, expect, test } from 'bun:test';
import { normalizeCloudflareSiteUser } from './cloudflare-auth';

describe('cloudflare auth bridge', () => {
  test('accepts a well formed admin exchange response', () => {
    expect(
      normalizeCloudflareSiteUser({
        email: 'HELLO@MANNAN.IS',
        role: 'admin',
        admin: true,
      }),
    ).toEqual({
      email: 'hello@mannan.is',
      role: 'admin',
      admin: true,
    });
  });

  test('maps non-admin exchange responses to normal users', () => {
    expect(
      normalizeCloudflareSiteUser({
        email: 'person@example.com',
        role: 'client',
        admin: false,
      }),
    ).toEqual({
      email: 'person@example.com',
      role: 'user',
      admin: false,
    });
  });

  test('rejects malformed exchange responses', () => {
    expect(normalizeCloudflareSiteUser({ email: 'not-an-email', role: 'admin' })).toBeNull();
    expect(normalizeCloudflareSiteUser({ email: 'person@example.com', role: 1 })).toBeNull();
    expect(normalizeCloudflareSiteUser(null)).toBeNull();
  });
});
