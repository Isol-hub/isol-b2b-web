-- Team members for workspace collaboration
CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_slug TEXT NOT NULL,
  member_email   TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'member',   -- 'member' only; owner is workspaces.owner_email
  status         TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'active'
  join_token     TEXT,
  invited_at     INTEGER NOT NULL,
  joined_at      INTEGER,
  PRIMARY KEY (workspace_slug, member_email)
) WITHOUT ROWID;

-- API key for REST integrations (team plan)
ALTER TABLE workspaces ADD COLUMN api_key TEXT;
