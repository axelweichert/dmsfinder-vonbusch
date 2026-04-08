import { Hono } from 'hono'
import type { Env } from '../index'

export const templatesRouter = new Hono<{ Bindings: Env }>()

// GET /api/templates?type=brief
templatesRouter.get('/', async (c) => {
  const { type } = c.req.query()
  let q = "SELECT * FROM templates ORDER BY type, name"
  const p: any[] = []
  if (type) { q = "SELECT * FROM templates WHERE type = ? ORDER BY name"; p.push(type) }
  const { results } = await c.env.DB.prepare(q).bind(...p).all()
  return c.json({ data: results })
})

// GET /api/templates/:id
templatesRouter.get('/:id', async (c) => {
  const t = await c.env.DB.prepare('SELECT * FROM templates WHERE id = ?').bind(c.req.param('id')).first()
  if (!t) return c.json({ error: 'Not found' }, 404)
  return c.json(t)
})

// POST /api/templates
templatesRouter.post('/', async (c) => {
  const email = c.req.header('Cf-Access-Authenticated-User-Email') || c.req.header('X-Dev-Email') || ''
  const b = await c.req.json()
  if (!b.name || !b.body) return c.json({ error: 'name und body erforderlich' }, 400)
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  await c.env.DB.prepare(
    `INSERT INTO templates (id, name, type, subject, body, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, b.name, b.type || 'allgemein', b.subject || null, b.body, email, now, now).run()
  return c.json({ id }, 201)
})

// PATCH /api/templates/:id
templatesRouter.patch('/:id', async (c) => {
  const b = await c.req.json()
  const now = new Date().toISOString()
  const allowed = ['name', 'type', 'subject', 'body']
  const filtered = Object.fromEntries(Object.entries(b).filter(([k]) => allowed.includes(k)))
  if (!Object.keys(filtered).length) return c.json({ success: true })
  const fields = Object.keys(filtered).map(k => `${k} = ?`).join(', ')
  await c.env.DB.prepare(`UPDATE templates SET ${fields}, updated_at = ? WHERE id = ?`)
    .bind(...Object.values(filtered), now, c.req.param('id')).run()
  return c.json({ success: true })
})

// DELETE /api/templates/:id
templatesRouter.delete('/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM templates WHERE id = ?').bind(c.req.param('id')).run()
  return c.json({ success: true })
})
