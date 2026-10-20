import { beforeEach, describe, expect, test } from 'bun:test';
import type { D1Binding } from '@/lib/cf-bindings';
import { accessTestDb as d1 } from './app-access-test-db';
import {
  OWNER_EMAIL, canOpen, grantAccess, listGrants, normalizeEmail, parseApp, removeApp, revokeAccess, saveApp, visibleApps,
} from './app-access';

const ALICE = 'alice@example.com';
const BOB = 'bob@example.com';
let db: D1Binding;

beforeEach(async () => {
  db = d1();
  await saveApp(db, { id: 'garden', name: 'Garden', description: 'Writing', url: 'https://mannan.is/garden', visibility: 'public' });
  await saveApp(db, { id: 'blink', name: 'Blink', description: '', url: 'https://mannan.is/blink', visibility: 'granted' });
  await saveApp(db, { id: 'demo', name: 'Demo', description: '', url: 'https://mannan.is/demo', visibility: 'granted' });
  await saveApp(db, { id: 'secret', name: 'Secret', description: '', url: 'https://mannan.is/secret', visibility: 'owner' });
  expect((await grantAccess(db, 'blink', ALICE, OWNER_EMAIL)).ok).toBe(true);
});

const ids = async (email: string | null) => (await visibleApps(db, email)).map((a) => a.id).sort();

describe('visibleApps', () => {
  test('guests and strangers see only public apps', async () => {
    expect(await ids(null)).toEqual(['garden']);
    expect(await ids(BOB)).toEqual(['garden']);
  });
  test('a granted person sees public apps plus their grants, nothing else', async () => {
    expect(await ids(ALICE)).toEqual(['blink', 'garden']);
  });
  test('Mannan sees everything, any capitalisation', async () => {
    expect(await ids(OWNER_EMAIL)).toEqual(['blink', 'demo', 'garden', 'secret']);
    expect(await ids(' Hello@Mannan.IS ')).toEqual(['blink', 'demo', 'garden', 'secret']);
  });
  test('email matching is exact: case folds, but lookalikes and padding tricks do not match', async () => {
    expect(await ids('ALICE@example.com')).toEqual(['blink', 'garden']);
    for (const e of ['alice@example.com.evil', 'xalice@example.com', 'alice@example.co', "alice@example.com' OR '1'='1", '%', 'alice%']) {
      expect(await ids(e)).toEqual(['garden']);
    }
    expect(await ids('hello@mannan.is.evil.com')).toEqual(['garden']);
  });
  test('a grant on an owner-only app (set before it was made owner-only) shows nothing', async () => {
    await saveApp(db, { id: 'blink', name: 'Blink', description: '', url: 'https://mannan.is/blink', visibility: 'owner' });
    expect(await ids(ALICE)).toEqual(['garden']);
    expect(await canOpen(db, ALICE, 'blink')).toBe(false);
  });
});

