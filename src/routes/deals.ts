import { Hono } from 'hono'
import type { Env } from '../index'

export const dealsRouter = new Hono<{ Bindings: Env }>()

dealsRouter.get('/pipeline', async (c) => {
  const { bereich, owner_id } = c.req.query()
  let q = `SELECT d.*, co.name as firma_name, u.display_name as owner_name
    FROM deals d LEFT JOIN companies co ON d.company_id = co.id LEFT JOIN users u ON d.owner_id = u.id
    WHERE d.status = 'open'`
  const p: any[] = []
  if (bereich)  { q += ' AND d.bereich = ?';   p.push(bereich) }
  if (owner_id) { q += ' AND d.owner_id = ?';  p.push(owner_id) }
  q += ' ORDER BY d.value DESC'
  const { results } = await c.env.DB.prepare(q).bind(...p).all()
  const stages = ['lead','qualified','proposal','negotiation','won','lost']
  const pipe: Record<string, any[]> = {}
  stages.forEach(s => pipe[s] = [])
  results.forEach((d: any) => { if (pipe[d.stage]) pipe[d.stage].push(d) })
  return c.json(pipe)
})

dealsRouter.get('/', async (c) => {
  const { stage, bereich, owner_id, company_id, contact_id, limit = '100' } = c.req.query()
  let q = `SELECT d.*, co.name as firma_name FROM deals d LEFT JOIN companies co ON d.company_id = co.id WHERE d.status != 'deleted'`
  const p: any[] = []
  if (stage)      { q += ' AND d.stage = ?';      p.push(stage) }
  if (bereich)    { q += ' AND d.bereich = ?';    p.push(bereich) }
  if (owner_id)   { q += ' AND d.owner_id = ?';   p.push(owner_id) }
  if (company_id) { q += ' AND d.company_id = ?'; p.push(company_id) }
  if (contact_id) { q += ' AND d.contact_id = ?'; p.push(contact_id) }
  q += ' ORDER BY d.updated_at DESC LIMIT ?'; p.push(parseInt(limit))
  const { results } = await c.env.DB.prepare(q).bind(...p).all()
  return c.json({ data: results })
})

dealsRouter.get('/:id', async (c) => {
  const d = await c.env.DB.prepare(
    `SELECT d.*, co.name as firma_name FROM deals d LEFT JOIN companies co ON d.company_id = co.id WHERE d.id = ?`
  ).bind(c.req.param('id')).first()
  if (!d) return c.json({ error: 'Not found' }, 404)
  return c.json(d)
})

dealsRouter.post('/', async (c) => {
  const b = await c.req.json()
  const id = crypto.randomUUID(); const now = new Date().toISOString()
  const val = parseFloat(b.value) || 0
  const cost = parseFloat(b.cost_value) || 0
  const marginVal = val - cost
  const marginPct = val > 0 ? Math.round((marginVal / val) * 1000) / 10 : 0
  await c.env.DB.prepare(
    `INSERT INTO deals (id,title,company_id,contact_id,owner_id,bereich,stage,value,cost_value,margin_value,margin_percent,probability,expected_close,status,notes,erp_id,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(id,b.title,b.company_id,b.contact_id||null,b.owner_id,b.bereich||'',b.stage||'lead',val,cost,marginVal,marginPct,b.probability||10,b.expected_close||null,'open',b.notes||'',b.erp_id||null,now,now).run()
  return c.json({ id }, 201)
})

dealsRouter.patch('/:id', async (c) => {
  const b = await c.req.json(); const now = new Date().toISOString()
  // Marge automatisch berechnen wenn value oder cost_value geändert
  if (b.value !== undefined || b.cost_value !== undefined) {
    const existing = await c.env.DB.prepare('SELECT value, cost_value FROM deals WHERE id=?').bind(c.req.param('id')).first() as any
    const val  = parseFloat(b.value  ?? existing?.value  ?? 0) || 0
    const cost = parseFloat(b.cost_value ?? existing?.cost_value ?? 0) || 0
    b.margin_value   = Math.round((val - cost) * 100) / 100
    b.margin_percent = val > 0 ? Math.round(((val - cost) / val) * 1000) / 10 : 0
  }
  // won_at automatisch setzen wenn stage auf 'won' wechselt
  if (b.stage === 'won' && !b.won_at) {
    const existing = await c.env.DB.prepare('SELECT stage, won_at FROM deals WHERE id=?').bind(c.req.param('id')).first() as any
    if (existing && existing.stage !== 'won') {
      b.won_at = now
    }
  }
  const allowed = ['title','company_id','contact_id','owner_id','bereich','stage','value','cost_value','margin_value','margin_percent','probability','expected_close','status','notes','erp_id','won_at']
  const filtered = Object.fromEntries(Object.entries(b).filter(([k]) => allowed.includes(k)))
  const fields = Object.keys(filtered).map(k => `${k} = ?`).join(', ')
  if (!fields) return c.json({ success: true })
  await c.env.DB.prepare(`UPDATE deals SET ${fields}, updated_at = ? WHERE id = ?`).bind(...Object.values(filtered), now, c.req.param('id')).run()
  return c.json({ success: true })
})

