import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { accessTestDb } from '@/lib/app-access-test-db';
import { grantAccess, OWNER_EMAIL, saveApp } from '@/lib/app-access';
import { signActor } from '@/lib/mcp/grant';
import type { D1Binding } from '@/lib/cf-bindings';

const ACTOR_SECRET = 'actor-secret-for-tests-only-0123456789';
let db: D1Binding;
let session: { email: string } | null = null;

mock.module('@/lib/uploads', () => ({
  UPLOAD_OWNER_EMAIL: 'hello@mannan.is',
  uploadsEnv: () => ({ UPLOADS_DB: db }),
}));
mock.module('@/lib/site-session', () => ({
  readSiteSession: async () => (session ? { ...session, role: 'user', admin: false, exp: 2 ** 40 } : null),
}));

const apps = await import('./apps/route');
const check = await import('./check/route');
const grants = await import('./grants/route');
const catalog = await import('./catalog/route');

const ORIGIN = 'https://mannan.is';
const ALICE = 'alice@example.com';
const BOB = 'bob@example.com';

function req(path: string, init: { method?: string; bearer?: string; body?: unknown; origin?: string | null; site?: string } = {}) {
  const headers: Record<string, string> = {};
  if (init.bearer !== undefined) headers.authorization = `Bearer ${init.bearer}`;
  if (init.body !== undefined) headers['content-type'] = 'application/json';
  if (init.origin !== null) headers.origin = init.origin ?? ORIGIN;
  if (init.site) headers['sec-fetch-site'] = init.site;
  return new Request(`${ORIGIN}${path}`, { method: init.method ?? 'GET', headers, body: init.body === undefined ? undefined : JSON.stringify(init.body) });
}
const actor = (email: string, secret = ACTOR_SECRET) => signActor({ sub: email, email }, secret);
const as = (email: string | null) => { session = email ? { email } : null; };

beforeEach(async () => {
  process.env.UPLOADS_MCP_ACTOR_SECRET = ACTOR_SECRET;
  db = accessTestDb();
  as(null);
  await saveApp(db, { id: 'garden', name: 'Garden', description: '', url: 'https://mannan.is/garden', visibility: 'public' });
  await saveApp(db, { id: 'blink', name: 'Blink', description: '', url: 'https://mannan.is/blink', visibility: 'granted' });
  await saveApp(db, { id: 'secret', name: 'Secret', description: '', url: 'https://mannan.is/secret', visibility: 'owner' });
  await grantAccess(db, 'blink', ALICE, OWNER_EMAIL);
});

const appIds = async (res: Response) => ((await res.json()) as { apps: { id: string }[] }).apps.map((a) => a.id).sort();

describe('GET /api/access/apps', () => {
  test('no identity: 401, no list', async () => {
    expect((await apps.GET(req('/api/access/apps'))).status).toBe(401);
  });
  test('session: public + own grants; owner: all, with visibility', async () => {
    as(ALICE); expect(await appIds(await apps.GET(req('/api/access/apps')))).toEqual(['blink', 'garden']);
    as(BOB); expect(await appIds(await apps.GET(req('/api/access/apps')))).toEqual(['garden']);
    as(OWNER_EMAIL);
    const body = (await (await apps.GET(req('/api/access/apps'))).json()) as { apps: { id: string; visibility?: string }[] };
    expect(body.apps.map((a) => a.id).sort()).toEqual(['blink', 'garden', 'secret']);
    expect(body.apps.every((a) => a.visibility)).toBe(true);
  });
  test('non-owners are not told how an app is gated', async () => {
    as(ALICE);
    const body = (await (await apps.GET(req('/api/access/apps'))).json()) as { apps: Record<string, unknown>[] };
    expect(body.apps.some((a) => 'visibility' in a)).toBe(false);
  });
  test('MCP actor token: the actor\'s own view', async () => {
    expect(await appIds(await apps.GET(req('/api/access/apps', { bearer: await actor(ALICE) })))).toEqual(['blink', 'garden']);
    expect(await appIds(await apps.GET(req('/api/access/apps', { bearer: await actor(OWNER_EMAIL) })))).toEqual(['blink', 'garden', 'secret']);
  });
  test('a forged, expired-format or empty bearer is refused, and never falls back to the cookie', async () => {
    as(OWNER_EMAIL);
    for (const bearer of ['', 'nope', `${await actor(OWNER_EMAIL, 'another-secret-entirely-0123456789')}`, (await actor(ALICE)).replace(/.$/, 'x')]) {
      expect((await apps.GET(req('/api/access/apps', { bearer }))).status).toBe(401);
    }
  });
  test('a tampered actor payload (email swapped to the owner) is refused', async () => {
    const [, sig] = (await actor(ALICE)).split('.');
    const forged = Buffer.from(JSON.stringify({ sub: OWNER_EMAIL, email: OWNER_EMAIL, exp: 2 ** 40, nonce: 'x' })).toString('base64url');
    expect((await apps.GET(req('/api/access/apps', { bearer: `${forged}.${sig}` }))).status).toBe(401);
  });
  test('no actor secret configured: every bearer refused', async () => {
    const token = await actor(OWNER_EMAIL);
    delete process.env.UPLOADS_MCP_ACTOR_SECRET;
    expect((await apps.GET(req('/api/access/apps', { bearer: token }))).status).toBe(401);
  });
});