describe('canOpen', () => {
  test('owner: everything, even apps not in the catalog', async () => {
    for (const app of ['garden', 'blink', 'demo', 'secret', 'not-listed']) expect(await canOpen(db, OWNER_EMAIL, app)).toBe(true);
    expect(await canOpen(db, ' Hello@Mannan.IS ', 'secret')).toBe(true);
    expect(await canOpen(db, 'hello@mannan.is.evil.com', 'secret')).toBe(false);
  });
  test('granted person: public + their grants only', async () => {
    expect(await canOpen(db, ALICE, 'blink')).toBe(true);
    expect(await canOpen(db, ALICE, 'garden')).toBe(true);
    expect(await canOpen(db, ALICE, 'demo')).toBe(false);
    expect(await canOpen(db, ALICE, 'secret')).toBe(false);
  });
  test('stranger, guest, and unknown or malformed app ids are closed', async () => {
    expect(await canOpen(db, BOB, 'blink')).toBe(false);
    expect(await canOpen(db, null, 'blink')).toBe(false);
    expect(await canOpen(db, null, 'garden')).toBe(true);
    for (const app of ['nope', '', 'BLINK', 'blink ', '../blink', "blink' OR '1'='1", 'a'.repeat(41)]) {
      expect(await canOpen(db, ALICE, app)).toBe(false);
    }
  });
  test('a revoked grant closes the app at once', async () => {
    expect(await revokeAccess(db, 'blink', 'ALICE@example.com')).toBe(true);
    expect(await canOpen(db, ALICE, 'blink')).toBe(false);
    expect(await ids(ALICE)).toEqual(['garden']);
    expect(await revokeAccess(db, 'blink', ALICE)).toBe(false);
  });
  test('removing an app removes its grants (re-adding it does not bring them back)', async () => {
    expect(await removeApp(db, 'blink')).toBe(true);
    expect(await listGrants(db, 'blink')).toEqual([]);
    await saveApp(db, { id: 'blink', name: 'Blink', description: '', url: 'https://mannan.is/blink', visibility: 'granted' });
    expect(await canOpen(db, ALICE, 'blink')).toBe(false);
  });
});

describe('grantAccess', () => {
  test('only on granted apps; not on public, owner-only or unknown ones', async () => {
    expect((await grantAccess(db, 'garden', BOB, OWNER_EMAIL)).ok).toBe(false);
    expect((await grantAccess(db, 'secret', BOB, OWNER_EMAIL)).ok).toBe(false);
    expect((await grantAccess(db, 'nope', BOB, OWNER_EMAIL)).ok).toBe(false);
    expect(await canOpen(db, BOB, 'secret')).toBe(false);
  });
  test('rejects non-emails and normalises the rest; granting twice is harmless', async () => {
    for (const e of ['', 'bob', 'bob@', '@x.com', 'bob@x', 'a b@x.com', 'x'.repeat(250) + '@x.com']) {
      expect((await grantAccess(db, 'demo', e, OWNER_EMAIL)).ok).toBe(false);
    }
    expect(await grantAccess(db, 'demo', '  Bob@Example.com ', OWNER_EMAIL)).toMatchObject({ ok: true, value: { email: BOB } });
    expect((await grantAccess(db, 'demo', BOB, OWNER_EMAIL)).ok).toBe(true);
    expect((await listGrants(db, 'demo')).map((g) => g.email)).toEqual([BOB]);
  });
  test('a grant is per app', async () => {
    await grantAccess(db, 'demo', BOB, OWNER_EMAIL);
    expect(await canOpen(db, BOB, 'demo')).toBe(true);
    expect(await canOpen(db, BOB, 'blink')).toBe(false);
  });
});

describe('parseApp', () => {
  const ok = { id: 'demo', name: 'Demo', url: 'https://mannan.is/demo', visibility: 'granted' as const };
  test('accepts a well-formed app', () => {
    expect(parseApp(ok)).toEqual({ ok: true, value: { ...ok, description: '' } });
  });
  test('rejects bad ids, urls and visibilities', () => {
    for (const bad of [
      { ...ok, id: 'Demo' } as Record<string, unknown>, { ...ok, id: '-demo' }, { ...ok, id: 'a/b' }, { ...ok, id: '' },
      { ...ok, url: 'http://mannan.is/demo' }, { ...ok, url: 'javascript:alert(1)' }, { ...ok, url: 'https://u:p@mannan.is' }, { ...ok, url: 'not a url' },
      { ...ok, visibility: 'members' }, { ...ok, visibility: undefined }, { ...ok, name: '' }, { ...ok, sort: -1 }, { ...ok, sort: 1.5 },
    ]) expect(parseApp(bad).ok).toBe(false);
  });
});

test('normalizeEmail', () => {
  expect(normalizeEmail(' A@B.co ')).toBe('a@b.co');
  expect(normalizeEmail('nope')).toBeNull();
  expect(normalizeEmail(42)).toBeNull();
});
