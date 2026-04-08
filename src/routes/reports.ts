import { Hono } from 'hono'

const reportsRouter = new Hono<{ Bindings: any }>()

// ── HELPER ────────────────────────────────────────────────────────────────────

async function getMe(c: any) {
  const email = c.req.header('Cf-Access-Authenticated-User-Email') || ''
  return await c.env.DB.prepare(
    'SELECT id,role,team,display_name FROM users WHERE LOWER(email)=?'
  ).bind(email.toLowerCase()).first() as any
}

// Erlaubte Owner-IDs basierend auf Rolle
async function getAllowedOwners(db: any, me: any, requestedUserId?: string): Promise<string[]|null> {
  if (me.role === 'admin') {
    // Admin sieht alles — null bedeutet kein Filter
    if (requestedUserId) return [requestedUserId]
    return null
  }
  if (me.role === 'sales_manager') {
    // Sales Manager sieht eigenes Team
    const { results: teamMembers } = await db.prepare(
      `SELECT id FROM users WHERE team=? AND active=1`
    ).bind(me.team).all() as any
    const ids = teamMembers.map((u: any) => u.id)
    if (requestedUserId && ids.includes(requestedUserId)) return [requestedUserId]
    return ids
  }
  // Sales → nur eigene Daten
  return [me.id]
}

function ownerFilter(ids: string[]|null, alias = 'owner_id'): { sql: string; params: string[] } {
  if (!ids) return { sql: '1=1', params: [] }
  if (ids.length === 0) return { sql: '1=0', params: [] }
  if (ids.length === 1) return { sql: `${alias}=?`, params: ids }
  return {
    sql: `${alias} IN (${ids.map(() => '?').join(',')})`,
    params: ids,
  }
}

function dateFilter(period: string, alias = 'created_at'): { sql: string; params: string[] } {
  const now = new Date()
  let from: string
  switch (period) {
    case 'week':
      from = new Date(now.getTime() - 7 * 86400000).toISOString(); break
    case 'month':
      from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString(); break
    case 'quarter':
      const q = Math.floor(now.getMonth() / 3)
      from = new Date(now.getFullYear(), q * 3, 1).toISOString(); break
    case 'year':
      from = new Date(now.getFullYear(), 0, 1).toISOString(); break
    case 'all':
    default:
      return { sql: '1=1', params: [] }
  }
  return { sql: `${alias} >= ?`, params: [from] }
}

// ── ÜBERSICHT ────────────────────────────────────────────────────────────────

reportsRouter.get('/overview', async (c) => {
  const db = c.env.DB
  const me = await getMe(c)
  if (!me) return c.json({ error: 'Nicht angemeldet' }, 401)

  const owners = await getAllowedOwners(db, me)
  const ownerF = ownerFilter(owners)

  const [deals, acts, contracts, companies, leads] = await Promise.all([
    db.prepare(`SELECT
      COUNT(*) as total,
      SUM(CASE WHEN stage='won' THEN 1 ELSE 0 END) as won,
      SUM(CASE WHEN stage='won' THEN CAST(value as REAL) ELSE 0 END) as won_value,
      SUM(CASE WHEN stage NOT IN ('won','lost') THEN CAST(value as REAL) ELSE 0 END) as pipeline_value,
      SUM(CASE WHEN stage='lost' THEN 1 ELSE 0 END) as lost
      FROM deals WHERE ${ownerF.sql}`).bind(...ownerF.params).first(),

    db.prepare(`SELECT COUNT(*) as total,
      SUM(CASE WHEN status='open' THEN 1 ELSE 0 END) as open,
      SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) as done
      FROM activities WHERE ${ownerF.sql}`).bind(...ownerF.params).first(),

    db.prepare(`SELECT COUNT(*) as total,
      SUM(CAST(monthly_value as REAL)) as mrr
      FROM contracts WHERE status='active'`).first(),

    db.prepare(`SELECT COUNT(*) as total,
      SUM(CASE WHEN status='customer' THEN 1 ELSE 0 END) as customers,
      SUM(CASE WHEN status='prospect' THEN 1 ELSE 0 END) as prospects
      FROM companies`).first(),

    db.prepare(`SELECT COUNT(*) as total,
      SUM(CASE WHEN status='neu' THEN 1 ELSE 0 END) as neu
      FROM leads`).bind().first().catch(() => ({ total: 0, neu: 0 })),
  ])

  return c.json({ deals, acts, contracts, companies, leads, role: me.role, team: me.team })
})

