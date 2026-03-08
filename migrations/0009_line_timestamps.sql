-- Add per-line timestamp offset (ms from session start) to support timeline feature.
-- NULL for sessions saved before this migration (no timeline available for old data).
ALTER TABLE transcript_lines ADD COLUMN offset_ms INTEGER;
