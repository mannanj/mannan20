import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { runCleanup } from '../src/drops/cleanup';
import { createShare } from '../src/drops/store';
import type { ShareRow } from '../src/drops/policy';

const DAY = 86_400_000;
function share(id: string, o: Partial<ShareRow>): ShareRow {
  return {
    id, owner_email: 'hello@mannan.is', direction: 'collect', access_mode: 'open', passcode_hash: null, passcode_salt: null,
    title: null, note: null, require_name: 0, max_participants: null, per_person_file_cap: null, single_use: 0,
    max_file_bytes: null, max_total_bytes: null, allowed_types: null, hold_for_approval: 0, participants_visible: 0,
    notify_on_activity: 0, r2_prefix: `drops/${id}/`, expiry_basis: 'created', expires_at: null, first_opened_at: null,
    used_bytes: 0, status: 'active', created_at: 0, ...o,
  };
}

beforeEach(async () => {
  await env.DB.prepare('DELETE FROM share_events').run();
  await env.DB.prepare('DELETE FROM share_participants').run();
  await env.DB.prepare('DELETE FROM shares').run();
});

describe('runCleanup', () => {
  it('marks a past-expiry active drop expired', async () => {
    const now = 100 * DAY;
    await createShare(env, share('s_exp', { status: 'active', expires_at: now - 1 }));
    await createShare(env, share('s_live', { status: 'active', expires_at: now + DAY }));
    const res = await runCleanup(env, now);
    expect(res.expired).toBe(1);
    expect((await env.DB.prepare('SELECT status FROM shares WHERE id = ?').bind('s_exp').first<{ status: string }>())?.status).toBe('expired');
    expect((await env.DB.prepare('SELECT status FROM shares WHERE id = ?').bind('s_live').first<{ status: string }>())?.status).toBe('active');
  });
  it('purges objects + rows for a drop expired beyond the grace window', async () => {
    const now = 100 * DAY;
    await createShare(env, share('s_old', { status: 'expired', expires_at: now - 8 * DAY }));
    await env.FILES_DROPS.put('drops/s_old/p/old.bin', new Uint8Array(10));
    await env.DB.prepare("INSERT INTO share_events (id, share_id, kind, status, created_at) VALUES ('e','s_old','upload','accepted',1)").run();
    const res = await runCleanup(env, now);
    expect(res.purged).toBe(1);
    expect(await env.FILES_DROPS.head('drops/s_old/p/old.bin')).toBeNull();
    expect(await env.DB.prepare('SELECT id FROM shares WHERE id = ?').bind('s_old').first()).toBeNull();
    expect(await env.DB.prepare('SELECT id FROM share_events WHERE share_id = ?').bind('s_old').first()).toBeNull();
  });
});
