CREATE TABLE visits (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  ts        INTEGER NOT NULL,
  route     TEXT    NOT NULL,
  ip_hash   TEXT,
  country   TEXT,
  device    TEXT,
  ua        TEXT,
  referrer  TEXT,
  is_rsc    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_visits_ts ON visits(ts DESC);
CREATE INDEX idx_visits_route ON visits(route);
CREATE INDEX idx_visits_country ON visits(country);
