-- Migration 0020: Competitive Intelligence
CREATE TABLE IF NOT EXISTS competitors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  segment TEXT,
  website TEXT,
  notes TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS deal_competitors (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL,
  competitor_id TEXT NOT NULL,
  outcome TEXT DEFAULT 'unknown',
  notes TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_dc_deal ON deal_competitors(deal_id);
CREATE INDEX IF NOT EXISTS idx_dc_comp ON deal_competitors(competitor_id);
