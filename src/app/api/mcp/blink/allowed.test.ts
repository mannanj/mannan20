import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { accessTestDb } from '@/lib/app-access-test-db';
import { grantAccess, OWNER_EMAIL, saveApp } from '@/lib/app-access';
import type { D1Binding } from '@/lib/cf-bindings';

let db: D1Binding | null = null;
mock.module('@/lib/uploads', () => ({ UPLOAD_OWNER_EMAIL: 'hello@mannan.is', uploadsEnv: () => (db ? { UPLOADS_DB: db } : null) }));
const { isBlinkAllowed } = await import('./shared');

beforeEach(async () => {
  db = accessTestDb();
  await saveApp(db, { id: 'blink', name: 'Blink', description: '', url: 'https://mannan.is/blink', visibility: 'granted' });
  await grantAccess(db, 'blink', 'granted@example.com', OWNER_EMAIL);
  process.env.BLINK_ALLOWED_EMAILS = 'listed@example.com';
});
afterEach(() => { delete process.env.BLINK_ALLOWED_EMAILS; });

describe('isBlinkAllowed', () => {
  test('the old list still works, and a grant in the table works', async () => {
    expect(await isBlinkAllowed('listed@example.com')).toBe(true);
    expect(await isBlinkAllowed('Granted@Example.com')).toBe(true);
  });
  test('strangers, empty and lookalikes are refused', async () => {
    for (const e of ['stranger@example.com', '', null, undefined, 'granted@example.com.evil', 'listed@example.co']) {
      expect(await isBlinkAllowed(e)).toBe(false);
    }
  });
  test('a grant on another app does not open Blink', async () => {
    await saveApp(db!, { id: 'demo', name: 'Demo', description: '', url: 'https://mannan.is/demo', visibility: 'granted' });
    await grantAccess(db!, 'demo', 'other@example.com', OWNER_EMAIL);
    expect(await isBlinkAllowed('other@example.com')).toBe(false);
  });
  test('Blink made owner-only: grants stop working, the env list keeps working', async () => {
    await saveApp(db!, { id: 'blink', name: 'Blink', description: '', url: 'https://mannan.is/blink', visibility: 'owner' });
    expect(await isBlinkAllowed('granted@example.com')).toBe(false);
    expect(await isBlinkAllowed('listed@example.com')).toBe(true);
  });
  test('no database (or a broken one): only the list', async () => {
    db = null;
    expect(await isBlinkAllowed('granted@example.com')).toBe(false);
    db = { prepare: () => { throw new Error('boom'); }, batch: async () => [] } as unknown as D1Binding;
    expect(await isBlinkAllowed('granted@example.com')).toBe(false);
    expect(await isBlinkAllowed('listed@example.com')).toBe(true);
  });
});
