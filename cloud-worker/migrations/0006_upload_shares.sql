ALTER TABLE upload_files ADD COLUMN bucket TEXT NOT NULL DEFAULT 'owner';

ALTER TABLE upload_files ADD COLUMN share_id TEXT;

ALTER TABLE upload_files ADD COLUMN uploader_name TEXT;

ALTER TABLE upload_files ADD COLUMN uploader_email TEXT;

CREATE INDEX upload_files_created_idx ON upload_files(deleted_at, status, created_at);

CREATE TABLE upload_shares (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  batch_id TEXT NOT NULL,
  file_id TEXT,
  label TEXT NOT NULL DEFAULT '',
  can_read INTEGER NOT NULL DEFAULT 0,
  can_write INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER,
  max_uploads INTEGER,
  upload_count INTEGER NOT NULL DEFAULT 0,
  max_downloads INTEGER,
  download_count INTEGER NOT NULL DEFAULT 0,
  max_bytes INTEGER,
  used_bytes INTEGER NOT NULL DEFAULT 0,
  sign_in_read INTEGER NOT NULL DEFAULT 0,
  sign_in_write INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  revoked_at INTEGER
);

CREATE INDEX upload_shares_batch_idx ON upload_shares(batch_id, revoked_at, created_at);

CREATE INDEX upload_shares_file_idx ON upload_shares(file_id);

CREATE TABLE access_requests (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  resource TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  notified INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX access_requests_created_idx ON access_requests(resource, created_at);

CREATE TABLE upload_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  actor TEXT NOT NULL,
  batch_id TEXT,
  file_id TEXT,
  share_id TEXT,
  bytes INTEGER NOT NULL DEFAULT 0,
  detail TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE INDEX upload_events_created_idx ON upload_events(created_at);

CREATE INDEX upload_events_type_idx ON upload_events(type, created_at);
