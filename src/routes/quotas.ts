import { Hono } from 'hono'
import type { Env } from '../index'

export const quotasRouter = new Hono<{ Bindings: Env }>()

// Sieht alles: Admins + Katharina (Sales-Meetings alle 6 Wochen)
const SEES_ALL = [
  'victor.vonbusch@vonbusch.digital',
  'stefan.vonbusch@vonbusch.digital',
  'katharina.franke@vonbusch.digital'
]

// Kein Sales — werden in Ziele & Quoten nicht angezeigt
const EXCLUDED_FROM_QUOTAS = [
  'usr-ae',   // Arne Elges — Administration
  'usr-mb',   // Michael Burmeister — Einkauf
  'usr-ce',   // Claudia Eren — KAM
  'usr-sf',   // Stefan F.W. von Busch — Management
  'usr-vb',   // Victor von Busch — Management
  'usr-zf',   // Ziad Ferjani — Service
]

async function getVisibleUserIds(db: D1Database, email: string): Promise<string[] | null> {
  if (SEES_ALL.includes(email)) return null
  const me = await db.prepare('SELECT id, role, team FROM users WHERE email = ?').bind(email).first() as any
  if (!me) return []
  if (me.role === 'admin') return null
  if (me.role === 'sales_manager') {
    const { results } = await db.prepare(
      'SELECT id FROM users WHERE team = ? AND active = 1'
    ).bind(me.team).all()
    return (results as any[]).map((u: any) => u.id)
  }
  return [me.id]
}

// Hilfsfunktion: Ertrag (margin_value) für User + Jahr berechnen
async function calcErtrag(db: D1Database, userId: string, year: number) {
  const { results: wonDeals } = await db.prepare(
    `SELECT margin_value, won_at, updated_at FROM deals
     WHERE owner_id = ? AND stage = 'won'
     AND (
       (won_at IS NOT NULL AND strftime('%Y', won_at) = ?)
       OR (won_at IS NULL AND strftime('%Y', updated_at) = ?)
     )`
  ).bind(userId, String(year), String(year)).all()

  const total = (wonDeals as any[]).reduce((sum, d) => sum + (parseFloat(d.margin_value) || 0), 0)

  const monthly: Record<string, number> = {}
  for (let m = 1; m <= 12; m++) monthly[String(m).padStart(2, '0')] = 0
  ;(wonDeals as any[]).forEach((d: any) => {
    const dateStr = d.won_at || d.updated_at || ''
    const month = dateStr.substring(5, 7)
    if (month && monthly[month] !== undefined) monthly[month] += parseFloat(d.margin_value) || 0
  })

  return { total: Math.round(total * 100) / 100, monthly }
}

// GET /api/quotas?year=2026
quotasRouter.get('/', async (c) => {
  const email = c.req.header('Cf-Access-Authenticated-User-Email') ||
                c.req.header('X-Dev-Email') || 'axel.weichert@vonbusch.digital'
  const year = parseInt(c.req.query('year') || String(new Date().getFullYear()))

  const visibleIds = await getVisibleUserIds(c.env.DB, email)

  let users: any[]
  if (visibleIds === null) {
    const { results } = await c.env.DB.prepare(
      "SELECT id, email, display_name, team, role FROM users WHERE active = 1 AND role NOT IN ('readonly','support') ORDER BY team, display_name"
    ).all()
    users = results as any[]
  } else if (visibleIds.length === 0) {
    users = []
  } else {
    users = []
    for (const uid of visibleIds) {
      const u = await c.env.DB.prepare(
        "SELECT id, email, display_name, team, role FROM users WHERE id = ? AND active = 1"
      ).bind(uid).first() as any
      if (u) users.push(u)
    }
  }

  // Nicht-Sales Mitarbeiter herausfiltern
  const filteredUsers = users.filter((u: any) => !EXCLUDED_FROM_QUOTAS.includes(u.id))

  const result = []
  for (const u of filteredUsers) {
    // Ziel: margin_target aus targets-Tabelle
    const target = await c.env.DB.prepare(
      "SELECT * FROM targets WHERE type='user' AND ref_id=? AND period_type='year' AND period_year=?"
    ).bind(u.id, year).first() as any

    // Ertrag (Marge) berechnen
    const { total: ertragActual, monthly } = await calcErtrag(c.env.DB, u.id, year)

    const ertragTarget = target?.margin_target || 0
    const percent = ertragTarget > 0 ? Math.round((ertragActual / ertragTarget) * 1000) / 10 : null

    result.push({
      user_id: u.id,
      email: u.email,
      display_name: u.display_name,
      team: u.team,
      role: u.role,
      year,
      revenue_target: ertragTarget,    // Ertragsziel (margin_target)
      revenue_actual: ertragActual,     // Ertrag IST (margin_value)
      percent_achieved: percent,
      monthly,
      target_id: target?.id || null
    })
  }

  return c.json({ data: result, year })
})

