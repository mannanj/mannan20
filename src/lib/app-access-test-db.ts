import { Database } from 'bun:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { D1Binding, D1PreparedStatement } from '@/lib/cf-bindings';

/** The real migration on an in-memory SQLite, behind the D1 interface the site uses. */
export function accessTestDb(): D1Binding {
  const db = new Database(':memory:');
  db.run('PRAGMA foreign_keys = ON');
  db.exec(readFileSync(join(import.meta.dir, '../../cloud-worker/migrations/0011_app_access.sql'), 'utf8'));
  const stmt = (sql: string, args: unknown[] = []): D1PreparedStatement => ({
    bind: (...values) => stmt(sql, values),
    all: async <T,>() => ({ results: db.query(sql).all(...(args as never[])) as T[] }),
    first: async <T,>() => (db.query(sql).get(...(args as never[])) as T) ?? null,
    run: async () => ({ meta: { changes: db.query(sql).run(...(args as never[])).changes } }),
  });
  return { prepare: (sql) => stmt(sql), batch: async (s) => Promise.all(s.map((x) => x.run())) };
}

