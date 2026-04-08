import { Hono } from 'hono'
import type { Env } from '../index'

export const usersRouter = new Hono<{ Bindings: Env }>()

usersRouter.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id,email,display_name,role,team,active FROM users WHERE active=1 ORDER BY display_name'
  ).all()
  return c.json({ data: results })
})

usersRouter.get('/me', async (c) => {
  const email = c.req.header('Cf-Access-Authenticated-User-Email') || 'victor.vonbusch@vonbusch.digital'
  let user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()
  if (!user) {
    const id = crypto.randomUUID(); const now = new Date().toISOString()
    const display = email.split('@')[0].split('.').map((s:string) => s.charAt(0).toUpperCase()+s.slice(1)).join(' ')
    await c.env.DB.prepare(`INSERT INTO users (id,email,display_name,role,active,created_at) VALUES (?,?,?,?,?,?)`)
      .bind(id,email,display,'sales',1,now).run()
    user = { id, email, display_name: display, role: 'sales', active: 1 }
  }
  return c.json(user)
})

usersRouter.patch('/:id', async (c) => {
  const b = await c.req.json(); const now = new Date().toISOString()
  const allowed = ['display_name','role','team','active','employee_number']
  const safe = Object.fromEntries(Object.entries(b).filter(([k]) => allowed.includes(k)))
  if (!Object.keys(safe).length) return c.json({ error: 'No valid fields' }, 400)
  const fields = Object.keys(safe).map(k => `${k} = ?`).join(', ')
  await c.env.DB.prepare(`UPDATE users SET ${fields}, updated_at = ? WHERE id = ?`)
    .bind(...Object.values(safe), now, c.req.param('id')).run()
  return c.json({ success: true })
})