// ── SALES PERFORMANCE ────────────────────────────────────────────────────────

reportsRouter.get('/sales', async (c) => {
  const db = c.env.DB
  const me = await getMe(c)
  if (!me) return c.json({ error: 'Nicht angemeldet' }, 401)

  const { period = 'year', user_id, group_by = 'month' } = c.req.query()
  const owners = await getAllowedOwners(db, me, user_id)
  const ownerF = ownerFilter(owners)
  const dateF  = dateFilter(period, 'd.created_at')

  // Deals nach Monat/Quartal
  const groupExpr = group_by === 'quarter'
    ? `strftime('%Y', d.created_at) || '-Q' || CAST((CAST(strftime('%m', d.created_at) AS INTEGER)+2)/3 AS TEXT)`
    : `strftime('%Y-%m', d.created_at)`

  const monthlyDeals = await db.prepare(`
    SELECT ${groupExpr} as period,
      COUNT(*) as total,
      SUM(CASE WHEN d.stage='won' THEN 1 ELSE 0 END) as won,
      SUM(CASE WHEN d.stage='lost' THEN 1 ELSE 0 END) as lost,
      ROUND(SUM(CASE WHEN d.stage='won' THEN CAST(d.value as REAL) ELSE 0 END),2) as won_value,
      ROUND(SUM(CAST(d.value as REAL)),2) as total_value
    FROM deals d
    WHERE ${ownerF.sql} AND ${dateF.sql}
    GROUP BY period ORDER BY period ASC
  `).bind(...ownerF.params, ...dateF.params).all()

  // Top Deals
  const topDeals = await db.prepare(`
    SELECT d.title, d.stage, d.value, d.created_at,
      co.name as company, u.display_name as owner
    FROM deals d
    LEFT JOIN companies co ON d.company_id=co.id
    LEFT JOIN users u ON d.owner_id=u.id
    WHERE ${ownerF.sql} AND ${dateF.sql} AND d.stage='won'
    ORDER BY CAST(d.value as REAL) DESC LIMIT 10
  `).bind(...ownerF.params, ...dateF.params).all()

  // Stage Verteilung
  const byStage = await db.prepare(`
    SELECT stage, COUNT(*) as cnt,
      ROUND(SUM(CAST(value as REAL)),2) as value
    FROM deals d WHERE ${ownerF.sql}
    GROUP BY stage ORDER BY value DESC
  `).bind(...ownerF.params).all()

  // Umsatz nach Bereich
  const byBereich = await db.prepare(`
    SELECT COALESCE(NULLIF(d.bereich,''),'Sonstige') as bereich,
      COUNT(*) as cnt,
      ROUND(SUM(CASE WHEN d.stage='won' THEN CAST(d.value as REAL) ELSE 0 END),2) as won_value
    FROM deals d WHERE ${ownerF.sql} AND ${dateF.sql}
    GROUP BY bereich ORDER BY won_value DESC
  `).bind(...ownerF.params, ...dateF.params).all()

  return c.json({
    monthly: monthlyDeals.results,
    topDeals: topDeals.results,
    byStage: byStage.results,
    byBereich: byBereich.results,
  })
})

// ── AKTIVITÄTEN REPORT ───────────────────────────────────────────────────────

