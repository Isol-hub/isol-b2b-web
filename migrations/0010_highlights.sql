CREATE TABLE IF NOT EXISTS session_highlights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  line_index INTEGER,          -- which transcript line (NULL = session-level)
  text TEXT NOT NULL,          -- the highlighted/selected text
  category TEXT,               -- 'quote' | 'idea' | 'action' | 'event' | 'link' | NULL
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_highlights_session ON session_highlights(session_id);
