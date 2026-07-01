import type { Env } from '../types';
import { listShares, markShareStatus } from './store';

const GRACE_MS = 7 * 86_400_000;

export async function runCleanup(env: Env, now: number): Promise<{ expired: number; purged: number }> {
  const shares = await listShares(env);
  let expired = 0;
  let purged = 0;
  for (const s of shares) {
    if (s.status === 'active' && s.expires_at !== null && now >= s.expires_at) {
      await markShareStatus(env, s.id, 'expired');
      expired++;
      continue;
    }
    if (s.status === 'expired' && s.expires_at !== null && now >= s.expires_at + GRACE_MS) {
      let cursor: string | undefined;
      do {
        const list = await env.FILES_DROPS.list({ prefix: s.r2_prefix, cursor });
        for (const obj of list.objects) await env.FILES_DROPS.delete(obj.key);
        cursor = list.truncated ? list.cursor : undefined;
      } while (cursor);
      await env.DB.prepare('DELETE FROM share_events WHERE share_id = ?').bind(s.id).run();
      await env.DB.prepare('DELETE FROM share_participants WHERE share_id = ?').bind(s.id).run();
      await env.DB.prepare('DELETE FROM shares WHERE id = ?').bind(s.id).run();
      purged++;
    }
  }
  return { expired, purged };
}
