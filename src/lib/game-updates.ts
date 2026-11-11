import type { D1Binding } from '@/lib/cf-bindings';

export type UpdatesSource = 'site' | 'leaderboard' | 'typed';

export async function subscribeToUpdates(db: D1Binding, email: string, verified: boolean, source: UpdatesSource): Promise<void> {
  const now = Date.now();
  await db
    .prepare(
      'INSERT INTO game_update_subscribers (email, verified, source, created_at, verified_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET verified = MAX(verified, excluded.verified), verified_at = COALESCE(verified_at, excluded.verified_at)'
    )
    .bind(email, verified ? 1 : 0, source, now, verified ? now : null)
    .run();
}

export async function verifyUpdatesEmail(db: D1Binding, email: string): Promise<void> {
  await db.prepare('UPDATE game_update_subscribers SET verified = 1, verified_at = COALESCE(verified_at, ?) WHERE email = ?').bind(Date.now(), email).run();
}

export async function isSubscribed(db: D1Binding, email: string): Promise<boolean> {
  const row = await db.prepare('SELECT verified FROM game_update_subscribers WHERE email = ?').bind(email).first<{ verified: number }>();
  return row !== null;
}
