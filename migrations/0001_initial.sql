-- vonBusch CRM · D1 Schema
-- Migration: 0001_initial.sql

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  azure_oid TEXT,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'sales',
  team TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'prospect',
  bereich TEXT,
  street TEXT, zip TEXT, city TEXT, country TEXT DEFAULT 'DE',
  phone TEXT, email TEXT, website TEXT, notes TEXT,
  account_manager_id TEXT REFERENCES users(id),
  erp_id TEXT UNIQUE,
  ai_summary TEXT,
  ai_summary_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_co_status  ON companies(status);
CREATE INDEX IF NOT EXISTS idx_co_bereich ON companies(bereich);
CREATE INDEX IF NOT EXISTS idx_co_erp     ON companies(erp_id);

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT, email_private TEXT,
  phone TEXT, mobile TEXT,
  position TEXT, department TEXT,
  is_decision_maker INTEGER DEFAULT 0,
  birthday TEXT,
  street TEXT, zip TEXT, city TEXT,
  status TEXT NOT NULL DEFAULT 'prospect',
  account_manager_id TEXT REFERENCES users(id),
  source TEXT DEFAULT 'manual',
  notes TEXT,
  interests TEXT,
  marketing_email INTEGER DEFAULT 0,
  marketing_events INTEGER DEFAULT 0,
  marketing_phone INTEGER DEFAULT 0,
  marketing_post INTEGER DEFAULT 0,
  marketing_global_optin INTEGER DEFAULT 0,
  marketing_optin_date TEXT,
  marketing_optout_date TEXT,
  erp_id TEXT UNIQUE,
  ai_summary TEXT,
  ai_summary_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_ct_company ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_ct_status  ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_ct_optin   ON contacts(marketing_global_optin);
CREATE INDEX IF NOT EXISTS idx_ct_erp     ON contacts(erp_id);

CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  company_id TEXT NOT NULL REFERENCES companies(id),
  contact_id TEXT REFERENCES contacts(id),
  owner_id TEXT NOT NULL REFERENCES users(id),
  bereich TEXT,
  stage TEXT NOT NULL DEFAULT 'lead',
  value REAL DEFAULT 0,
  probability INTEGER DEFAULT 10,
  expected_close TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  notes TEXT,
  erp_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_dl_stage   ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_dl_company ON deals(company_id);
CREATE INDEX IF NOT EXISTS idx_dl_owner   ON deals(owner_id);
CREATE INDEX IF NOT EXISTS idx_dl_status  ON deals(status);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT,
  linked_type TEXT,
  linked_id TEXT,
  contact_id TEXT REFERENCES contacts(id),
  company_id TEXT REFERENCES companies(id),
  deal_id TEXT REFERENCES deals(id),
  owner_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'open',
  due_at TEXT,
  done_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_ak_linked ON activities(linked_type, linked_id);
CREATE INDEX IF NOT EXISTS idx_ak_owner  ON activities(owner_id);
CREATE INDEX IF NOT EXISTS idx_ak_status ON activities(status);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  description TEXT,
  company_id TEXT NOT NULL REFERENCES companies(id),
  contact_id TEXT REFERENCES contacts(id),
  assigned_to TEXT REFERENCES users(id),
  bereich TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  erp_service_id TEXT UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  resolved_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_tk_status   ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tk_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tk_company  ON tickets(company_id);
CREATE INDEX IF NOT EXISTS idx_tk_erp      ON tickets(erp_service_id);

CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  contract_number TEXT NOT NULL UNIQUE,
  company_id TEXT NOT NULL REFERENCES companies(id),
  product TEXT NOT NULL,
  bereich TEXT NOT NULL,
  contract_type TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  auto_renew INTEGER DEFAULT 0,
  renew_months INTEGER DEFAULT 12,
  monthly_value REAL NOT NULL DEFAULT 0,
  sla_type TEXT,
  sla_status TEXT NOT NULL DEFAULT 'ok',
  status TEXT NOT NULL DEFAULT 'active',
  owner_id TEXT REFERENCES users(id),
  notes TEXT,
  erp_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_sv_company  ON contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_sv_status   ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_sv_bereich  ON contracts(bereich);
CREATE INDEX IF NOT EXISTS idx_sv_end_date ON contracts(end_date);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  r2_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  mime_type TEXT,
  size INTEGER,
  linked_type TEXT,
  linked_id TEXT,
  uploaded_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_doc_linked ON documents(linked_type, linked_id);

CREATE TABLE IF NOT EXISTS sync_log (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  erp_id TEXT,
  crm_id TEXT,
  direction TEXT NOT NULL DEFAULT 'justin_to_crm',
  status TEXT NOT NULL DEFAULT 'success',
  records_processed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TEXT,
  synced_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sync_entity ON sync_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_sync_synced ON sync_log(synced_at);

CREATE TABLE IF NOT EXISTS ms_tokens (
  email TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mail_subscriptions (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  subscription_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
