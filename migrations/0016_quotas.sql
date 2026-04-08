-- Migration 0016: Ziele & Quoten (Feature 9)
-- Muss manuell in D1-Konsole ausgeführt werden

-- 1. won_at Feld in deals: exaktes Datum wann Deal gewonnen wurde
ALTER TABLE deals ADD COLUMN won_at TEXT;

-- 2. Bestehende won-Deals mit updated_at befüllen (Näherungswert)
UPDATE deals SET won_at = updated_at WHERE stage = 'won' AND won_at IS NULL;

-- 3. Index für schnelle Quota-Abfragen
CREATE INDEX IF NOT EXISTS idx_deals_won_at ON deals(stage, won_at);
CREATE INDEX IF NOT EXISTS idx_deals_owner_stage ON deals(owner_id, stage);

-- Hinweis: Ziele werden in der bestehenden targets-Tabelle gespeichert
-- (angelegt in Migration 0006) mit type='user', period_type='year'
-- Falls targets-Tabelle noch nicht existiert:
CREATE TABLE IF NOT EXISTS targets (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'user',
  ref_id TEXT NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'year',
  period_year INTEGER NOT NULL,
  period_quarter INTEGER,
  revenue_target REAL DEFAULT 0,
  margin_target REAL DEFAULT 0,
  margin_percent_target REAL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  UNIQUE(type, ref_id, period_type, period_year)
);
CREATE INDEX IF NOT EXISTS idx_targets_ref ON targets(type, ref_id);
CREATE INDEX IF NOT EXISTS idx_targets_period ON targets(period_year);
