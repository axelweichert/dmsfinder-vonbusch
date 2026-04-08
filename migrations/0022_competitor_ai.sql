-- Migration 0022: ai_analysis Spalte für Competitors
ALTER TABLE competitors ADD COLUMN ai_analysis TEXT;
ALTER TABLE competitors ADD COLUMN ai_analyzed_at TEXT;
