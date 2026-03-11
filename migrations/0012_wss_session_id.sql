-- Link sessions to their live WebSocket session ID so share page can fetch viewer_comments
ALTER TABLE sessions ADD COLUMN wss_session_id TEXT;
