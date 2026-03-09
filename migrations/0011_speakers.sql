-- Speaker diarization support
-- All nullable — existing rows remain valid, existing queries unaffected

ALTER TABLE transcript_lines ADD COLUMN speaker_id         TEXT;
ALTER TABLE transcript_lines ADD COLUMN speaker_confidence REAL;
ALTER TABLE transcript_lines ADD COLUMN speaker_state      TEXT;   -- confirmed|tentative|overlap|uncertain
ALTER TABLE transcript_lines ADD COLUMN speaker_source     TEXT;   -- heuristic|manual|online|refined|workspace_match
ALTER TABLE transcript_lines ADD COLUMN speaker_revision   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE transcript_lines ADD COLUMN end_ms             INTEGER;

-- Per-session speaker label/color mapping
CREATE TABLE IF NOT EXISTS session_speakers (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id     INTEGER NOT NULL,
  speaker_id     TEXT NOT NULL,
  label          TEXT NOT NULL DEFAULT '',
  color          TEXT NOT NULL DEFAULT '#6366F1',
  source         TEXT NOT NULL DEFAULT 'heuristic',   -- who assigned this label
  is_user_edited INTEGER NOT NULL DEFAULT 0,          -- 1 = manual override, never overwrite
  created_at     INTEGER NOT NULL,
  UNIQUE (session_id, speaker_id)
);

-- Cross-session speaker identity (Fase 3)
CREATE TABLE IF NOT EXISTS workspace_speakers (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_slug TEXT NOT NULL,
  speaker_key    TEXT NOT NULL,       -- hash of centroid embedding
  label          TEXT NOT NULL,
  color          TEXT NOT NULL,
  embedding_json TEXT,                -- serialized centroid (Fase 3)
  created_at     INTEGER NOT NULL,
  UNIQUE (workspace_slug, speaker_key)
);

CREATE INDEX IF NOT EXISTS idx_session_speakers_sid  ON session_speakers(session_id);
CREATE INDEX IF NOT EXISTS idx_workspace_speakers_slug ON workspace_speakers(workspace_slug);
