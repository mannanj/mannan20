-- Apps and subpages under mannan.is, and who may open each. The rows themselves
-- are added at run time (Mannan's MCP tools); none of them live in this repo.
--
-- visibility: 'public'  anyone, signed in or not
--             'granted' Mannan, plus the emails in app_access for that app
--             'owner'   Mannan only
CREATE TABLE site_apps (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'granted', 'owner')),
  sort INTEGER NOT NULL DEFAULT 100,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE app_access (
  app_id TEXT NOT NULL REFERENCES site_apps(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  granted_at INTEGER NOT NULL,
  granted_by TEXT NOT NULL,
  PRIMARY KEY (app_id, email)
);

CREATE INDEX app_access_email_idx ON app_access(email);
