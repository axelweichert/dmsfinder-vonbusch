-- vonBusch CRM · Migration 0024 · Projektmanagement

CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'active',
  company_id  TEXT REFERENCES companies(id),
  deal_id     TEXT REFERENCES deals(id),
  owner_id    TEXT NOT NULL,
  due_date    TEXT,
  color       TEXT DEFAULT '#00C2FF',
  created_at  TEXT NOT NULL,
  updated_at  TEXT
);

CREATE TABLE IF NOT EXISTS project_tasks (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  column_id   TEXT NOT NULL DEFAULT 'open',
  assigned_to TEXT,
  priority    TEXT DEFAULT 'normal',
  due_date    TEXT,
  sort_order  INTEGER DEFAULT 0,
  created_by  TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT
);

CREATE TABLE IF NOT EXISTS project_members (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL,
  role        TEXT DEFAULT 'member',
  created_at  TEXT NOT NULL,
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_proj_status     ON projects(status);
CREATE INDEX IF NOT EXISTS idx_ptask_project   ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_ptask_column    ON project_tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_pmem_project    ON project_members(project_id);
