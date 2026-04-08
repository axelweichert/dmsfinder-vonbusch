-- Migration 0006: Ertrag/Marge in Deals + Ertrags-/Umsatzziele
-- Muss manuell in D1-Konsole ausgeführt werden (jedes Statement einzeln)

-- 1. Einkaufskosten in deals
ALTER TABLE deals ADD COLUMN cost_value REAL DEFAULT 0;

-- 2. Ertrag (wird beim PATCH berechnet und gespeichert)
ALTER TABLE deals ADD COLUMN margin_value REAL DEFAULT 0;

-- 3. Marge in Prozent
ALTER TABLE deals ADD COLUMN margin_percent REAL DEFAULT 0;

-- 4. Ziele-Tabelle (Team + Person, Quartal + Jahr)
CREATE TABLE IF NOT EXISTS targets (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'team',        -- 'team' oder 'user'
  ref_id TEXT NOT NULL,                      -- team-name oder user-id
  period_type TEXT NOT NULL DEFAULT 'year',  -- 'quarter' oder 'year'
  period_year INTEGER NOT NULL,
  period_quarter INTEGER,                    -- 1-4, nur bei period_type='quarter'
  revenue_target REAL DEFAULT 0,             -- Umsatzziel €
  margin_target REAL DEFAULT 0,              -- Ertragsziel €
  margin_percent_target REAL DEFAULT 0,      -- Margen-% Ziel
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_targets_ref ON targets(type, ref_id);
CREATE INDEX IF NOT EXISTS idx_targets_period ON targets(period_year, period_quarter);
