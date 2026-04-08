-- v1.8.9: Webinar-Modul
-- HINWEIS: Bereits direkt in D1 ausgeführt

CREATE TABLE IF NOT EXISTS webinars (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  topic TEXT,
  teaser TEXT,
  description TEXT,
  scheduled_at TEXT,
  duration_min INTEGER DEFAULT 60,
  status TEXT DEFAULT 'planned',
  host_user_id TEXT,
  registration_url TEXT,
  recording_url TEXT,
  gotowebinar_id TEXT,
  max_participants INTEGER,
  email_subject TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS webinar_contacts (
  id TEXT PRIMARY KEY,
  webinar_id TEXT NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
  contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  company_id TEXT,
  status TEXT DEFAULT 'invited',
  invited_at TEXT,
  registered_at TEXT,
  attended_at TEXT,
  email TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(webinar_id, contact_id)
);
