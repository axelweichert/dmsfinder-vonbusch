-- Migration 0015: ERP-Link Konfiguration
CREATE TABLE IF NOT EXISTS erp_config (
  id          TEXT PRIMARY KEY DEFAULT 'default',
  tunnel_url  TEXT,              -- https://erp.vonbusch.app
  sql_server  TEXT,              -- sql01 / 192.168.200.10
  sql_port    INTEGER DEFAULT 1433,
  sql_db      TEXT,              -- justin
  sql_user    TEXT,
  sql_pass    TEXT,              -- verschlüsselt gespeichert
  sync_customers  INTEGER DEFAULT 1,
  sync_contacts   INTEGER DEFAULT 1,
  sync_employees  INTEGER DEFAULT 1,
  sync_orders     INTEGER DEFAULT 1,
  sync_products   INTEGER DEFAULT 0,
  last_sync   TEXT,
  last_sync_status TEXT,
  created_at  TEXT,
  updated_at  TEXT
);
