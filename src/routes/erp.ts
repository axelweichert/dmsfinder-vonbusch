import { Hono } from 'hono'
import type { Env } from '../index'

export const erpRouter = new Hono<{ Bindings: Env }>()

// ── Konfiguration laden ───────────────────────────────────────────────────────
erpRouter.get('/config', async (c) => {
  const cfg = await c.env.DB.prepare(
    "SELECT * FROM erp_config WHERE id='default'"
  ).first() as any
  // Passwort nie zurückgeben
  if (cfg) delete cfg.sql_pass
  return c.json({ config: cfg || null })
})

// ── Konfiguration speichern ───────────────────────────────────────────────────
erpRouter.post('/config', async (c) => {
  const b   = await c.req.json() as any
  const now = new Date().toISOString()

  // Passwort nur updaten wenn neu übergeben
  const existing = await c.env.DB.prepare(
    "SELECT sql_pass FROM erp_config WHERE id='default'"
  ).first() as any

  const pass = b.sql_pass && b.sql_pass !== '••••••••'
    ? b.sql_pass
    : existing?.sql_pass || null

  await c.env.DB.prepare(`
    INSERT INTO erp_config (id,tunnel_url,sql_server,sql_port,sql_db,sql_user,sql_pass,
      sync_customers,sync_contacts,sync_employees,sync_orders,sync_products,created_at,updated_at)
    VALUES ('default',?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      tunnel_url=excluded.tunnel_url, sql_server=excluded.sql_server,
      sql_port=excluded.sql_port, sql_db=excluded.sql_db,
      sql_user=excluded.sql_user, sql_pass=excluded.sql_pass,
      sync_customers=excluded.sync_customers, sync_contacts=excluded.sync_contacts,
      sync_employees=excluded.sync_employees, sync_orders=excluded.sync_orders,
      sync_products=excluded.sync_products, updated_at=excluded.updated_at
  `).bind(
    b.tunnel_url || null,
    b.sql_server  || null,
    parseInt(b.sql_port) || 1433,
    b.sql_db      || null,
    b.sql_user    || null,
    pass,
    b.sync_customers ? 1 : 0,
    b.sync_contacts  ? 1 : 0,
    b.sync_employees ? 1 : 0,
    b.sync_orders    ? 1 : 0,
    b.sync_products  ? 1 : 0,
    now, now
  ).run()

  return c.json({ success: true })
})

// ── Verbindungstest ───────────────────────────────────────────────────────────
erpRouter.post('/test', async (c) => {
  const cfg = await c.env.DB.prepare(
    "SELECT tunnel_url FROM erp_config WHERE id='default'"
  ).first() as any

  if (!cfg?.tunnel_url) {
    return c.json({ ok: false, message: 'Kein Tunnel-URL konfiguriert.' })
  }

  try {
    const url = cfg.tunnel_url.replace(/\/$/, '') + '/ping'
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { 'X-CRM-Auth': 'vonbusch-erp-bridge' }
    })
    if (res.ok) {
      const data = await res.json() as any
      return c.json({ ok: true, message: 'Verbindung erfolgreich', version: data.version || '–', db: data.db || '–' })
    }
    return c.json({ ok: false, message: `Bridge antwortet mit Status ${res.status}` })
  } catch (e: any) {
    return c.json({ ok: false, message: 'Bridge nicht erreichbar: ' + (e.message || 'Timeout') })
  }
})

// ── Status ────────────────────────────────────────────────────────────────────
erpRouter.get('/status', async (c) => {
  const cfg = await c.env.DB.prepare(
    "SELECT tunnel_url, last_sync, last_sync_status FROM erp_config WHERE id='default'"
  ).first() as any
  return c.json({
    configured: !!cfg?.tunnel_url,
    last_sync: cfg?.last_sync || null,
    last_sync_status: cfg?.last_sync_status || null
  })
})
