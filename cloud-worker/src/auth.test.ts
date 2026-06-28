import { describe, expect, test } from 'bun:test';
import {
  dbRoleForEmail,
  siteRoleFromDbRole,
  hashSecret,
} from './auth';

describe('shared auth helpers', () => {
  test('assigns hello@mannan.is as the shared admin account', () => {
    expect(dbRoleForEmail('hello@mannan.is')).toBe('admin');
    expect(dbRoleForEmail(' Hello@Mannan.Is ')).toBe('admin');
    expect(dbRoleForEmail('person@example.com')).toBe('client');
  });

  test('maps cloud client users to normal site users', () => {
    expect(siteRoleFromDbRole('admin')).toBe('admin');
    expect(siteRoleFromDbRole('client')).toBe('user');
    expect(siteRoleFromDbRole('anything-else')).toBe('user');
  });

  test('hashes bearer secrets before storage', async () => {
    const hashed = await hashSecret('raw-token-value');

    expect(hashed).not.toBe('raw-token-value');
    expect(hashed).toMatch(/^[a-f0-9]{64}$/);
  });
});
