CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  actor_email TEXT NOT NULL,
  workspace_slug TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  meta TEXT
);

CREATE INDEX idx_audit_workspace ON audit_log(workspace_slug, ts DESC);
