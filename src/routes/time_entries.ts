import { Hono } from 'hono'
import type { Env } from '../index'

export const timeEntriesRouter = new Hono<{ Bindings: Env }>()

async function getMe(c: any) {
  const email = c.req.header('Cf-Access-Authenticated-User-Email') || ''
  return c.env.DB.prepare('SELECT id, display_name, role FROM users WHERE LOWER(email)=? LIMIT 1')
    .bind(email.toLowerCase()).first<{id:string,display_name:string,role:string}>().catch(() => null)
}

// GET /api/time-entries?project_id=xxx
timeEntriesRouter.get('/', async (c) => {
  const me = await getMe(c)
  if (!me) return c.json({ error: 'Unauthorized' }, 401)
  const projectId = c.req.query('project_id')
  if (!projectId) return c.json({ error: 'project_id required' }, 400)

  // Admins/Projektleitung sehen alle, Techniker nur eigene
  const isManager = ['admin','sales_manager','sales'].includes(me.role)
  const rows = await c.env.DB.prepare(`
    SELECT te.*, u.display_name as user_name
    FROM time_entries te
    JOIN users u ON u.id = te.user_id
    WHERE te.project_id = ? ${!isManager ? 'AND te.user_id = ?' : ''}
    ORDER BY te.entry_date DESC, te.created_at DESC
  `).bind(...(isManager ? [projectId] : [projectId, me.id])).all()

  // Summe berechnen
  const total = (rows.results as any[]).reduce((s, r) => s + (r.duration_hours || 0), 0)
  return c.json({ entries: rows.results, total_hours: Math.round(total * 100) / 100 })
})

// POST /api/time-entries
timeEntriesRouter.post('/', async (c) => {
  const me = await getMe(c)
  if (!me) return c.json({ error: 'Unauthorized' }, 401)
  const b = await c.req.json() as any
  if (!b.project_id || !b.entry_date || !b.duration_hours || !b.description) {
    return c.json({ error: 'project_id, entry_date, duration_hours, description erforderlich' }, 400)
  }
  const id = 'te-' + crypto.randomUUID().replace(/-/g,'').substring(0,12)
  const now = new Date().toISOString()
  await c.env.DB.prepare(`
    INSERT INTO time_entries (id,project_id,user_id,entry_date,duration_hours,description,task_id,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).bind(id, b.project_id, me.id, b.entry_date,
    parseFloat(b.duration_hours), b.description, b.task_id||null, now, now).run()
  return c.json({ id, success: true })
})

// DELETE /api/time-entries/:id
timeEntriesRouter.delete('/:id', async (c) => {
  const me = await getMe(c)
  if (!me) return c.json({ error: 'Unauthorized' }, 401)
  // Nur eigene Einträge löschen (außer Admin)
  const isAdmin = me.role === 'admin'
  await c.env.DB.prepare(
    isAdmin
      ? 'DELETE FROM time_entries WHERE id=?'
      : 'DELETE FROM time_entries WHERE id=? AND user_id=?'
  ).bind(...(isAdmin ? [c.req.param('id')] : [c.req.param('id'), me.id])).run()
  return c.json({ success: true })
})
