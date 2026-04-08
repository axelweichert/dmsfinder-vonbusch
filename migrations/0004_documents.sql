-- Migration 0004: Erweitertes DMS/ECM Dokumentenmanagement

-- Bestehende documents-Tabelle ersetzen
DROP TABLE IF EXISTS documents;

CREATE TABLE IF NOT EXISTS documents (
  -- Identifikation
  id            TEXT PRIMARY KEY,
  version       INTEGER NOT NULL DEFAULT 1,
  parent_id     TEXT REFERENCES documents(id),  -- Vorgänger-Version

  -- Datei
  r2_key        TEXT NOT NULL UNIQUE,
  r2_key_text   TEXT,                           -- extrahierter Volltext in R2
  name          TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type     TEXT,
  size          INTEGER,
  checksum      TEXT,                           -- SHA-256 für Revisionssicherheit

  -- Klassifizierung (KI + User)
  doc_type      TEXT,    -- Vertrag, Angebot, Rechnung, ...
  doc_date      TEXT,    -- Datum des Dokuments (nicht Upload-Datum)
  subject       TEXT,    -- Betreff/Titel
  summary       TEXT,    -- KI-Zusammenfassung
  fulltext_idx  TEXT,    -- Erste 10.000 Zeichen für LIKE-Suche
  tags          TEXT,    -- JSON-Array mit Tags
  language      TEXT DEFAULT 'de',

  -- Verknüpfung
  company_id    TEXT REFERENCES companies(id),
  contact_id    TEXT REFERENCES contacts(id),
  deal_id       TEXT REFERENCES deals(id),
  linked_type   TEXT,
  linked_id     TEXT,

  -- Revisionssicherheit
  uploaded_by   TEXT REFERENCES users(id),
  is_archived   INTEGER NOT NULL DEFAULT 0,
  archived_at   TEXT,
  archived_by   TEXT REFERENCES users(id),
  archive_reason TEXT,

  -- Zeitstempel
  created_at    TEXT NOT NULL,
  updated_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_doc_company    ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_doc_type       ON documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_doc_date       ON documents(doc_date);
CREATE INDEX IF NOT EXISTS idx_doc_parent     ON documents(parent_id);
CREATE INDEX IF NOT EXISTS idx_doc_archived   ON documents(is_archived);
CREATE INDEX IF NOT EXISTS idx_doc_linked     ON documents(linked_type, linked_id);