reportsRouter.get('/activities', async (c) => {
  const db = c.env.DB
  const me = await getMe(c)
  if (!me) return c.json({ error: 'Nicht angemeldet' }, 401)

  const { period = 'month', user_id } = c.req.query()
  const owners = await getAllowedOwners(db, me, user_id)
  const ownerF = ownerFilter(owners)
  const dateF  = dateFilter(period, 'a.created_at')

  const [byType, byUser, byMonth, recentDone] = await Promise.all([
    db.prepare(`SELECT type, COUNT(*) as cnt FROM activities a
      WHERE ${ownerF.sql} AND ${dateF.sql}
      GROUP BY type ORDER BY cnt DESC`).bind(...ownerF.params, ...dateF.params).all(),

    db.prepare(`SELECT u.display_name, u.team,
        COUNT(*) as total,
        SUM(CASE WHEN a.status='done' THEN 1 ELSE 0 END) as done,
        SUM(CASE WHEN a.status='open' THEN 1 ELSE 0 END) as open
      FROM activities a JOIN users u ON a.owner_id=u.id
      WHERE ${ownerF.sql} AND ${dateF.sql}
      GROUP BY a.owner_id ORDER BY total DESC LIMIT 20`
    ).bind(...ownerF.params, ...dateF.params).all(),

    db.prepare(`SELECT strftime('%Y-%m', a.created_at) as month, COUNT(*) as cnt
      FROM activities a WHERE ${ownerF.sql}
      GROUP BY month ORDER BY month DESC LIMIT 12`
    ).bind(...ownerF.params).all(),

    db.prepare(`SELECT a.subject, a.type, a.done_at, co.name as firma, u.display_name as owner
      FROM activities a
      LEFT JOIN companies co ON a.company_id=co.id
      LEFT JOIN users u ON a.owner_id=u.id
      WHERE a.status='done' AND ${ownerF.sql} AND ${dateF.sql}
      ORDER BY a.done_at DESC LIMIT 20`
    ).bind(...ownerF.params, ...dateF.params).all(),
  ])

  return c.json({
    byType: byType.results,
    byUser: byUser.results,
    byMonth: byMonth.results,
    recentDone: recentDone.results,
  })
})

// ── TEAM PERFORMANCE (nur admin/sales_manager) ────────────────────────────────

reportsRouter.get('/team', async (c) => {
  const db = c.env.DB
  const me = await getMe(c)
  if (!me) return c.json({ error: 'Nicht angemeldet' }, 401)
  if (me.role === 'sales') return c.json({ error: 'Keine Berechtigung' }, 403)

  const { period = 'year', team } = c.req.query()
  const dateF = dateFilter(period, 'd.created_at')

  let teamFilter = ''
  let teamParams: string[] = []
  if (me.role === 'sales_manager') {
    teamFilter = 'AND u.team=?'
    teamParams = [me.team]
  } else if (team) {
    teamFilter = 'AND u.team=?'
    teamParams = [team]
  }

  const teamStats = await db.prepare(`
    SELECT u.id, u.display_name, u.team, u.employee_number, u.role,
      COUNT(DISTINCT d.id) as total_deals,
      SUM(CASE WHEN d.stage='won' AND ${dateF.sql} THEN 1 ELSE 0 END) as won_deals,
      ROUND(SUM(CASE WHEN d.stage='won' AND ${dateF.sql} THEN CAST(d.value as REAL) ELSE 0 END),2) as won_value,
      COUNT(DISTINCT a.id) as total_acts,
      SUM(CASE WHEN a.status='done' AND ${dateF.sql} THEN 1 ELSE 0 END) as done_acts
    FROM users u
    LEFT JOIN deals d ON d.owner_id=u.id
    LEFT JOIN activities a ON a.owner_id=u.id
    WHERE u.active=1 ${teamFilter}
    GROUP BY u.id
    ORDER BY won_value DESC
  `).bind(...teamParams, ...dateF.params, ...dateF.params, ...dateF.params).all()

  // Teams Übersicht
  const teamsOverview = await db.prepare(`
    SELECT u.team,
      COUNT(DISTINCT u.id) as members,
      COUNT(DISTINCT d.id) as deals,
      ROUND(SUM(CASE WHEN d.stage='won' THEN CAST(d.value as REAL) ELSE 0 END),2) as won_value,
      COUNT(DISTINCT a.id) as activities
    FROM users u
    LEFT JOIN deals d ON d.owner_id=u.id
    LEFT JOIN activities a ON a.owner_id=u.id
    WHERE u.active=1 AND u.team IS NOT NULL AND u.team != ''
    GROUP BY u.team ORDER BY won_value DESC
  `).all()

  return c.json({
    teamStats: teamStats.results,
    teamsOverview: teamsOverview.results,
    myTeam: me.team,
    role: me.role,
  })
})

