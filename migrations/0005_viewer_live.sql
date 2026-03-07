-- Viewer live-session comments (keyed by WSS session UUID, no auth required)
CREATE TABLE IF NOT EXISTS viewer_comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT    NOT NULL,
  author     TEXT    NOT NULL DEFAULT 'Anonymous',
  body       TEXT    NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_viewer_comments_session ON viewer_comments(session_id);

-- Host line edits broadcast to all viewers of a live session
CREATE TABLE IF NOT EXISTS session_edits (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT    NOT NULL,
  line_index INTEGER NOT NULL,
  text       TEXT    NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(session_id, line_index) ON CONFLICT REPLACE
);
CREATE INDEX IF NOT EXISTS idx_session_edits_session ON session_edits(session_id);
