ALTER TABLE users ADD COLUMN account_id TEXT;
ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'pending_consent'));

UPDATE users
SET account_id = lower(hex(randomblob(16)))
WHERE account_id IS NULL;

CREATE UNIQUE INDEX users_account_id_idx ON users(account_id);

ALTER TABLE magic_tokens ADD COLUMN return_path TEXT NOT NULL DEFAULT '/';
ALTER TABLE site_session_codes ADD COLUMN return_path TEXT NOT NULL DEFAULT '/';

CREATE TABLE legal_acceptances (
  account_id TEXT NOT NULL,
  terms_version TEXT NOT NULL,
  privacy_version TEXT NOT NULL,
  accepted_at INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('first_account_sign_in')),
  PRIMARY KEY (account_id, terms_version, privacy_version),
  FOREIGN KEY (account_id) REFERENCES users(account_id)
);

CREATE INDEX legal_acceptances_account_idx
  ON legal_acceptances(account_id, accepted_at DESC);
