-- Migration 0017: Ertragsziele korrekt setzen
-- Erst alle user-Jahresziele löschen, dann sauber einfügen
-- Muss manuell in D1-Konsole ausgeführt werden — JEDES Statement einzeln!

-- Statement 1: Bestehende User-Jahresziele löschen
DELETE FROM targets WHERE type='user' AND period_type='year';

-- Statement 2: Ertragsziele 2026 einfügen
INSERT INTO targets (id, type, ref_id, period_type, period_year, margin_target, revenue_target, created_at, updated_at) VALUES
('tgt-aw-2026',  'user','usr-aw',  'year',2026,400000,400000,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z'),
('tgt-hbr-2026', 'user','usr-hbr', 'year',2026,160000,160000,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z'),
('tgt-hb2-2026', 'user','usr-hb2', 'year',2026,120000,120000,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z'),
('tgt-hd-2026',  'user','usr-hd',  'year',2026,100000,100000,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z'),
('tgt-so-2026',  'user','usr-so',  'year',2026, 80000, 80000,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z'),
('tgt-mh-2026',  'user','usr-mh',  'year',2026,140000,140000,'2026-01-01T00:00:00Z','2026-01-01T00:00:00Z');

-- Statement 3: Ertragsziele 2025 einfügen (Vorjahr)
INSERT INTO targets (id, type, ref_id, period_type, period_year, margin_target, revenue_target, created_at, updated_at) VALUES
('tgt-aw-2025',  'user','usr-aw',  'year',2025,350000,350000,'2025-01-01T00:00:00Z','2025-01-01T00:00:00Z'),
('tgt-hbr-2025', 'user','usr-hbr', 'year',2025,120000,120000,'2025-01-01T00:00:00Z','2025-01-01T00:00:00Z');
