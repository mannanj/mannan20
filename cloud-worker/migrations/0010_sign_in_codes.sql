ALTER TABLE magic_tokens ADD COLUMN code_hash TEXT;
ALTER TABLE magic_tokens ADD COLUMN code_attempts INTEGER NOT NULL DEFAULT 0;

CREATE TABLE sign_in_code_failures (
  email TEXT NOT NULL,
  failed_at INTEGER NOT NULL
);

CREATE INDEX sign_in_code_failures_email_idx ON sign_in_code_failures(email, failed_at);
