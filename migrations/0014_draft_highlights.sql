-- WP-05: Add highlights_json to session_drafts so autosave captures highlights
ALTER TABLE session_drafts ADD COLUMN highlights_json TEXT NOT NULL DEFAULT '[]';
