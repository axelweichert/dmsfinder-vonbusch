-- DMS Finder — D1 Schema
-- Run in: Cloudflare Dashboard → D1 → dms-finder-db → Console

CREATE TABLE IF NOT EXISTS leads (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  -- Kontaktdaten
  name           TEXT NOT NULL,
  email          TEXT NOT NULL,
  company        TEXT,
  position       TEXT,
  phone          TEXT,
  -- Unternehmen
  employees      TEXT,
  branche        TEXT,
  current_system TEXT,
  -- Projektdetails
  dms_interest   TEXT,
  budget         TEXT,
  timeline       TEXT,
  message        TEXT,
  -- Digitalisierungs-Check
  score_total    INTEGER DEFAULT 0,
  q1_answer      TEXT,
  q2_answer      TEXT,
  q3_answer      TEXT,
  q4_answer      TEXT,
  q5_answer      TEXT,
  q6_answer      TEXT,
  -- Admin
  status         TEXT DEFAULT 'neu',
  notes          TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT
);

CREATE INDEX IF NOT EXISTS idx_leads_status  ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_email   ON leads(email);