// ── MRR / VERTRÄGE ───────────────────────────────────────────────────────────

reportsRouter.get('/mrr', async (c) => {
  const db = c.env.DB
  const me = await getMe(c)
  if (!me) return c.json({ error: 'Nicht angemeldet' }, 401)

  const [summary, byBereich, expiring, recent] = await Promise.all([
    db.prepare(`SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active,
      ROUND(SUM(CASE WHEN status='active' THEN CAST(monthly_value as REAL) ELSE 0 END),2) as mrr,
      ROUND(SUM(CASE WHEN status='active' THEN CAST(monthly_value as REAL)*12 ELSE 0 END),2) as arr
      FROM contracts`).first(),

    db.prepare(`SELECT COALESCE(NULLIF(bereich,''),'Sonstige') as bereich,
      COUNT(*) as cnt,
      ROUND(SUM(CASE WHEN status='active' THEN CAST(monthly_value as REAL) ELSE 0 END),2) as mrr
      FROM contracts GROUP BY bereich ORDER BY mrr DESC`).all(),

    db.prepare(`SELECT c.contract_number, c.product, c.bereich,
        c.end_date, c.monthly_value, co.name as company
      FROM contracts c
      LEFT JOIN companies co ON c.company_id=co.id
      WHERE c.status='active' AND c.end_date IS NOT NULL
        AND c.end_date <= date('now', '+90 days')
      ORDER BY c.end_date ASC LIMIT 15`).all(),

    db.prepare(`SELECT c.contract_number, c.product, c.bereich,
        c.start_date, c.monthly_value, co.name as company
      FROM contracts c
      LEFT JOIN companies co ON c.company_id=co.id
      WHERE c.status='active'
      ORDER BY c.start_date DESC LIMIT 10`).all(),
  ])

  return c.json({
    summary,
    byBereich: byBereich.results,
    expiring: expiring.results,
    recent: recent.results,
  })
})

// ── KUNDEN REPORT ────────────────────────────────────────────────────────────

reportsRouter.get('/customers', async (c) => {
  const db = c.env.DB
  const me = await getMe(c)
  if (!me) return c.json({ error: 'Nicht angemeldet' }, 401)
  if (me.role === 'sales') return c.json({ error: 'Keine Berechtigung' }, 403)

  const [byStatus, topByDeals, newByMonth, byBranche] = await Promise.all([
    db.prepare(`SELECT status, COUNT(*) as cnt FROM companies GROUP BY status ORDER BY cnt DESC`).all(),

    db.prepare(`SELECT co.name, co.status, co.bereich, co.erp_id as kundennr,
        COUNT(d.id) as deals,
        ROUND(SUM(CASE WHEN d.stage='won' THEN CAST(d.value as REAL) ELSE 0 END),2) as won_value,
        ROUND(SUM(CAST(ct.monthly_value as REAL)),2) as mrr
      FROM companies co
      LEFT JOIN deals d ON d.company_id=co.id
      LEFT JOIN contracts ct ON ct.company_id=co.id AND ct.status='active'
      GROUP BY co.id
      HAVING won_value > 0 OR mrr > 0
      ORDER BY won_value DESC LIMIT 20`).all(),

    db.prepare(`SELECT strftime('%Y-%m', created_at) as month,
        COUNT(*) as total,
        SUM(CASE WHEN status='customer' THEN 1 ELSE 0 END) as customers,
        SUM(CASE WHEN status='prospect' THEN 1 ELSE 0 END) as prospects
      FROM companies
      GROUP BY month ORDER BY month DESC LIMIT 12`).all(),

    db.prepare(`SELECT COALESCE(NULLIF(bereich,''),'Sonstige') as bereich,
        COUNT(*) as cnt
      FROM companies GROUP BY bereich ORDER BY cnt DESC LIMIT 10`).all(),
  ])

  return c.json({
    byStatus: byStatus.results,
    topByDeals: topByDeals.results,
    newByMonth: newByMonth.results,
    byBranche: byBranche.results,
  })
})

