CREATE TABLE IF NOT EXISTS share_comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  line_index INTEGER,
  author     TEXT NOT NULL DEFAULT 'Anonymous',
  body       TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_share_comments_session ON share_comments(session_id);
