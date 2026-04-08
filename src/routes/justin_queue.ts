import { Hono } from 'hono'
import type { Env } from '../index'

export const justinQueueRouter = new Hono<{ Bindings: Env }>()

// ── Queue-Einträge abrufen ────────────────────────────────────────────────────
justinQueueRouter.get('/', async (c) => {
  const status = c.req.query('status') || 'all'
  const where = status !== 'all' ? `WHERE q.status='${status}'` : ''
  const rows = await c.env.DB.prepare(`
    SELECT q.*,
      CASE q.entity_type
        WHEN 'contact' THEN (SELECT first_name||' '||last_name FROM contacts WHERE id=q.entity_id)
        WHEN 'company' THEN (SELECT name FROM companies WHERE id=q.entity_id)
        WHEN 'deal'    THEN (SELECT title FROM deals WHERE id=q.entity_id)
        ELSE q.entity_name
      END as resolved_name,
      u.display_name as created_by_name
    FROM justin_queue q
    LEFT JOIN users u ON u.id=q.created_by
    ${where}
    ORDER BY q.created_at DESC LIMIT 100
  `).all()
  const counts = await c.env.DB.prepare(`
    SELECT status, COUNT(*) as cnt FROM justin_queue GROUP BY status
  `).all()
  return c.json({ queue: rows.results, counts: counts.results })
})

// ── Eintrag manuell hinzufügen ────────────────────────────────────────────────
justinQueueRouter.post('/', async (c) => {
  const email = c.req.header('Cf-Access-Authenticated-User-Email') || ''
  const me = await c.env.DB.prepare('SELECT id FROM users WHERE LOWER(email)=? LIMIT 1')
    .bind(email.toLowerCase()).first<{id:string}>()
  const b = await c.req.json() as any
  const id = 'jq-' + crypto.randomUUID().replace(/-/g,'').substring(0,12)
  const now = new Date().toISOString()
  await c.env.DB.prepare(`
    INSERT INTO justin_queue (id,entity_type,entity_id,entity_name,action,payload,status,attempts,created_by,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,0,?,?,?)
  `).bind(id, b.entity_type, b.entity_id, b.entity_name||null,
    b.action||'create', JSON.stringify(b.payload||{}),
    'pending', me?.id||null, now, now).run()
  return c.json({ id, success: true })
})

// ── Status aktualisieren ──────────────────────────────────────────────────────
justinQueueRouter.put('/:id', async (c) => {
  const b = await c.req.json() as any
  await c.env.DB.prepare(`
    UPDATE justin_queue SET status=?,last_error=?,updated_at=? WHERE id=?
  `).bind(b.status, b.last_error||null, new Date().toISOString(), c.req.param('id')).run()
  return c.json({ success: true })
})

// ── Eintrag löschen ───────────────────────────────────────────────────────────
justinQueueRouter.delete('/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM justin_queue WHERE id=?')
    .bind(c.req.param('id')).run()
  return c.json({ success: true })
})

// ── Alle erledigten löschen ───────────────────────────────────────────────────
justinQueueRouter.delete('/clear/done', async (c) => {
  await c.env.DB.prepare("DELETE FROM justin_queue WHERE status='sent'").run()
  return c.json({ success: true })
})

// ── Hilfsfunktion: Eintrag in Queue schreiben (aus anderen Routes) ────────────
export async function addToJustInQueue(
  db: D1Database,
  entityType: string,
  entityId: string,
  entityName: string,
  action: string,
  payload: object,
  createdBy?: string
) {
  const id = 'jq-' + crypto.randomUUID().replace(/-/g,'').substring(0,12)
  const now = new Date().toISOString()
  await db.prepare(`
    INSERT OR IGNORE INTO justin_queue (id,entity_type,entity_id,entity_name,action,payload,status,attempts,created_by,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,0,?,?,?)
  `).bind(id, entityType, entityId, entityName, action,
    JSON.stringify(payload), 'pending', createdBy||null, now, now).run().catch(()=>{})
}
