-- Backfill FTS index for transcript lines inserted before migration 0008
-- or missed due to replication lag. Idempotent: skips already-indexed rows.
INSERT INTO sessions_fts(rowid, session_id, text)
SELECT id, session_id, text FROM transcript_lines
WHERE id NOT IN (SELECT rowid FROM sessions_fts);
