-- Migration 0007: archive_r2_key in documents
ALTER TABLE documents ADD COLUMN archive_r2_key TEXT;
