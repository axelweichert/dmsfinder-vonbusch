-- Migration 0014: Aufgaben-System
CREATE TABLE IF NOT EXISTS tasks (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT,          -- user id (z.B. usr-mb)
  created_by  TEXT,          -- user id
  related_type TEXT,         -- 'product', 'deal', 'company', 'contact', null
  related_id  TEXT,
  related_name TEXT,         -- Anzeigename des verknüpften Objekts
  priority    TEXT DEFAULT 'normal',  -- low | normal | high
  status      TEXT DEFAULT 'open',    -- open | done
  due_date    TEXT,
  created_at  TEXT,
  updated_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status   ON tasks(status);
