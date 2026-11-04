-- Sessions the site refuses before they expire. A session is a signed cookie
-- with no store behind it, so this is what lets one be ended from elsewhere
-- (the calendar's remote sign-out). Only a SHA-256 of the cookie value is kept.
-- A row is pointless once expires_at passes, and can then be cleared.
CREATE TABLE IF NOT EXISTS revoked_site_session (
  session_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  revoked_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_by TEXT NOT NULL
);

-- "Sign out everywhere": every session this account was issued before
-- not_before (ms) is refused. One row per account, so it covers sessions nothing
-- ever recorded.
CREATE TABLE IF NOT EXISTS session_cutoff (
  email TEXT PRIMARY KEY,
  not_before INTEGER NOT NULL,
  revoked_by TEXT NOT NULL
);
