-- Produkt-/Leistungskatalog
CREATE TABLE IF NOT EXISTS products (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT NOT NULL DEFAULT 'Sonstiges',
  unit        TEXT NOT NULL DEFAULT 'pauschal',
  price       REAL NOT NULL DEFAULT 0,
  vat_rate    INTEGER NOT NULL DEFAULT 19,
  is_active   INTEGER NOT NULL DEFAULT 1,
  sku         TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
