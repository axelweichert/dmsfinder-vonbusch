import { Hono } from 'hono'
import type { Env } from '../index'

export const contractsRouter = new Hono<{ Bindings: Env }>()

contractsRouter.get('/stats', async (c) => {
  const total  = await c.env.DB.prepare(`SELECT COUNT(*) as n, SUM(monthly_value) as mrr FROM contracts WHERE status='active'`).first<{n:number,mrr:number}>()
  const exp    = await c.env.DB.prepare(`SELECT COUNT(*) as n FROM contracts WHERE status='active' AND end_date <= date('now','+90 days')`).first<{n:number}>()
  const sla    = await c.env.DB.prepare(`SELECT COUNT(*) as n FROM contracts WHERE sla_status IN ('warning','breach')`).first<{n:number}>()
  return c.json({ total_active: total?.n??0, mrr: total?.mrr??0, expiring_90d: exp?.n??0, sla_issues: sla?.n??0 })
})

contractsRouter.get('/', async (c) => {
  const { status, bereich, sla_breach, expiring_days, limit = '100' } = c.req.query()
  let q = `SELECT cv.*, co.name as firma_name FROM contracts cv LEFT JOIN companies co ON cv.company_id = co.id WHERE 1=1`
  const p: any[] = []
  if (status)   { q += ' AND cv.status = ?';   p.push(status) }
  if (bereich)  { q += ' AND cv.bereich = ?';  p.push(bereich) }
  if (sla_breach === 'true') q += ` AND cv.sla_status IN ('warning','breach')`
  if (expiring_days) {
    const d = new Date(Date.now() + parseInt(expiring_days) * 86400000).toISOString().split('T')[0]
    q += ` AND cv.end_date <= ? AND cv.status = 'active'`; p.push(d)
  }
  q += ' ORDER BY cv.end_date ASC LIMIT ?'; p.push(parseInt(limit))
  const { results } = await c.env.DB.prepare(q).bind(...p).all()
  return c.json({ data: results })
})

contractsRouter.get('/:id', async (c) => {
  const cv = await c.env.DB.prepare(`SELECT cv.*, co.name as firma_name FROM contracts cv LEFT JOIN companies co ON cv.company_id = co.id WHERE cv.id = ?`).bind(c.req.param('id')).first()
  if (!cv) return c.json({ error: 'Not found' }, 404)
  return c.json(cv)
})

contractsRouter.post('/', async (c) => {
  const b = await c.req.json()
  const id = crypto.randomUUID(); const now = new Date().toISOString()
  const nr = `SV-${new Date().getFullYear().toString().slice(-2)}${String(Date.now()).slice(-3)}`
  await c.env.DB.prepare(
    `INSERT INTO contracts (id,contract_number,company_id,product,bereich,contract_type,start_date,end_date,auto_renew,renew_months,monthly_value,sla_type,sla_status,status,owner_id,notes,erp_id,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(id,nr,b.company_id,b.product,b.bereich||'',b.contract_type||'',b.start_date,b.end_date,b.auto_renew?1:0,b.renew_months||12,b.monthly_value||0,b.sla_type||'','ok','active',b.owner_id||null,b.notes||'',b.erp_id||null,now,now).run()
  return c.json({ id, contract_number: nr }, 201)
})

contractsRouter.patch('/:id', async (c) => {
  const b = await c.req.json(); const now = new Date().toISOString()
  const fields = Object.keys(b).map(k => `${k} = ?`).join(', ')
  await c.env.DB.prepare(`UPDATE contracts SET ${fields}, updated_at = ? WHERE id = ?`).bind(...Object.values(b), now, c.req.param('id')).run()
  return c.json({ success: true })
})
