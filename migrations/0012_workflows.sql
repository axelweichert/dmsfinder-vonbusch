-- v2.0.2: Workflows
-- Bereits direkt in D1 ausgeführt

CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  active INTEGER DEFAULT 1,
  trigger_type TEXT NOT NULL,
  trigger_config TEXT DEFAULT '{}',
  steps TEXT NOT NULL DEFAULT '[]',
  run_count INTEGER DEFAULT 0,
  last_run_at TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS workflow_logs (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  entity_type TEXT,
  entity_id TEXT,
  entity_name TEXT,
  status TEXT DEFAULT 'success',
  steps_done TEXT DEFAULT '[]',
  error TEXT,
  created_at TEXT NOT NULL
);
