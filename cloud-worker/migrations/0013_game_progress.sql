CREATE TABLE IF NOT EXISTS user_inventory (
  email TEXT NOT NULL,
  item_id TEXT NOT NULL,
  count INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (email, item_id)
);

CREATE TABLE IF NOT EXISTS game_progress (
  email TEXT NOT NULL,
  game TEXT NOT NULL,
  score INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (email, game)
);
