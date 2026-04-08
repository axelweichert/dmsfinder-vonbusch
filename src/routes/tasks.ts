import { Hono } from 'hono'
import type { Env } from '../index'

export const tasksRouter = new Hono<{ Bindings: Env }>()

async function getMe(c: any) {
  const email = c.req.header('Cf-Access-Authenticated-User-Email') || 'axel.weichert@vonbusch.digital'
  const row = await c.env.DB.prepare('SELECT id,display_name,email FROM users WHERE email=?').bind(email).first() as any
  return row
}

// Gesundheitscheck für tasks
tasksRouter.get('/ping', async (c) => {
  return c.json({ ok: true, ts: new Date().toISOString() })
})

// Nur eigene Aufgaben — maximal simpel, kein JOIN
tasksRouter.get('/', async (c) => {
  const me = await getMe(c)
  const status = c.req.query('status') || 'open'
  let results: any[]
  if (status === 'all') {
    const r = await c.env.DB.prepare(
      'SELECT * FROM tasks WHERE assigned_to=? ORDER BY created_at DESC'
    ).bind(me?.id || '').all()
    results = r.results
  } else {
    const r = await c.env.DB.prepare(
      'SELECT * FROM tasks WHERE assigned_to=? AND status=? ORDER BY created_at DESC'
    ).bind(me?.id || '', status).all()
    results = r.results
  }
  return c.json({ data: results })
})

// Badge: eigene offene Aufgaben
tasksRouter.get('/count', async (c) => {
  const me = await getMe(c)
  if (!me) return c.json({ count: 0 })
  const row = await c.env.DB.prepare(
    "SELECT COUNT(*) as n FROM tasks WHERE status='open' AND assigned_to=?"
  ).bind(me.id).first() as any
  return c.json({ count: row?.n || 0 })
})

// Kalender: eigene offene Tasks mit Deadline
tasksRouter.get('/calendar', async (c) => {
  const me = await getMe(c)
  if (!me) return c.json({ data: [] })
  const r = await c.env.DB.prepare(
    "SELECT id,title,due_date,priority,status,related_name FROM tasks WHERE assigned_to=? AND due_date IS NOT NULL AND status='open' ORDER BY due_date ASC"
  ).bind(me.id).all()
  return c.json({ data: r.results })
})

// Aufgabe erstellen (Mail + Kalender werden erst in v2.5.x aktiviert)
tasksRouter.post('/', async (c) => {
  const me  = await getMe(c)
  const b   = await c.req.json() as any
  const now = new Date().toISOString()
  const id  = crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT INTO tasks(id,title,description,assigned_to,created_by,related_type,related_id,related_name,priority,status,due_date,created_at,updated_at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    id, b.title||'Neue Aufgabe', b.description||null,
    b.assigned_to||null, me?.id||null,
    b.related_type||null, b.related_id||null, b.related_name||null,
    b.priority||'normal', 'open', b.due_date||null, now, now
  ).run()
  return c.json({ success: true, id })
})

tasksRouter.patch('/:id', async (c) => {
  const b   = await c.req.json() as any
  const now = new Date().toISOString()
  const id  = c.req.param('id')
  const fields: string[] = []
  const args: any[] = []
  if (b.title       !== undefined) { fields.push('title=?');       args.push(b.title) }
  if (b.description !== undefined) { fields.push('description=?'); args.push(b.description) }
  if (b.assigned_to !== undefined) { fields.push('assigned_to=?'); args.push(b.assigned_to) }
  if (b.priority    !== undefined) { fields.push('priority=?');    args.push(b.priority) }
  if (b.status      !== undefined) { fields.push('status=?');      args.push(b.status) }
  if (b.due_date    !== undefined) { fields.push('due_date=?');    args.push(b.due_date) }
  if (!fields.length) return c.json({ error: 'Keine Felder' }, 400)
  fields.push('updated_at=?')
  args.push(now, id)
  await c.env.DB.prepare(`UPDATE tasks SET ${fields.join(',')} WHERE id=?`).bind(...args).run()
  return c.json({ success: true })
})

tasksRouter.delete('/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM tasks WHERE id=?').bind(c.req.param('id')).run()
  return c.json({ success: true })
})