// ── VERFÜGBARE FILTER (User-Liste für Dropdown) ───────────────────────────────

reportsRouter.get('/filters', async (c) => {
  const db = c.env.DB
  const me = await getMe(c)
  if (!me) return c.json({ error: 'Nicht angemeldet' }, 401)

  let users: any[] = []
  let teams: string[] = []

  if (me.role === 'admin') {
    const { results } = await db.prepare(
      `SELECT id, display_name, team, employee_number FROM users WHERE active=1 ORDER BY display_name`
    ).all()
    users = results
    const { results: tr } = await db.prepare(
      `SELECT DISTINCT team FROM users WHERE active=1 AND team IS NOT NULL AND team!='' ORDER BY team`
    ).all()
    teams = tr.map((t: any) => t.team)
  } else if (me.role === 'sales_manager') {
    const { results } = await db.prepare(
      `SELECT id, display_name, team, employee_number FROM users WHERE team=? AND active=1 ORDER BY display_name`
    ).bind(me.team).all()
    users = results
    teams = [me.team]
  }

  return c.json({ users, teams, role: me.role, myId: me.id, myTeam: me.team })
})

export { reportsRouter }

// ── ZIELE (TARGETS) ───────────────────────────────────────────────────────────

reportsRouter.get('/targets', async (c) => {
  const db = c.env.DB
  const me = await getMe(c)
  if (!me) return c.json({ error: 'Nicht angemeldet' }, 401)
  const { year = new Date().getFullYear().toString() } = c.req.query()

  // Team-Ziele (nur admin/sales_manager)
  let teamTargets: any[] = []
  if (me.role !== 'sales') {
    const { results } = await db.prepare(
      `SELECT t.*, 
        ROUND(SUM(CASE WHEN d.stage='won' AND strftime('%Y',d.created_at)=? THEN d.value ELSE 0 END),2) as actual_revenue,
        ROUND(SUM(CASE WHEN d.stage='won' AND strftime('%Y',d.created_at)=? THEN d.margin_value ELSE 0 END),2) as actual_margin
       FROM targets t
       LEFT JOIN users u ON t.ref_id=u.id
       LEFT JOIN deals d ON d.owner_id=u.id
       WHERE t.type='team' AND t.period_year=? ${me.role==='sales_manager'?'AND t.ref_id=?':''}
       GROUP BY t.id ORDER BY t.ref_id`
    ).bind(year, year, parseInt(year), ...(me.role==='sales_manager'?[me.team]:[])).all()
    teamTargets = results as any[]
  }

  // User-Ziele
  const { results: userTargets } = await db.prepare(
    `SELECT t.*, u.display_name, u.team, u.employee_number,
      ROUND(SUM(CASE WHEN d.stage='won' AND strftime('%Y',d.created_at)=? THEN d.value ELSE 0 END),2) as actual_revenue,
      ROUND(SUM(CASE WHEN d.stage='won' AND strftime('%Y',d.created_at)=? THEN d.margin_value ELSE 0 END),2) as actual_margin
     FROM targets t
     JOIN users u ON t.ref_id=u.id
     LEFT JOIN deals d ON d.owner_id=u.id
     WHERE t.type='user' AND t.period_year=? ${me.role==='sales'?'AND t.ref_id=?':me.role==='sales_manager'?'AND u.team=?':''}
     GROUP BY t.id ORDER BY t.ref_id`
  ).bind(year, year, parseInt(year), ...(me.role==='sales'?[me.id]:me.role==='sales_manager'?[me.team]:[])).all()

  return c.json({ teamTargets, userTargets: userTargets as any[], year })
})

