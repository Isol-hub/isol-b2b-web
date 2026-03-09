-- Full-text search over transcript lines
CREATE VIRTUAL TABLE IF NOT EXISTS sessions_fts USING fts5(
  session_id UNINDEXED,
  text,
  content='transcript_lines',
  content_rowid='id'
);

-- Backfill existing transcript lines
INSERT INTO sessions_fts(rowid, session_id, text)
  SELECT id, session_id, text FROM transcript_lines;

-- Keep FTS in sync on new inserts
CREATE TRIGGER IF NOT EXISTS sessions_fts_insert
AFTER INSERT ON transcript_lines BEGIN
  INSERT INTO sessions_fts(rowid, session_id, text)
  VALUES (new.id, new.session_id, new.text);
END;
