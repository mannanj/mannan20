import { createExecutionContext, env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { drops } from '../src/drops/routes';

const BEARER = { authorization: 'Bearer test-bearer-secret', 'content-type': 'application/json' };
let requestSeq = 0;
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  drops.request(
    path,
    { method: 'POST', headers: { ...BEARER, 'x-site-auth-ip': `10.0.0.${requestSeq++}`, ...headers }, body: JSON.stringify(body) },
    env,
    createExecutionContext(),
  );
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

  async function joinOpen(id: string) {
    const r = await post(`/${id}/join`, { name: 'Ann' });
    return (await r.json<{ token: string; participant_id: string }>());
  }

  it('presign signs a PUT URL when policy passes and scopes the key to the participant', async () => {
    const { id } = await (await post('/', { access_mode: 'open', require_name: true, max_file_bytes: 1024 ** 3 })).json<{ id: string }>();
    const { token, participant_id } = await joinOpen(id);
    const res = await post(`/${id}/presign`, { filename: 'photo.jpg', size: 5_000_000, type: 'image/jpeg' }, { 'x-drop-participant': token });
    expect(res.status).toBe(200);
    const out = await res.json<{ url: string; key: string }>();
    expect(out.key.endsWith('-photo.jpg')).toBe(true);
    expect(out.key.startsWith(`drops/${id}/${participant_id}/`)).toBe(true);
    expect(new URL(out.url).searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
  });
  it('presign refuses an oversize file (policy: too-large) without signing', async () => {
    const { id } = await (await post('/', { access_mode: 'open', require_name: false, max_file_bytes: 1_000_000 })).json<{ id: string }>();
    const { token } = await joinOpen(id);
    const res = await post(`/${id}/presign`, { filename: 'big.bin', size: 2_000_000, type: 'application/octet-stream' }, { 'x-drop-participant': token });
    expect(res.status).toBe(422);
    expect((await res.json<{ error: string }>()).error).toBe('too-large');
  });
  it('presign rejects a request with no/invalid participant token', async () => {
    const { id } = await (await post('/', { access_mode: 'open', require_name: false })).json<{ id: string }>();
    expect((await post(`/${id}/presign`, { filename: 'a', size: 1, type: 't' })).status).toBe(401);
  });

  it('commit reads the TRUE size from R2 and rejects a spoofed oversize object, deleting it', async () => {
    const { id } = await (await post('/', { access_mode: 'open', require_name: false, max_file_bytes: 1_000_000, hold_for_approval: false, notify_on_activity: false })).json<{ id: string }>();
    const { token, participant_id } = await joinOpen(id);
    const key = `drops/${id}/${participant_id}/spoof.bin`;
    await env.FILES_DROPS.put(key, new Uint8Array(2_000_000));
    const res = await post(`/${id}/commit`, { key, filename: 'spoof.bin' }, { 'x-drop-participant': token });
    expect(res.status).toBe(422);
    expect((await res.json<{ error: string }>()).error).toBe('too-large');
    expect(await env.FILES_DROPS.head(key)).toBeNull();
    expect((await env.DB.prepare('SELECT used_bytes FROM shares WHERE id = ?').bind(id).first<{ used_bytes: number }>())?.used_bytes).toBe(0);
  });
  it('commit on a hold-for-approval drop records the upload as PENDING and counts its bytes', async () => {
    const { id } = await (await post('/', { access_mode: 'open', require_name: false, max_file_bytes: 1024 ** 3, hold_for_approval: true, notify_on_activity: false })).json<{ id: string }>();
    const { token, participant_id } = await joinOpen(id);
    const key = `drops/${id}/${participant_id}/ok.bin`;
    await env.FILES_DROPS.put(key, new Uint8Array(500_000));
    const res = await post(`/${id}/commit`, { key, filename: 'ok.bin' }, { 'x-drop-participant': token });
    expect(res.status).toBe(200);
    expect((await res.json<{ status: string }>()).status).toBe('pending');
    const ev = await env.DB.prepare("SELECT status, bytes FROM share_events WHERE share_id = ?").bind(id).first<{ status: string; bytes: number }>();
    expect(ev).toEqual({ status: 'pending', bytes: 500_000 });
    expect((await env.DB.prepare('SELECT used_bytes FROM shares WHERE id = ?').bind(id).first<{ used_bytes: number }>())?.used_bytes).toBe(500_000);
  });
  it('commit auto-accepts when hold_for_approval is off', async () => {
    const { id } = await (await post('/', { access_mode: 'open', require_name: false, max_file_bytes: 1024 ** 3, hold_for_approval: false, notify_on_activity: false })).json<{ id: string }>();
    const { token, participant_id } = await joinOpen(id);
    const key = `drops/${id}/${participant_id}/auto.bin`;
    await env.FILES_DROPS.put(key, new Uint8Array(1000));
    expect((await (await post(`/${id}/commit`, { key, filename: 'auto.bin' }, { 'x-drop-participant': token })).json<{ status: string }>()).status).toBe('accepted');
  });

  it('commit is idempotent by object key — a second commit of the same key does not double-count', async () => {
    const { id } = await (await post('/', { access_mode: 'open', require_name: false, max_file_bytes: 1024 ** 3, hold_for_approval: true, notify_on_activity: false })).json<{ id: string }>();
    const { token, participant_id } = await joinOpen(id);
    const key = `drops/${id}/${participant_id}/dup.bin`;
    await env.FILES_DROPS.put(key, new Uint8Array(500));
    const first = await post(`/${id}/commit`, { key, filename: 'dup.bin' }, { 'x-drop-participant': token });
    expect(first.status).toBe(200);
    const firstEventId = (await first.json<{ event_id: string }>()).event_id;

    const second = await post(`/${id}/commit`, { key, filename: 'dup.bin' }, { 'x-drop-participant': token });
    expect(second.status).toBe(200);
    const secondEventId = (await second.json<{ event_id: string }>()).event_id;

    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM share_events WHERE share_id = ?').bind(id).first<{ n: number }>();
    expect(count?.n).toBe(1);
    const used = await env.DB.prepare('SELECT used_bytes FROM shares WHERE id = ?').bind(id).first<{ used_bytes: number }>();
    expect(used?.used_bytes).toBe(500);
    expect(secondEventId).toBe(firstEventId);
  });

  it('commit rejects a non-string filename with 400', async () => {
    const { id } = await (await post('/', { access_mode: 'open', require_name: false, max_file_bytes: 1024 ** 3, hold_for_approval: false, notify_on_activity: false })).json<{ id: string }>();
    const { token, participant_id } = await joinOpen(id);
    const key = `drops/${id}/${participant_id}/badname.bin`;
    await env.FILES_DROPS.put(key, new Uint8Array(100));
    const res = await post(`/${id}/commit`, { key, filename: 123 }, { 'x-drop-participant': token });
    expect(res.status).toBe(400);
  });
});
