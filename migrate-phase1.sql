-- Phase-1 Migration: UTM + DSGVO + DOI
ALTER TABLE leads ADD COLUMN utm_source TEXT;
ALTER TABLE leads ADD COLUMN utm_medium TEXT;
ALTER TABLE leads ADD COLUMN utm_campaign TEXT;
ALTER TABLE leads ADD COLUMN utm_term TEXT;
ALTER TABLE leads ADD COLUMN utm_content TEXT;
ALTER TABLE leads ADD COLUMN consent_at TEXT;
ALTER TABLE leads ADD COLUMN doi_token TEXT;
ALTER TABLE leads ADD COLUMN doi_confirmed_at TEXT;
ALTER TABLE leads ADD COLUMN doi_email_sent_at TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_doi_token ON leads(doi_token);
