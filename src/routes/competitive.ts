import { Hono } from 'hono'
import { Bindings } from '../types'

const app = new Hono<{ Bindings: Bindings }>()
function uid() { return 'ci-' + Math.random().toString(36).slice(2,10) + Date.now().toString(36) }

// ── Mitbewerber Stammdaten ──

// GET /api/competitive/competitors
app.get('/competitors', async c => {
  const rows = await c.env.DB.prepare(
    `SELECT c.*, COUNT(dc.id) as deal_count,
      SUM(CASE WHEN dc.outcome='lost' THEN 1 ELSE 0 END) as lost_count,
      SUM(CASE WHEN dc.outcome='won' THEN 1 ELSE 0 END) as won_count
     FROM competitors c LEFT JOIN deal_competitors dc ON dc.competitor_id=c.id
     GROUP BY c.id ORDER BY lost_count DESC`
  ).all()
  return c.json({ data: rows.results })
})

// POST /api/competitive/competitors
app.post('/competitors', async c => {
  const { name, segment, website, notes } = await c.req.json()
  if (!name) return c.json({ error: 'name required' }, 400)
  const id = uid()
  await c.env.DB.prepare(
    `INSERT INTO competitors (id,name,segment,website,notes,created_at) VALUES (?,?,?,?,?,?)`
  ).bind(id, name, segment||null, website||null, notes||null, new Date().toISOString()).run()
  return c.json({ id, success: true })
})

// DELETE /api/competitive/competitors/:id
app.delete('/competitors/:id', async c => {
  await c.env.DB.prepare('DELETE FROM competitors WHERE id=?').bind(c.req.param('id')).run()
  await c.env.DB.prepare('DELETE FROM deal_competitors WHERE competitor_id=?').bind(c.req.param('id')).run()
  return c.json({ success: true })
})

// ── Deal-Mitbewerber ──

// GET /api/competitive/deal/:dealId
app.get('/deal/:dealId', async c => {
  const rows = await c.env.DB.prepare(
    `SELECT dc.*, c.name as competitor_name, c.segment
     FROM deal_competitors dc JOIN competitors c ON c.id=dc.competitor_id
     WHERE dc.deal_id=? ORDER BY dc.created_at DESC`
  ).bind(c.req.param('dealId')).all()
  return c.json({ data: rows.results })
})

// POST /api/competitive/deal
app.post('/deal', async c => {
  const { deal_id, competitor_id, outcome, notes } = await c.req.json()
  if (!deal_id || !competitor_id) return c.json({ error: 'deal_id und competitor_id erforderlich' }, 400)
  const id = uid()
  await c.env.DB.prepare(
    `INSERT INTO deal_competitors (id,deal_id,competitor_id,outcome,notes,created_at) VALUES (?,?,?,?,?,?)`
  ).bind(id, deal_id, competitor_id, outcome||'unknown', notes||null, new Date().toISOString()).run()
  return c.json({ id, success: true })
})

// PATCH /api/competitive/deal/:id — Outcome updaten
app.patch('/deal/:id', async c => {
  const { outcome, notes } = await c.req.json()
  await c.env.DB.prepare(
    `UPDATE deal_competitors SET outcome=COALESCE(?,outcome), notes=COALESCE(?,notes) WHERE id=?`
  ).bind(outcome||null, notes||null, c.req.param('id')).run()
  return c.json({ success: true })
})

// DELETE /api/competitive/deal/:id
app.delete('/deal/:id', async c => {
  await c.env.DB.prepare('DELETE FROM deal_competitors WHERE id=?').bind(c.req.param('id')).run()
  return c.json({ success: true })
})

// ── Report: Verlustanalyse ──
// GET /api/competitive/report
app.get('/report', async c => {
  const rows = await c.env.DB.prepare(`
    SELECT c.name, c.segment,
      COUNT(dc.id) as total,
      SUM(CASE WHEN dc.outcome='lost' THEN 1 ELSE 0 END) as lost,
      SUM(CASE WHEN dc.outcome='won'  THEN 1 ELSE 0 END) as won,
      ROUND(SUM(CASE WHEN dc.outcome='lost' THEN 1.0 ELSE 0 END)*100/COUNT(dc.id)) as loss_rate
    FROM competitors c JOIN deal_competitors dc ON dc.competitor_id=c.id
    GROUP BY c.id ORDER BY lost DESC
  `).all()
  const bySegment = await c.env.DB.prepare(`
    SELECT c.segment, COUNT(dc.id) as total,
      SUM(CASE WHEN dc.outcome='lost' THEN 1 ELSE 0 END) as lost
    FROM competitors c JOIN deal_competitors dc ON dc.competitor_id=c.id
    WHERE c.segment IS NOT NULL
    GROUP BY c.segment ORDER BY lost DESC
  `).all()
  return c.json({ competitors: rows.results, by_segment: bySegment.results })
})