// GET /api/quotas/me?year=2025
quotasRouter.get('/me', async (c) => {
  const email = c.req.header('Cf-Access-Authenticated-User-Email') ||
                c.req.header('X-Dev-Email') || 'axel.weichert@vonbusch.digital'
  const year = parseInt(c.req.query('year') || String(new Date().getFullYear()))

  const me = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first() as any
  if (!me) return c.json({ error: 'User not found' }, 404)

  const target = await c.env.DB.prepare(
    "SELECT * FROM targets WHERE type='user' AND ref_id=? AND period_type='year' AND period_year=?"
  ).bind(me.id, year).first() as any

  const { total: ertragActual, monthly } = await calcErtrag(c.env.DB, me.id, year)
  const ertragTarget = target?.margin_target || 0
  const percent = ertragTarget > 0 ? Math.round((ertragActual / ertragTarget) * 1000) / 10 : null

  return c.json({
    user_id: me.id,
    display_name: me.display_name,
    year,
    revenue_target: ertragTarget,
    revenue_actual: ertragActual,
    percent_achieved: percent,
    monthly,
    has_target: !!target
  })
})

// POST /api/quotas — Ziel setzen (speichert in margin_target)
quotasRouter.post('/', async (c) => {
  const email = c.req.header('Cf-Access-Authenticated-User-Email') ||
                c.req.header('X-Dev-Email') || 'axel.weichert@vonbusch.digital'
  const b = await c.req.json()
  const { user_id, year, revenue_target } = b  // revenue_target = Ertragsziel aus Frontend

  if (!user_id || !year || revenue_target === undefined) {
    return c.json({ error: 'user_id, year, revenue_target required' }, 400)
  }

  const me = await c.env.DB.prepare('SELECT id, role, team FROM users WHERE email = ?').bind(email).first() as any
  if (!me) return c.json({ error: 'Unauthorized' }, 403)

  const target_user = await c.env.DB.prepare('SELECT id, team FROM users WHERE id = ?').bind(user_id).first() as any
  if (!target_user) return c.json({ error: 'User not found' }, 404)

  const canEdit =
    SEES_ALL.includes(email) ||
    me.role === 'admin' ||
    (me.role === 'sales_manager' && me.team === target_user.team) ||
    me.id === user_id

  if (!canEdit) return c.json({ error: 'Keine Berechtigung' }, 403)

  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  const val = parseFloat(revenue_target)

  // Speichern in margin_target (= Ertragsziel)
  await c.env.DB.prepare(`
    INSERT INTO targets (id, type, ref_id, period_type, period_year, margin_target, revenue_target, created_at, updated_at)
    VALUES (?, 'user', ?, 'year', ?, ?, ?, ?, ?)
    ON CONFLICT(type, ref_id, period_type, period_year)
    DO UPDATE SET margin_target = excluded.margin_target, updated_at = excluded.updated_at
  `).bind(id, user_id, year, val, val, now, now).run()

  return c.json({ success: true })
})

// DELETE /api/quotas/:user_id/:year
quotasRouter.delete('/:user_id/:year', async (c) => {
  const email = c.req.header('Cf-Access-Authenticated-User-Email') ||
                c.req.header('X-Dev-Email') || 'axel.weichert@vonbusch.digital'
  const me = await c.env.DB.prepare('SELECT role FROM users WHERE email=?').bind(email).first() as any
  const canDelete = SEES_ALL.includes(email) || me?.role === 'admin'
  if (!canDelete) return c.json({ error: 'Keine Berechtigung' }, 403)

  await c.env.DB.prepare(
    "DELETE FROM targets WHERE type='user' AND ref_id=? AND period_type='year' AND period_year=?"
  ).bind(c.req.param('user_id'), parseInt(c.req.param('year'))).run()

  return c.json({ success: true })
})
