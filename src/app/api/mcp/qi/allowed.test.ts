import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { accessTestDb } from '@/lib/app-access-test-db';
import { grantAccess, OWNER_EMAIL, saveApp } from '@/lib/app-access';
import type { D1Binding } from '@/lib/cf-bindings';

let db: D1Binding | null = null;
mock.module('@/lib/uploads', () => ({ UPLOAD_OWNER_EMAIL: 'hello@mannan.is', uploadsEnv: () => (db ? { UPLOADS_DB: db } : null) }));
const { isQiAllowed } = await import('./shared');
const APP = { id: 'qi', name: 'Qi', description: '', url: 'https://qi.mannan.is' };

beforeEach(async () => {
  db = accessTestDb();
  await saveApp(db, { ...APP, visibility: 'owner' });
});

describe('isQiAllowed (the shared app access table, no private list)', () => {
  test('owner-only (how it ships): Mannan yes, a stranger no', async () => {
    expect(await isQiAllowed(OWNER_EMAIL)).toBe(true);
    expect(await isQiAllowed('anyone@example.com')).toBe(false);
  });
  test('public: any account', async () => {
    await saveApp(db!, { ...APP, visibility: 'public' });
    expect(await isQiAllowed('anyone@example.com')).toBe(true);
  });
  test('empty is refused even when public', async () => {
    await saveApp(db!, { ...APP, visibility: 'public' });
    for (const e of ['', null, undefined]) expect(await isQiAllowed(e)).toBe(false);
  });
  test('granted: only people granted it, not grants on another app', async () => {
    await saveApp(db!, { ...APP, visibility: 'granted' });
    await grantAccess(db!, 'qi', 'granted@example.com', OWNER_EMAIL);
    await saveApp(db!, { id: 'demo', name: 'Demo', description: '', url: 'https://mannan.is/demo', visibility: 'granted' });
    await grantAccess(db!, 'demo', 'other@example.com', OWNER_EMAIL);
    expect(await isQiAllowed('Granted@Example.com')).toBe(true);
    expect(await isQiAllowed('other@example.com')).toBe(false);
    expect(await isQiAllowed('granted@example.com.evil')).toBe(false);
  });
  test('owner-only: strangers refused', async () => {
    await saveApp(db!, { ...APP, visibility: 'owner' });
    expect(await isQiAllowed('anyone@example.com')).toBe(false);
  });
  test('no app row, no database, or a broken one: refused', async () => {
    db = accessTestDb();
    expect(await isQiAllowed('anyone@example.com')).toBe(false);
    db = null;
    expect(await isQiAllowed('anyone@example.com')).toBe(false);
    db = { prepare: () => { throw new Error('boom'); }, batch: async () => [] } as unknown as D1Binding;
    expect(await isQiAllowed('anyone@example.com')).toBe(false);
  });
});
