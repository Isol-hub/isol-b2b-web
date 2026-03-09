-- Workspace extensions: billing, preferences, share expiry
ALTER TABLE workspaces ADD COLUMN display_name TEXT;
ALTER TABLE workspaces ADD COLUMN default_lang TEXT DEFAULT 'it';
ALTER TABLE workspaces ADD COLUMN plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE workspaces ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE workspaces ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE workspaces ADD COLUMN plan_expires_at INTEGER;

-- Share link expiry support
ALTER TABLE sessions ADD COLUMN share_expires_at INTEGER;

-- AI usage tracking per workspace per month
CREATE TABLE IF NOT EXISTS ai_usage (
  workspace_slug TEXT NOT NULL,
  month          TEXT NOT NULL,    -- 'YYYY-MM'
  endpoint       TEXT NOT NULL,    -- 'translate'|'format'|'notes'|'define'|'title'
  count          INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (workspace_slug, month, endpoint)
) WITHOUT ROWID;

-- Session drafts for autosave/recovery (one draft per workspace at a time)
CREATE TABLE IF NOT EXISTS session_drafts (
  workspace_slug  TEXT PRIMARY KEY,
  wss_session_id  TEXT,
  target_lang     TEXT NOT NULL,
  started_at      INTEGER NOT NULL,
  lines_json      TEXT NOT NULL DEFAULT '[]',
  updated_at      INTEGER NOT NULL
);
