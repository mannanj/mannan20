ALTER TABLE upload_files ADD COLUMN status TEXT NOT NULL DEFAULT 'complete';

ALTER TABLE upload_files ADD COLUMN upload_id TEXT;

CREATE INDEX upload_files_pending_idx ON upload_files(batch_id, status);
