CREATE TABLE shares (
  id                   TEXT PRIMARY KEY,
  owner_email          TEXT NOT NULL,
  direction            TEXT NOT NULL,
  access_mode          TEXT NOT NULL,
  passcode_hash        TEXT,
  passcode_salt        TEXT,
  title                TEXT,
  note                 TEXT,
  require_name         INTEGER NOT NULL DEFAULT 0,
  max_participants     INTEGER,
  per_person_file_cap  INTEGER,
  single_use           INTEGER NOT NULL DEFAULT 0,
  max_file_bytes       INTEGER,
  max_total_bytes      INTEGER,
  allowed_types        TEXT,
  hold_for_approval    INTEGER NOT NULL DEFAULT 1,
  participants_visible INTEGER NOT NULL DEFAULT 0,
  notify_on_activity   INTEGER NOT NULL DEFAULT 1,
  r2_prefix            TEXT NOT NULL,
  expiry_basis         TEXT,
  expires_at           INTEGER,
  first_opened_at      INTEGER,
  used_bytes           INTEGER NOT NULL DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'active',
  created_at           INTEGER NOT NULL
);

CREATE TABLE share_participants (
  id         TEXT PRIMARY KEY,
  share_id   TEXT NOT NULL,
  email      TEXT,
  name       TEXT,
  joined_at  INTEGER NOT NULL
);
CREATE INDEX idx_participants_share ON share_participants(share_id);

CREATE TABLE share_events (
  id             TEXT PRIMARY KEY,
  share_id       TEXT NOT NULL,
  participant_id TEXT,
  kind           TEXT NOT NULL,
  object_key     TEXT,
  filename       TEXT,
  bytes          INTEGER,
  status         TEXT NOT NULL DEFAULT 'pending',
  created_at     INTEGER NOT NULL
);
CREATE INDEX idx_events_share ON share_events(share_id, created_at);
