-- v1.3.0: Aktivitäten-Erweiterung, Mitarbeiternummern, Attendees

-- Mitarbeiternummer
ALTER TABLE users ADD COLUMN employee_number TEXT;

-- Aktivitäten: neue Felder
ALTER TABLE activities ADD COLUMN prio TEXT;
ALTER TABLE activities ADD COLUMN duration_min INTEGER DEFAULT 0;
ALTER TABLE activities ADD COLUMN followup_required INTEGER DEFAULT 0;
ALTER TABLE activities ADD COLUMN outlook_event_id TEXT;
ALTER TABLE activities ADD COLUMN contract_id TEXT REFERENCES contracts(id);

-- Weitere Mitarbeiter / Teilnehmer
CREATE TABLE IF NOT EXISTS activity_attendees (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notified_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(activity_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_att_activity ON activity_attendees(activity_id);
CREATE INDEX IF NOT EXISTS idx_att_user     ON activity_attendees(user_id);

-- Outlook-Kalender-Token-Tabelle (bereits vorhanden, nur zur Referenz)
-- ms_tokens existiert bereits
