CREATE TABLE download_tickets (
  id TEXT PRIMARY KEY,
  manifest TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX download_tickets_expires_idx ON download_tickets(expires_at);
