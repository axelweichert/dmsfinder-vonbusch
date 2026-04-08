-- v1.8.7: Social Media + Marketing Aktionen
-- HINWEIS: Diese Migration wurde bereits direkt in D1 ausgeführt
-- Hier nur zur Dokumentation

ALTER TABLE companies ADD COLUMN IF NOT EXISTS linkedin TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS xing TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS facebook TEXT;

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS linkedin TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS xing TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS facebook TEXT;

CREATE TABLE IF NOT EXISTS contact_marketing_tags (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  action TEXT NOT NULL,
  year INTEGER,
  status TEXT NOT NULL DEFAULT 'opted_in',
  sent_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mkt_contact ON contact_marketing_tags(contact_id);
CREATE INDEX IF NOT EXISTS idx_mkt_action ON contact_marketing_tags(action, year);
