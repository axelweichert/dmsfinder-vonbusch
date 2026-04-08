-- Migration 0002: KI-Zusammenfassung Spalten
-- Nur ausführen wenn Spalten noch nicht existieren
-- D1 ignoriert Fehler bei bereits vorhandenen Spalten nicht automatisch,
-- daher sind diese Spalten bereits in 0001_initial.sql enthalten.
-- Diese Migration ist ein No-op für neue Deployments.
SELECT 1;
