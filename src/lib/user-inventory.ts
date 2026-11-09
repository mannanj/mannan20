import type { D1Binding } from '@/lib/cf-bindings';
import { maxFor } from '@/components/inventory/items';

export interface BagEntry {
  id: string;
  count: number;
}

export const ITEM_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
export const MAX_ITEMS_PER_REQUEST = 64;
export const MAX_ITEM_COUNT = 1000;
export const MAX_SCORE = 1_000_000_000;
export const GAME_IDS = ['chicken-v3'] as const;
export type GameId = (typeof GAME_IDS)[number];

type MaxFor = (id: string) => number;

const clampCount = (count: number, cap: number) => Math.max(0, Math.min(Math.floor(count), cap));

export function mergeMax(local: readonly BagEntry[], server: readonly BagEntry[], max: MaxFor = maxFor): BagEntry[] {
  const merged = new Map<string, number>();
  for (const { id, count } of [...local, ...server]) {
    merged.set(id, Math.max(merged.get(id) ?? 0, clampCount(count, max(id))));
  }
  return [...merged].filter(([, count]) => count > 0).map(([id, count]) => ({ id, count }));
}

export const isGameId = (v: unknown): v is GameId => typeof v === 'string' && (GAME_IDS as readonly string[]).includes(v);

export function parseBagEntries(v: unknown): BagEntry[] | null {
  if (!Array.isArray(v) || v.length > MAX_ITEMS_PER_REQUEST) return null;
  const out: BagEntry[] = [];
  for (const entry of v as unknown[]) {
    if (typeof entry !== 'object' || entry === null) return null;
    const { id, count } = entry as Record<string, unknown>;
    if (typeof id !== 'string' || !ITEM_ID_PATTERN.test(id)) return null;
    if (typeof count !== 'number' || !Number.isInteger(count) || count < 1 || count > MAX_ITEM_COUNT) return null;
    out.push({ id, count });
  }
  return out;
}

export async function getInventory(db: D1Binding, email: string): Promise<BagEntry[]> {
  const { results } = await db
    .prepare('SELECT item_id AS id, count FROM user_inventory WHERE email = ? AND count > 0 ORDER BY item_id')
    .bind(email)
    .all<BagEntry>();
  return results;
}

export async function mergeInventory(db: D1Binding, email: string, items: readonly BagEntry[], max: MaxFor = maxFor): Promise<BagEntry[]> {
  const now = Date.now();
  const statements = items.map(({ id, count }) =>
    db
      .prepare(
        `INSERT INTO user_inventory (email, item_id, count, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT (email, item_id) DO UPDATE SET
           count = MIN(?, MAX(user_inventory.count, excluded.count)),
           updated_at = excluded.updated_at`,
      )
      .bind(email, id, clampCount(count, max(id)), now, max(id)),
  );
  if (statements.length > 0) await db.batch(statements);
  return getInventory(db, email);
}

export async function decrementItem(db: D1Binding, email: string, id: string): Promise<BagEntry[]> {
  await db
    .prepare('UPDATE user_inventory SET count = MAX(count - 1, 0), updated_at = ? WHERE email = ? AND item_id = ?')
    .bind(Date.now(), email, id)
    .run();
  await db.prepare('DELETE FROM user_inventory WHERE email = ? AND item_id = ? AND count <= 0').bind(email, id).run();
  return getInventory(db, email);
}

export async function getScore(db: D1Binding, email: string, game: GameId): Promise<number> {
  const row = await db.prepare('SELECT score FROM game_progress WHERE email = ? AND game = ?').bind(email, game).first<{ score: number }>();
  return row?.score ?? 0;
}

export async function mergeScore(db: D1Binding, email: string, game: GameId, score: number): Promise<number> {
  const safe = Math.max(0, Math.min(Math.floor(score), MAX_SCORE));
  await db
    .prepare(
      `INSERT INTO game_progress (email, game, score, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT (email, game) DO UPDATE SET
         score = MAX(game_progress.score, excluded.score),
         updated_at = excluded.updated_at`,
    )
    .bind(email, game, safe, Date.now())
    .run();
  return getScore(db, email, game);
}
