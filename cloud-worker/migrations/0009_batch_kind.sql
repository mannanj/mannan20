ALTER TABLE upload_batches ADD COLUMN kind TEXT NOT NULL DEFAULT 'page';
CREATE INDEX upload_batches_kind_idx ON upload_batches(owner_email, kind, deleted_at);
