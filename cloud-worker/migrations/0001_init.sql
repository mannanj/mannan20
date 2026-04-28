CREATE TABLE users (
  email TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'client',
  created_at INTEGER NOT NULL
);

CREATE TABLE magic_tokens (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX magic_tokens_email_idx ON magic_tokens(email);

CREATE TABLE folder_members (
  email TEXT NOT NULL,
  folder TEXT NOT NULL,
  PRIMARY KEY (email, folder)
);

CREATE INDEX folder_members_folder_idx ON folder_members(folder);
