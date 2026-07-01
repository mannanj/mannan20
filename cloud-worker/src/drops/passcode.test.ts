import { describe, expect, test } from 'bun:test';
import { hashPasscode, newSalt, verifyPasscode } from './passcode';

describe('drops passcode (PBKDF2)', () => {
  test('hash is deterministic per (passcode, salt) and 64-hex', async () => {
    const salt = newSalt();
    const h1 = await hashPasscode('let-me-in', salt);
    const h2 = await hashPasscode('let-me-in', salt);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
    expect(h1).toBe(h2);
  });
  test('different salts yield different hashes for the same passcode', async () => {
    expect(await hashPasscode('let-me-in', newSalt())).not.toBe(await hashPasscode('let-me-in', newSalt()));
  });
  test('verify accepts the right passcode and rejects the wrong one', async () => {
    const salt = newSalt();
    const hash = await hashPasscode('let-me-in', salt);
    expect(await verifyPasscode('let-me-in', salt, hash)).toBe(true);
    expect(await verifyPasscode('let-me-out', salt, hash)).toBe(false);
  });
});
