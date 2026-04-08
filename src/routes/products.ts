import { Hono } from 'hono'
import type { Env } from '../index'

export const productsRouter = new Hono<{ Bindings: Env }>()

// ── Kategorie-Statistiken ──────────────────────────────────────────────────────
productsRouter.get('/stats', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT category,
            COUNT(*) AS count,
            SUM(stock) AS total_stock,
            SUM(CASE WHEN is_active=1 THEN 1 ELSE 0 END) AS active_count
     FROM products
     GROUP BY category
     ORDER BY category`
  ).all()
  return c.json({ stats: results })
})

// ── Liste ──────────────────────────────────────────────────────────────────────
productsRouter.get('/', async (c) => {
  const db        = c.env.DB
  const q         = c.req.query('q') || ''
  const category  = c.req.query('category') || ''
  // active_only=1 oder active=1 → nur aktive; active=0/false → alle
  const activeOnly = c.req.query('active_only') === '1'
  const activeQ    = c.req.query('active')
  const active     = activeOnly || (activeQ !== '0' && activeQ !== 'false')

  let sql    = 'SELECT * FROM products WHERE 1=1'
  const args: any[] = []

  if (active) { sql += ' AND is_active=1' }
  // Kategorie: exakter Match ODER Präfix-Match für Hauptkategorien (LIKE 'Prefix%')
  if (category) {
    sql += ' AND category LIKE ?'
    args.push(`${category}%`)
  }
  if (q) { sql += ' AND (name LIKE ? OR description LIKE ? OR sku LIKE ?)'; args.push(`%${q}%`,`%${q}%`,`%${q}%`) }

  sql += ' ORDER BY category, name LIMIT 500'

  const { results } = await db.prepare(sql).bind(...args).all()

  // Alle vorhandenen Kategorien für Dropdown
  const { results: cats } = await db.prepare(
    'SELECT DISTINCT category FROM products ORDER BY category'
  ).all()

  return c.json({ products: results, categories: cats.map((r: any) => r.category) })
})

// ── Einzeln ────────────────────────────────────────────────────────────────────
productsRouter.get('/:id', async (c) => {
  const p = await c.env.DB.prepare('SELECT * FROM products WHERE id=?').bind(c.req.param('id')).first()
  if (!p) return c.json({ error: 'Nicht gefunden' }, 404)
  return c.json(p)
})

// ── Erstellen ──────────────────────────────────────────────────────────────────
productsRouter.post('/', async (c) => {
  const b   = await c.req.json() as any
  const db  = c.env.DB
  const now = new Date().toISOString()
  const id  = crypto.randomUUID()

  await db.prepare(
    `INSERT INTO products (id,name,description,category,unit,price,purchase_price,vat_rate,is_active,sku,stock,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    id, b.name||'', b.description||'', b.category||'Sonstiges',
    b.unit||'pauschal', parseFloat(b.price)||0, parseFloat(b.purchase_price)||0, parseInt(b.vat_rate)||19,
    b.is_active!==false ? 1 : 0, b.sku||null, parseInt(b.stock)||0, now, now
  ).run()

  return c.json({ success: true, id })
})

// ── Bearbeiten ─────────────────────────────────────────────────────────────────
productsRouter.patch('/:id', async (c) => {
  const b   = await c.req.json() as any
  const now = new Date().toISOString()

  await c.env.DB.prepare(
    `UPDATE products SET name=?,description=?,category=?,unit=?,price=?,purchase_price=?,vat_rate=?,is_active=?,sku=?,stock=?,updated_at=?
     WHERE id=?`
  ).bind(
    b.name, b.description||'', b.category||'Sonstiges',
    b.unit||'pauschal', parseFloat(b.price)||0, parseFloat(b.purchase_price)||0, parseInt(b.vat_rate)||19,
    b.is_active ? 1 : 0, b.sku||null, parseInt(b.stock)||0, now, c.req.param('id')
  ).run()

  return c.json({ success: true })
})

// ── Löschen ────────────────────────────────────────────────────────────────────
productsRouter.delete('/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM products WHERE id=?').bind(c.req.param('id')).run()
  return c.json({ success: true })
})