describe('GET /api/access/check', () => {
  const run = (app: string, bearer?: string) => check.GET(req(`/api/access/check?app=${encodeURIComponent(app)}`, { bearer }));
  test('granted, public, owner-only, unknown', async () => {
    as(ALICE);
    expect((await run('blink')).status).toBe(200);
    expect((await run('garden')).status).toBe(200);
    expect((await run('secret')).status).toBe(403);
    expect((await run('nope')).status).toBe(403);
    as(BOB); expect((await run('blink')).status).toBe(403);
    as(OWNER_EMAIL); expect((await run('secret')).status).toBe(200);
  });
  test('not signed in: 401; malformed app id: 400', async () => {
    expect((await run('blink')).status).toBe(401);
    as(ALICE); expect((await run('../blink')).status).toBe(400);
    expect((await check.GET(req('/api/access/check'))).status).toBe(400);
  });
  test('session only: an actor token, even the owner\'s, is refused', async () => {
    expect((await run('blink', await actor(OWNER_EMAIL))).status).toBe(401);
    as(ALICE); expect((await run('blink', await actor(ALICE))).status).toBe(401);
  });
});

describe('/api/access/grants and /catalog: Mannan only', () => {
  const post = (body: unknown, o: Parameters<typeof req>[1] = {}) => grants.POST(req('/api/access/grants', { method: 'POST', body, ...o }));
  test('strangers and granted people cannot grant, revoke, list or edit the catalog', async () => {
    for (const who of [ALICE, BOB]) {
      as(who);
      expect((await post({ app: 'blink', email: BOB })).status).toBe(403);
      expect((await grants.DELETE(req('/api/access/grants', { method: 'DELETE', body: { app: 'blink', email: ALICE } }))).status).toBe(403);
      expect((await grants.GET(req('/api/access/grants'))).status).toBe(403);
      expect((await catalog.PUT(req('/api/access/catalog', { method: 'PUT', body: { id: 'secret', name: 'S', url: 'https://mannan.is/s', visibility: 'public' } }))).status).toBe(403);
      expect((await catalog.DELETE(req('/api/access/catalog', { method: 'DELETE', body: { id: 'blink' } }))).status).toBe(403);
      expect((await catalog.GET(req('/api/access/catalog'))).status).toBe(403);
    }
    as(null);
    expect((await post({ app: 'blink', email: BOB })).status).toBe(401);
    // Nothing changed.
    as(BOB); expect((await check.GET(req('/api/access/check?app=blink'))).status).toBe(403);
    as(ALICE); expect((await check.GET(req('/api/access/check?app=blink'))).status).toBe(200);
    as(BOB); expect((await check.GET(req('/api/access/check?app=secret'))).status).toBe(403);
  });
  test('a non-owner actor token cannot grant, lookalikes of the owner included', async () => {
    for (const who of [ALICE, 'hello@mannan.is.evil.com', 'mannan@example.com', 'xhello@mannan.is']) {
      expect((await post({ app: 'blink', email: BOB }, { bearer: await actor(who) })).status).toBe(403);
    }
  });
  test('owner session: grant then revoke, and the check follows', async () => {
    as(OWNER_EMAIL);
    expect((await post({ app: 'blink', email: BOB })).status).toBe(200);
    as(BOB); expect((await check.GET(req('/api/access/check?app=blink'))).status).toBe(200);
    as(OWNER_EMAIL);
    expect((await grants.DELETE(req('/api/access/grants', { method: 'DELETE', body: { app: 'blink', email: BOB } }))).status).toBe(200);
    as(BOB); expect((await check.GET(req('/api/access/check?app=blink'))).status).toBe(403);
  });
  test('owner session from another site (cross-site or missing origin) cannot mutate', async () => {
    as(OWNER_EMAIL);
    expect((await post({ app: 'blink', email: BOB }, { origin: 'https://evil.example' })).status).toBe(403);
    expect((await post({ app: 'blink', email: BOB }, { origin: null })).status).toBe(403);
    expect((await post({ app: 'blink', email: BOB }, { site: 'cross-site' })).status).toBe(403);
    expect((await catalog.PUT(req('/api/access/catalog', { method: 'PUT', origin: 'https://evil.example', body: { id: 'x', name: 'X', url: 'https://mannan.is/x', visibility: 'public' } }))).status).toBe(403);
    as(BOB); expect((await check.GET(req('/api/access/check?app=blink'))).status).toBe(403);
  });
  test('owner actor token (the MCP) can grant without an origin', async () => {
    expect((await post({ app: 'blink', email: BOB }, { bearer: await actor(OWNER_EMAIL), origin: null })).status).toBe(200);
  });
  test('bad bodies are 400, not grants', async () => {
    as(OWNER_EMAIL);
    for (const body of [{}, { app: 'blink' }, { app: 'blink', email: 'nope' }, { app: 'garden', email: BOB }, { app: 'secret', email: BOB }, { app: ['blink'], email: BOB }]) {
      expect((await post(body)).status).toBe(400);
    }
    as(BOB); expect((await check.GET(req('/api/access/check?app=secret'))).status).toBe(403);
  });
  test('catalog: owner can add an app and change who sees it', async () => {
    as(OWNER_EMAIL);
    expect((await catalog.PUT(req('/api/access/catalog', { method: 'PUT', body: { id: 'secret', name: 'Secret', url: 'https://mannan.is/secret', visibility: 'public' } }))).status).toBe(200);
    as(BOB); expect((await check.GET(req('/api/access/check?app=secret'))).status).toBe(200);
    as(OWNER_EMAIL);
    expect((await catalog.PUT(req('/api/access/catalog', { method: 'PUT', body: { id: 'secret', name: 'Secret', url: 'javascript:alert(1)', visibility: 'public' } }))).status).toBe(400);
    expect((await catalog.DELETE(req('/api/access/catalog', { method: 'DELETE', body: { id: 'blink' } }))).status).toBe(200);
    as(ALICE); expect((await check.GET(req('/api/access/check?app=blink'))).status).toBe(403);
  });
});
