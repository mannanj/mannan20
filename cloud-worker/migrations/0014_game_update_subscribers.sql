CREATE TABLE IF NOT EXISTS game_update_subscribers (
  email TEXT PRIMARY KEY,
  verified INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  verified_at INTEGER
);
