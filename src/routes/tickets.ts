import { Hono } from 'hono'
import type { Env } from '../index'

export const ticketsRouter = new Hono<{ Bindings: Env }>()

ticketsRouter.get('/', async (c) => {
  const { status, priority, assigned_to, company_id, contact_id, limit = '100' } = c.req.query()
  let q = `SELECT t.*, co.name as firma_name, u.display_name as assignee_name
    FROM tickets t LEFT JOIN companies co ON t.company_id = co.id LEFT JOIN users u ON t.assigned_to = u.id WHERE 1=1`
  const p: any[] = []
  if (status)     { q += ' AND t.status = ?';     p.push(status) }
  if (priority)   { q += ' AND t.priority = ?';   p.push(priority) }
  if (assigned_to){ q += ' AND t.assigned_to = ?';p.push(assigned_to) }
  if (company_id) { q += ' AND t.company_id = ?'; p.push(company_id) }
  if (contact_id) { q += ' AND t.contact_id = ?'; p.push(contact_id) }
  q += ' ORDER BY CASE t.priority WHEN "high" THEN 1 WHEN "medium" THEN 2 ELSE 3 END, t.created_at DESC LIMIT ?'; p.push(parseInt(limit))
  const { results } = await c.env.DB.prepare(q).bind(...p).all()
  return c.json({ data: results })
})

ticketsRouter.get('/:id', async (c) => {
  const t = await c.env.DB.prepare(
    `SELECT t.*, co.name as firma_name, u.display_name as assignee_name FROM tickets t LEFT JOIN companies co ON t.company_id = co.id LEFT JOIN users u ON t.assigned_to = u.id WHERE t.id = ?`
  ).bind(c.req.param('id')).first()
  if (!t) return c.json({ error: 'Not found' }, 404)
  return c.json(t)
})

ticketsRouter.post('/', async (c) => {
  const b = await c.req.json()
  const id = crypto.randomUUID(); const now = new Date().toISOString()
  const nr = `#${Date.now().toString().slice(-4)}`
  await c.env.DB.prepare(
    `INSERT INTO tickets (id,ticket_number,subject,description,company_id,contact_id,assigned_to,bereich,priority,status,erp_service_id,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(id,nr,b.subject,b.description||'',b.company_id,b.contact_id||null,b.assigned_to||null,b.bereich||'',b.priority||'medium','open',b.erp_service_id||null,now,now).run()
  return c.json({ id, ticket_number: nr }, 201)
})

ticketsRouter.patch('/:id', async (c) => {
  const b = await c.req.json(); const now = new Date().toISOString()
  const fields = Object.keys(b).map(k => `${k} = ?`).join(', ')
  await c.env.DB.prepare(`UPDATE tickets SET ${fields}, updated_at = ? WHERE id = ?`).bind(...Object.values(b), now, c.req.param('id')).run()
  return c.json({ success: true })
})
