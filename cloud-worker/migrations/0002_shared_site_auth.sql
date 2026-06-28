ALTER TABLE magic_tokens ADD COLUMN purpose TEXT NOT NULL DEFAULT 'cloud';

CREATE INDEX magic_tokens_purpose_email_idx ON magic_tokens(purpose, email);

CREATE TABLE site_session_codes (
  code_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX site_session_codes_email_idx ON site_session_codes(email);
