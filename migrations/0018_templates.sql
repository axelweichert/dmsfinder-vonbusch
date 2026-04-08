-- Migration 0018: Dokumentenvorlagen
-- Muss manuell in D1-Konsole ausgeführt werden

CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'allgemein',  -- brief, email, angebot, allgemein
  subject TEXT,
  body TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_templates_type ON templates(type);
