import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { drops } from '../src/drops/routes';

const BEARER = { authorization: 'Bearer test-bearer-secret', 'content-type': 'application/json' };
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  drops.request(path, { method: 'POST', headers: { ...BEARER, ...headers }, body: JSON.stringify(body) }, env);
const get = (path: string, headers: Record<string, string> = {}) =>
  drops.request(path, { method: 'GET', headers: { ...BEARER, ...headers } }, env);

beforeEach(async () => {
  await env.DB.prepare('DELETE FROM share_events').run();
  await env.DB.prepare('DELETE FROM share_participants').run();
  await env.DB.prepare('DELETE FROM shares').run();
});

describe('drops routes — auth + create/list/get', () => {
  it('rejects calls without the shared-secret Bearer', async () => {
    const res = await drops.request('/', { method: 'GET' }, env);
    expect(res.status).toBe(401);
  });
  it('creates a passcode collect drop and lists it without leaking the passcode hash', async () => {
    const created = await post('/', { access_mode: 'passcode', passcode: 'open-sesame', title: 'Retreat', direction: 'collect' });
    expect(created.status).toBe(200);
    const { id } = await created.json<{ id: string }>();
    expect(id).toMatch(/^[0-9A-Za-z]{16}$/);

    const list = await (await get('/')).json<{ drops: Array<Record<string, unknown>> }>();
    expect(list.drops).toHaveLength(1);
    expect(list.drops[0]).toMatchObject({ id, title: 'Retreat', pending: 0 });
    expect(JSON.stringify(list.drops[0])).not.toContain('passcode_hash');
  });
  it('recipient GET returns safe metadata (requires_passcode, no hash) and marks first-open', async () => {
    const { id } = await (await post('/', { access_mode: 'passcode', passcode: 'pw', title: 'T' })).json<{ id: string }>();
    const view = await (await get(`/${id}`)).json<Record<string, unknown>>();
    expect(view).toMatchObject({ id, title: 'T', requires_passcode: true, status: 'active' });
    expect(JSON.stringify(view)).not.toContain('passcode_hash');
    expect(JSON.stringify(view)).not.toContain('passcode_salt');
    const row = await env.DB.prepare('SELECT first_opened_at FROM shares WHERE id = ?').bind(id).first<{ first_opened_at: number | null }>();
    expect(row?.first_opened_at).toBeGreaterThan(0);
  });
  it('rejects an invalid create (passcode mode, empty passcode)', async () => {
    expect((await post('/', { access_mode: 'passcode', passcode: '' })).status).toBe(400);
  });
  it('join rejects a wrong passcode and accepts the right one, issuing a token', async () => {
    const { id } = await (await post('/', { access_mode: 'passcode', passcode: 'right-code', require_name: true })).json<{ id: string }>();
    expect((await post(`/${id}/join`, { name: 'Ann', passcode: 'wrong-code' })).status).toBe(403);
    const ok = await post(`/${id}/join`, { name: 'Ann', passcode: 'right-code' });
    expect(ok.status).toBe(200);
    const { token, participant_id } = await ok.json<{ token: string; participant_id: string }>();
    expect(token).toContain('.');
    const p = await env.DB.prepare('SELECT name FROM share_participants WHERE id = ?').bind(participant_id).first<{ name: string }>();
    expect(p?.name).toBe('Ann');
  });
  it('join enforces require_name', async () => {
    const { id } = await (await post('/', { access_mode: 'open', require_name: true })).json<{ id: string }>();
    expect((await post(`/${id}/join`, {})).status).toBe(400);
  });
  it('join is refused once the participant cap is full', async () => {
    const { id } = await (await post('/', { access_mode: 'open', require_name: false, max_participants: 1 })).json<{ id: string }>();
    expect((await post(`/${id}/join`, {})).status).toBe(200);
    expect((await post(`/${id}/join`, {})).status).toBe(409);
  });
});
