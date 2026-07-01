import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

describe('0003_drops schema', () => {
  it('creates shares, share_participants, share_events with a working round-trip', async () => {
    const now = Date.now();
    await env.DB.prepare(
      `INSERT INTO shares (id, owner_email, direction, access_mode, require_name, single_use,
        hold_for_approval, participants_visible, notify_on_activity, r2_prefix, used_bytes, status, created_at)
       VALUES ('share_abc', 'hello@mannan.is', 'collect', 'passcode', 1, 0, 1, 0, 1, 'drops/share_abc/', 0, 'active', ?)`,
    ).bind(now).run();

    const share = await env.DB.prepare('SELECT id, status, used_bytes FROM shares WHERE id = ?').bind('share_abc').first<{ id: string; status: string; used_bytes: number }>();
    expect(share).toEqual({ id: 'share_abc', status: 'active', used_bytes: 0 });

    await env.DB.prepare('INSERT INTO share_participants (id, share_id, joined_at) VALUES (?,?,?)').bind('p1', 'share_abc', now).run();
    await env.DB.prepare(
      `INSERT INTO share_events (id, share_id, participant_id, kind, status, created_at) VALUES (?,?,?,?,?,?)`,
    ).bind('e1', 'share_abc', 'p1', 'upload', 'pending', now).run();

    const events = await env.DB.prepare('SELECT kind, status FROM share_events WHERE share_id = ?').bind('share_abc').all<{ kind: string; status: string }>();
    expect(events.results).toEqual([{ kind: 'upload', status: 'pending' }]);
  });
});