// POST /api/competitive/competitors/:id/analyze — KI-Analyse
app.post('/competitors/:id/analyze', async c => {
  const id = c.req.param('id')
  const comp = await c.env.DB.prepare('SELECT * FROM competitors WHERE id=?').bind(id).first<{name:string,segment:string,website:string,notes:string,ai_analysis:string}>()
  if (!comp) return c.json({ error: 'Nicht gefunden' }, 404)

  const prompt = `Du bist Vertriebsberater bei von Busch GmbH, einem IT-Systemhaus in Bielefeld.
Analysiere den Mitbewerber "${comp.name}"${comp.segment ? ` (Segment: ${comp.segment})` : ''}${comp.website ? ` (Website: ${comp.website})` : ''}.
${comp.notes ? `Bekannte Informationen: ${comp.notes}` : ''}

Erstelle eine strukturierte Analyse mit:
1. **Stärken** (3-5 Punkte, was macht dieser Mitbewerber gut?)
2. **Schwächen** (3-5 Punkte, wo hat er Lücken oder Nachteile?)
3. **Typische Kundensegmente** (Wer kauft bei denen?)
4. **Unsere Differenzierung** (Wie positioniert sich von Busch GmbH dagegen?)
5. **Empfehlung** (1-2 Sätze konkrete Handlungsempfehlung für den Vertrieb)

Antworte auf Deutsch, prägnant und praxisnah. Nutze Markdown-Formatierung.`

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': c.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    const data = await aiRes.json() as any
    const analysis = data?.content?.[0]?.text || ''
    if (!analysis) return c.json({ error: 'KI-Analyse fehlgeschlagen' }, 500)

    await c.env.DB.prepare('UPDATE competitors SET ai_analysis=?, ai_analyzed_at=? WHERE id=?')
      .bind(analysis, new Date().toISOString(), id).run()

    return c.json({ analysis, analyzed_at: new Date().toISOString() })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /api/competitive/competitors/:id — Einzelner Mitbewerber
app.get('/competitors/:id', async c => {
  const comp = await c.env.DB.prepare('SELECT * FROM competitors WHERE id=?').bind(c.req.param('id')).first()
  if (!comp) return c.json({ error: 'Nicht gefunden' }, 404)
  return c.json(comp)
})


// PATCH /api/competitive/competitors/:id — Mitbewerber bearbeiten
app.patch('/competitors/:id', async c => {
  const { name, segment, website, notes } = await c.req.json()
  await c.env.DB.prepare(
    `UPDATE competitors SET name=COALESCE(?,name), segment=COALESCE(?,segment), website=COALESCE(?,website), notes=COALESCE(?,notes) WHERE id=?`
  ).bind(name||null, segment||null, website||null, notes||null, c.req.param('id')).run()
  return c.json({ success: true })
})

// POST /api/competitive/competitors/:id/analyze — KI-Analyse
app.post('/competitors/:id/analyze', async c => {
  const id = c.req.param('id')
  const comp = await c.env.DB.prepare('SELECT * FROM competitors WHERE id=?').bind(id).first<{name:string,segment:string,website:string,notes:string}>()
  if (!comp) return c.json({ error: 'Nicht gefunden' }, 404)
  const prompt = `Du bist Vertriebsberater bei von Busch GmbH, einem IT-Systemhaus in Bielefeld.
Analysiere den Mitbewerber "${comp.name}"${comp.segment ? ` (Segment: ${comp.segment})` : ''}${comp.website ? ` (Website: ${comp.website})` : ''}.
${comp.notes ? `Bekannte Informationen: ${comp.notes}` : ''}
Erstelle eine strukturierte Analyse mit:
1. **Stärken** (3-5 Punkte)
2. **Schwächen** (3-5 Punkte)
3. **Typische Kundensegmente**
4. **Unsere Differenzierung** (von Busch GmbH)
5. **Empfehlung** (1-2 Sätze für den Vertrieb)
Antworte auf Deutsch, prägnant. Nutze Markdown-Formatierung.`
  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': c.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] })
    })
    const data = await aiRes.json() as any
    const analysis = data?.content?.[0]?.text || ''
    if (!analysis) return c.json({ error: 'KI-Analyse fehlgeschlagen' }, 500)
    await c.env.DB.prepare('UPDATE competitors SET ai_analysis=?, ai_analyzed_at=? WHERE id=?')
      .bind(analysis, new Date().toISOString(), id).run()
    return c.json({ analysis, analyzed_at: new Date().toISOString() })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

// GET /api/competitive/competitors/:id
app.get('/competitors/:id', async c => {
  const comp = await c.env.DB.prepare('SELECT * FROM competitors WHERE id=?').bind(c.req.param('id')).first()
  if (!comp) return c.json({ error: 'Nicht gefunden' }, 404)
  return c.json(comp)
})

export default app