reportsRouter.patch('/targets/:id', async (c) => {
  const db = c.env.DB
  const me = await getMe(c)
  if (!me || me.role === 'sales') return c.json({ error: 'Keine Berechtigung' }, 403)
  const b = await c.req.json()
  const now = new Date().toISOString()
  await db.prepare(
    `UPDATE targets SET revenue_target=?, margin_target=?, margin_percent_target=?, updated_at=? WHERE id=?`
  ).bind(b.revenue_target||0, b.margin_target||0, b.margin_percent_target||0, now, c.req.param('id')).run()
  return c.json({ success: true })
})

reportsRouter.get('/margin', async (c) => {
  const db = c.env.DB
  const me = await getMe(c)
  if (!me) return c.json({ error: 'Nicht angemeldet' }, 401)
  const { period = 'year', user_id } = c.req.query()
  const owners = await getAllowedOwners(db, me, user_id)
  const ownerF = ownerFilter(owners)
  const dateF  = dateFilter(period, 'd.created_at')

  const [summary, byBereich, byUser, topMargin] = await Promise.all([
    db.prepare(`SELECT
      COUNT(*) as total,
      SUM(CASE WHEN stage='won' THEN 1 ELSE 0 END) as won,
      ROUND(SUM(CASE WHEN stage='won' THEN value ELSE 0 END),2) as won_revenue,
      ROUND(SUM(CASE WHEN stage='won' THEN cost_value ELSE 0 END),2) as won_cost,
      ROUND(SUM(CASE WHEN stage='won' THEN margin_value ELSE 0 END),2) as won_margin,
      ROUND(AVG(CASE WHEN stage='won' AND value>0 THEN margin_percent ELSE NULL END),1) as avg_margin_pct
      FROM deals d WHERE ${ownerF.sql} AND ${dateF.sql}`
    ).bind(...ownerF.params, ...dateF.params).first(),

    db.prepare(`SELECT COALESCE(NULLIF(d.bereich,''),'Sonstige') as bereich,
      COUNT(*) as cnt,
      ROUND(SUM(CASE WHEN d.stage='won' THEN d.value ELSE 0 END),2) as revenue,
      ROUND(SUM(CASE WHEN d.stage='won' THEN d.margin_value ELSE 0 END),2) as margin,
      ROUND(AVG(CASE WHEN d.stage='won' AND d.value>0 THEN d.margin_percent ELSE NULL END),1) as avg_pct
      FROM deals d WHERE ${ownerF.sql} AND ${dateF.sql}
      GROUP BY bereich ORDER BY margin DESC`
    ).bind(...ownerF.params, ...dateF.params).all(),

    db.prepare(`SELECT u.display_name, u.team, u.employee_number,
      ROUND(SUM(CASE WHEN d.stage='won' THEN d.value ELSE 0 END),2) as revenue,
      ROUND(SUM(CASE WHEN d.stage='won' THEN d.margin_value ELSE 0 END),2) as margin,
      ROUND(AVG(CASE WHEN d.stage='won' AND d.value>0 THEN d.margin_percent ELSE NULL END),1) as avg_pct
      FROM deals d JOIN users u ON d.owner_id=u.id
      WHERE ${ownerF.sql} AND ${dateF.sql}
      GROUP BY d.owner_id ORDER BY margin DESC LIMIT 15`
    ).bind(...ownerF.params, ...dateF.params).all(),

    db.prepare(`SELECT d.title, co.name as company, d.value, d.cost_value, d.margin_value, d.margin_percent, u.display_name as owner
      FROM deals d
      LEFT JOIN companies co ON d.company_id=co.id
      LEFT JOIN users u ON d.owner_id=u.id
      WHERE d.stage='won' AND ${ownerF.sql} AND ${dateF.sql}
      ORDER BY d.margin_value DESC LIMIT 10`
    ).bind(...ownerF.params, ...dateF.params).all(),
  ])

  return c.json({ summary, byBereich: byBereich.results, byUser: byUser.results, topMargin: topMargin.results })
})
