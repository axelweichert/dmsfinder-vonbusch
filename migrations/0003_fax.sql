-- Migration 0003: Fax-Spalte für Firmen
-- Wird nur einmal ausgeführt (Cloudflare D1 Migrations)
ALTER TABLE companies ADD COLUMN fax TEXT;
