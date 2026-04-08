import { Hono } from 'hono'
import type { Env } from '../index'

export const notificationsRouter = new Hono<{ Bindings: Env }>()

function getEmail(c: any): string {
  return (c.req.header('Cf-Access-Authenticated-User-Email') || '').toLowerCase()
}

async function getUser(c: any) {
  const email = getEmail(c)
  return c.env.DB.prepare('SELECT id FROM users WHERE LOWER(email)=? LIMIT 1')
    .bind(email).first<{id:string}>().catch(() => null)
}

// ── Benachrichtigungen abrufen ────────────────────────────────────────────────
notificationsRouter.get('/', async (c) => {
  const me = await getUser(c)
  if (!me) return c.json({ notifications: [], unread: 0 })
  const rows = await c.env.DB.prepare(`
    SELECT * FROM notifications WHERE user_id=?
    ORDER BY created_at DESC LIMIT 50
  `).bind(me.id).all()
  const unread = (rows.results as any[]).filter(n => !n.is_read).length
  return c.json({ notifications: rows.results, unread })
})

// ── Ungelesen-Count ───────────────────────────────────────────────────────────
notificationsRouter.get('/count', async (c) => {
  const me = await getUser(c)
  if (!me) return c.json({ count: 0 })
  const r = await c.env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM notifications WHERE user_id=? AND is_read=0"
  ).bind(me.id).first<{cnt:number}>()
  return c.json({ count: r?.cnt || 0 })
})

// ── Als gelesen markieren ─────────────────────────────────────────────────────
notificationsRouter.put('/:id/read', async (c) => {
  const me = await getUser(c)
  if (!me) return c.json({ error: 'Unauthorized' }, 401)
  await c.env.DB.prepare(
    "UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?"
  ).bind(c.req.param('id'), me.id).run()
  return c.json({ success: true })
})

// ── Alle als gelesen markieren ────────────────────────────────────────────────
notificationsRouter.put('/read-all', async (c) => {
  const me = await getUser(c)
  if (!me) return c.json({ error: 'Unauthorized' }, 401)
  await c.env.DB.prepare(
    "UPDATE notifications SET is_read=1 WHERE user_id=?"
  ).bind(me.id).run()
  return c.json({ success: true })
})

// ── Notification erstellen (intern, aus anderen Routen) ───────────────────────
export async function createNotification(
  db: D1Database,
  userId: string,
  title: string,
  body: string,
  entityType: string,
  entityId: string,
  link = ''
) {
  const id = 'ntf-' + crypto.randomUUID().replace(/-/g,'').substring(0,10)
  await db.prepare(
    'INSERT INTO notifications (id,user_id,title,body,entity_type,entity_id,link,is_read,created_at) VALUES (?,?,?,?,?,?,?,0,?)'
  ).bind(id, userId, title, body, entityType, entityId, link, new Date().toISOString()).run().catch(() => {})
}
