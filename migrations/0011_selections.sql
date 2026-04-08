-- v1.9.8: Selektionen
-- Bereits direkt in D1 ausgeführt

CREATE TABLE IF NOT EXISTS selections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  entity_type TEXT NOT NULL DEFAULT 'contacts',
  filters TEXT NOT NULL DEFAULT '[]',
  result_count INTEGER DEFAULT 0,
  last_run_at TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
