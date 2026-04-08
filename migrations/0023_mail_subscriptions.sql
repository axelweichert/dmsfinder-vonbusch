-- Migration 0023: mail_subscriptions Tabelle (korrektes Schema)
CREATE TABLE IF NOT EXISTS mail_subscriptions (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  subscription_id TEXT,
  expires_at TEXT,
  resource TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
);
