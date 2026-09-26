CREATE TABLE upload_batches (
  id TEXT PRIMARY KEY,
  owner_email TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE INDEX upload_batches_owner_idx ON upload_batches(owner_email, deleted_at, created_at);

CREATE TABLE upload_files (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  object_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE INDEX upload_files_batch_idx ON upload_files(batch_id, deleted_at, created_at);
