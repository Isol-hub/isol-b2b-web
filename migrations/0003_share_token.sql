ALTER TABLE sessions ADD COLUMN share_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_share_token ON sessions(share_token);
