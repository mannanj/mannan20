const SCHEMA_VERSION = 1;

export function initializeSchema(sql: SqlStorage): void {
  sql.exec(`
    CREATE TABLE IF NOT EXISTS _sql_schema_migrations (
      id INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const currentVersion = sql
    .exec<{ version: number }>(
      'SELECT COALESCE(MAX(id), 0) AS version FROM _sql_schema_migrations',
    )
    .one().version;

  if (currentVersion >= SCHEMA_VERSION) return;

  sql.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL,
      last_seen_at INTEGER,
      revoked_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS enrollments (
      id TEXT PRIMARY KEY,
      secret_hash TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      consumed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS socket_tickets (
      id TEXT PRIMARY KEY,
      secret_hash TEXT NOT NULL UNIQUE,
      project_id TEXT NOT NULL CHECK (project_id = 'meet'),
      viewer_expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      consumed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS events (
      sequence INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT NOT NULL UNIQUE,
      source_session_id TEXT NOT NULL,
      source_cursor INTEGER NOT NULL,
      kind TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      summary TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS events_source_order
      ON events(source_session_id, source_cursor);
    CREATE INDEX IF NOT EXISTS events_expiry
      ON events(expires_at);

    CREATE TABLE IF NOT EXISTS project_snapshots (
      project_id TEXT PRIMARY KEY CHECK (project_id = 'meet'),
      sequence INTEGER NOT NULL,
      snapshot_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    INSERT INTO _sql_schema_migrations (id) VALUES (1);
  `);
}
