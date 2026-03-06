-- Workspace glossary terms
CREATE TABLE IF NOT EXISTS glossary_terms (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_slug TEXT NOT NULL,
  term         TEXT NOT NULL,
  note         TEXT,
  added_at     INTEGER NOT NULL,
  UNIQUE(workspace_slug, term)
);

-- Session titles (run once — ALTER TABLE does not support IF NOT EXISTS in SQLite)
ALTER TABLE sessions ADD COLUMN title TEXT;
