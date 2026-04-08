import { Hono } from 'hono'
import { Bindings } from '../types'

const app = new Hono<{ Bindings: Bindings }>()
function uid() { return 'cf-' + Math.random().toString(36).slice(2,10) + Date.now().toString(36) }

// ── Felddefinitionen ──

// GET /api/custom-fields/defs?entity_type=contact|company|deal
app.get('/defs', async c => {
  const et = c.req.query('entity_type')
  const query = et
    ? `SELECT * FROM custom_field_defs WHERE entity_type=? ORDER BY sort_order,created_at`
    : `SELECT * FROM custom_field_defs ORDER BY entity_type,sort_order,created_at`
  const rows = et
    ? await c.env.DB.prepare(query).bind(et).all()
    : await c.env.DB.prepare(query).all()
  return c.json({ data: rows.results })
})

// POST /api/custom-fields/defs
app.post('/defs', async c => {
  const { entity_type, field_label, field_type, options, required, sort_order } = await c.req.json()
  if (!entity_type || !field_label) return c.json({ error: 'entity_type und field_label erforderlich' }, 400)
  const id = uid()
  const field_key = field_label.toLowerCase().replace(/[^a-z0-9]/g,'_').replace(/_+/g,'_')
  await c.env.DB.prepare(
    `INSERT INTO custom_field_defs (id,entity_type,field_label,field_key,field_type,options,required,sort_order,created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`
  ).bind(id, entity_type, field_label, field_key, field_type||'text', options||null, required?1:0, sort_order||0, new Date().toISOString()).run()
  return c.json({ id, success: true })
})

// PATCH /api/custom-fields/defs/:id
app.patch('/defs/:id', async c => {
  const { field_label, field_type, options, required, sort_order } = await c.req.json()
  await c.env.DB.prepare(
    `UPDATE custom_field_defs SET field_label=COALESCE(?,field_label),field_type=COALESCE(?,field_type),
     options=COALESCE(?,options),required=COALESCE(?,required),sort_order=COALESCE(?,sort_order) WHERE id=?`
  ).bind(field_label||null, field_type||null, options||null, required!=null?required?1:0:null, sort_order!=null?sort_order:null, c.req.param('id')).run()
  return c.json({ success: true })
})

// DELETE /api/custom-fields/defs/:id
app.delete('/defs/:id', async c => {
  await c.env.DB.prepare('DELETE FROM custom_field_defs WHERE id=?').bind(c.req.param('id')).run()
  await c.env.DB.prepare('DELETE FROM custom_field_values WHERE field_id=?').bind(c.req.param('id')).run()
  return c.json({ success: true })
})

// ── Feldwerte ──

// GET /api/custom-fields/values?entity_type=contact&entity_id=ct-xxx
app.get('/values', async c => {
  const { entity_type, entity_id } = c.req.query()
  if (!entity_id) return c.json({ error: 'entity_id required' }, 400)
  const rows = await c.env.DB.prepare(
    `SELECT cfv.*, cfd.id as def_id, cfd.field_label, cfd.field_type, cfd.field_key, cfd.options, cfd.sort_order
     FROM custom_field_defs cfd
     LEFT JOIN custom_field_values cfv ON cfv.field_id=cfd.id AND cfv.entity_id=?
     WHERE cfd.entity_type=? ORDER BY cfd.sort_order, cfd.created_at`
  ).bind(entity_id, entity_type||'contact').all()
  return c.json({ data: rows.results })
})

// POST /api/custom-fields/values — upsert
app.post('/values', async c => {
  const { entity_type, entity_id, field_id, value } = await c.req.json()
  if (!entity_id || !field_id) return c.json({ error: 'entity_id und field_id erforderlich' }, 400)
  const id = uid()
  const now = new Date().toISOString()
  await c.env.DB.prepare(
    `INSERT INTO custom_field_values (id,entity_type,entity_id,field_id,value,updated_at)
     VALUES (?,?,?,?,?,?)
     ON CONFLICT(entity_id,field_id) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`
  ).bind(id, entity_type||'contact', entity_id, field_id, value||null, now).run()
  return c.json({ success: true })
})

export default app
