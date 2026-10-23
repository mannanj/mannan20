import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { accessTestDb } from '@/lib/app-access-test-db';
import { grantAccess, OWNER_EMAIL, saveApp } from '@/lib/app-access';
import type { D1Binding } from '@/lib/cf-bindings';

let db: D1Binding | null = null;
mock.module('@/lib/uploads', () => ({ UPLOAD_OWNER_EMAIL: 'hello@mannan.is', uploadsEnv: () => (db ? { UPLOADS_DB: db } : null) }));
const { isFreshStartAllowed } = await import('./shared');
const APP = { id: 'fresh-start', name: 'Fresh Start', description: '', url: 'https://mannan.is/fresh' };

beforeEach(async () => {
  db = accessTestDb();
  await saveApp(db, { ...APP, visibility: 'public' });
});

describe('isFreshStartAllowed (the shared app access table, no private list)', () => {
  test('public: any account', async () => {
    expect(await isFreshStartAllowed('anyone@example.com')).toBe(true);
  });
  test('empty is refused even when public', async () => {
    for (const e of ['', null, undefined]) expect(await isFreshStartAllowed(e)).toBe(false);
  });
  test('granted: only people granted it, not grants on another app', async () => {
    await saveApp(db!, { ...APP, visibility: 'granted' });
    await grantAccess(db!, 'fresh-start', 'granted@example.com', OWNER_EMAIL);
    await saveApp(db!, { id: 'demo', name: 'Demo', description: '', url: 'https://mannan.is/demo', visibility: 'granted' });
    await grantAccess(db!, 'demo', 'other@example.com', OWNER_EMAIL);
    expect(await isFreshStartAllowed('Granted@Example.com')).toBe(true);
    expect(await isFreshStartAllowed('other@example.com')).toBe(false);
    expect(await isFreshStartAllowed('granted@example.com.evil')).toBe(false);
  });
  test('owner-only: strangers refused', async () => {
    await saveApp(db!, { ...APP, visibility: 'owner' });
    expect(await isFreshStartAllowed('anyone@example.com')).toBe(false);
  });
  test('no app row, no database, or a broken one: refused', async () => {
    db = accessTestDb();
    expect(await isFreshStartAllowed('anyone@example.com')).toBe(false);
    db = null;
    expect(await isFreshStartAllowed('anyone@example.com')).toBe(false);
    db = { prepare: () => { throw new Error('boom'); }, batch: async () => [] } as unknown as D1Binding;
    expect(await isFreshStartAllowed('anyone@example.com')).toBe(false);
  });
});
