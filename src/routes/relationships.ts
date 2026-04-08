import { Hono } from 'hono'
import { Bindings } from '../types'

const app = new Hono<{ Bindings: Bindings }>()

function uid() {
  return 'rel-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

// GET /api/relationships?entity_id=xxx&entity_type=contact|company
app.get('/', async c => {
  const db = c.env.DB
  const entityId = c.req.query('entity_id')
  const entityType = c.req.query('entity_type') || 'contact'
  if (!entityId) return c.json({ error: 'entity_id required' }, 400)

  // Alle Beziehungen wo entity Quelle oder Ziel ist
  const rows = await db.prepare(`
    SELECT r.*,
      c1.first_name || ' ' || c1.last_name AS source_ct_name,
      fi1.name AS source_fi_name,
      c2.first_name || ' ' || c2.last_name AS target_ct_name,
      fi2.name AS target_fi_name
    FROM relationships r
    LEFT JOIN contacts c1 ON r.source_type='contact' AND r.source_id=c1.id
    LEFT JOIN companies fi1 ON r.source_type='company' AND r.source_id=fi1.id
    LEFT JOIN contacts c2 ON r.target_type='contact' AND r.target_id=c2.id
    LEFT JOIN companies fi2 ON r.target_type='company' AND r.target_id=fi2.id
    WHERE (r.source_type=? AND r.source_id=?) OR (r.target_type=? AND r.target_id=?)
    ORDER BY r.created_at DESC
  `).bind(entityType, entityId, entityType, entityId).all()

  return c.json({ data: rows.results })
})

// POST /api/relationships
app.post('/', async c => {
  const db = c.env.DB
  const body = await c.req.json()
  const { source_type, source_id, target_type, target_id, rel_type, note, created_by } = body
  if (!source_id || !target_id) return c.json({ error: 'source_id und target_id erforderlich' }, 400)

  const id = uid()
  const now = new Date().toISOString()
  await db.prepare(`
    INSERT INTO relationships (id,source_type,source_id,target_type,target_id,rel_type,note,created_at,created_by)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).bind(id, source_type||'contact', source_id, target_type||'contact', target_id, rel_type||'knows', note||null, now, created_by||null).run()

  return c.json({ id, success: true })
})

// DELETE /api/relationships/:id
app.delete('/:id', async c => {
  const db = c.env.DB
  await db.prepare('DELETE FROM relationships WHERE id=?').bind(c.req.param('id')).run()
  return c.json({ success: true })
})

export default app
