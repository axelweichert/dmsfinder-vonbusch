import { Hono } from 'hono'

const selectionsRouter = new Hono<{ Bindings: { DB: D1Database; ANTHROPIC_API_KEY: string } }>()

// Filter-Felder Definition
const FILTER_FIELDS: Record<string, { label: string; type: string; ops: string[] }> = {
  // Firma
  'co.status':           { label:'Firmenstatus',       type:'select', ops:['eq','neq'] },
  'co.bereich':          { label:'Geschäftsbereich',   type:'multi',  ops:['in','not_in'] },
  'co.zip':              { label:'PLZ (beginnt mit)',  type:'text',   ops:['starts'] },
  'co.city':             { label:'Stadt',              type:'text',   ops:['contains','eq'] },
  // Kontakt
  'ct.position':         { label:'Position/Rolle',     type:'text',   ops:['contains','eq'] },
  'ct.marketing_global_optin': { label:'Newsletter Opt-in', type:'bool', ops:['eq'] },
  'ct.interests':        { label:'Interessen (Tags)',  type:'text',   ops:['contains'] },
  // Aktivitäten
  'last_activity_days':  { label:'Letzter Kontakt (Tage)', type:'number', ops:['lt','gt','eq'] },
  'no_activity':         { label:'Kein Kontakt seit X Tagen', type:'number', ops:['gt'] },
  // Marketing
  'mkt_action':          { label:'Marketing-Aktion erhalten', type:'text', ops:['eq','not_exists'] },
  // Deals
  'has_open_deal':       { label:'Offener Deal vorhanden', type:'bool', ops:['eq'] },
  'has_won_deal':        { label:'Gewonnener Deal', type:'bool', ops:['eq'] },
}

// ── SQL-GENERATOR ─────────────────────────────────────────────────────────────

function buildQuery(filters: any[], entity: string): { sql: string; params: any[] } {
  const params: any[] = []
  const joins: string[] = []
  const wheres: string[] = []

  let base = entity === 'companies'
    ? `SELECT DISTINCT co.id, co.name, co.status, co.bereich, co.phone, co.email, co.city, co.zip FROM companies co`
    : `SELECT DISTINCT ct.id, ct.first_name, ct.last_name, ct.email, ct.phone, ct.position,
       co.name as firma_name, co.status as firma_status, co.bereich, co.city
       FROM contacts ct LEFT JOIN companies co ON co.id = ct.company_id`

  for (const f of filters) {
    const { field, op, value } = f
    if (!field || op === undefined || value === undefined) continue

    if (field === 'co.status') {
      wheres.push(op === 'eq' ? `co.status = ?` : `co.status != ?`); params.push(value)
    } else if (field === 'co.bereich') {
      const vals = Array.isArray(value) ? value : [value]
      const ph = vals.map(() => '?').join(',')
      wheres.push(op === 'in' ? `co.bereich IN (${ph})` : `co.bereich NOT IN (${ph})`); params.push(...vals)
    } else if (field === 'co.zip') {
      wheres.push(`co.zip LIKE ?`); params.push(value + '%')
    } else if (field === 'co.city') {
      wheres.push(op === 'contains' ? `co.city LIKE ?` : `co.city = ?`); params.push(op === 'contains' ? '%'+value+'%' : value)
    } else if (field === 'ct.position') {
      wheres.push(op === 'contains' ? `ct.position LIKE ?` : `ct.position = ?`); params.push(op === 'contains' ? '%'+value+'%' : value)
    } else if (field === 'ct.marketing_global_optin') {
      wheres.push(`ct.marketing_global_optin = ?`); params.push(value ? 1 : 0)
    } else if (field === 'ct.interests') {
      wheres.push(`ct.interests LIKE ?`); params.push('%'+value+'%')
    } else if (field === 'last_activity_days') {
      const dateRef = `datetime('now', '-${parseInt(value)} days')`
      if (op === 'lt') {
        // letzter Kontakt innerhalb der letzten X Tage
        if (!joins.includes('act')) { joins.push('act'); base += ` LEFT JOIN (SELECT company_id, MAX(created_at) as last_act FROM activities GROUP BY company_id) la ON la.company_id = co.id` }
        wheres.push(`la.last_act >= ${dateRef}`)
      } else {
        if (!joins.includes('act')) { joins.push('act'); base += ` LEFT JOIN (SELECT company_id, MAX(created_at) as last_act FROM activities GROUP BY company_id) la ON la.company_id = co.id` }
        wheres.push(`(la.last_act < ${dateRef} OR la.last_act IS NULL)`)
      }
    } else if (field === 'has_open_deal') {
      if (value) {
        wheres.push(`EXISTS (SELECT 1 FROM deals d WHERE d.company_id = co.id AND d.status NOT IN ('won','lost'))`)
      } else {
        wheres.push(`NOT EXISTS (SELECT 1 FROM deals d WHERE d.company_id = co.id AND d.status NOT IN ('won','lost'))`)
      }
    } else if (field === 'has_won_deal') {
      if (value) {
        wheres.push(`EXISTS (SELECT 1 FROM deals d WHERE d.company_id = co.id AND d.status = 'won')`)
      } else {
        wheres.push(`NOT EXISTS (SELECT 1 FROM deals d WHERE d.company_id = co.id AND d.status = 'won')`)
      }
    } else if (field === 'mkt_action') {
      if (op === 'eq') {
        wheres.push(`EXISTS (SELECT 1 FROM contact_marketing_tags m WHERE m.contact_id = ct.id AND m.action = ? AND m.status IN ('opted_in','sent'))`)
        params.push(value)
      } else {
        wheres.push(`NOT EXISTS (SELECT 1 FROM contact_marketing_tags m WHERE m.contact_id = ct.id AND m.action = ?)`)
        params.push(value)
      }
    }
  }

  let sql = base
  if (wheres.length) sql += ` WHERE ` + wheres.join(' AND ')
  sql += ` LIMIT 500`
  return { sql, params }
}

// ── SELEKTION AUSFÜHREN (ohne Speichern) ──────────────────────────────────────

selectionsRouter.post('/run', async (c) => {
  const { filters = [], entity_type = 'contacts' } = await c.req.json() as any
  const { sql, params } = buildQuery(filters, entity_type)
  try {
    const r = params.length ? await c.env.DB.prepare(sql).bind(...params).all() : await c.env.DB.prepare(sql).all()
    return c.json({ results: r.results, count: r.results.length, sql: sql.substring(0, 200) })
  } catch(e: any) {
    return c.json({ error: e.message, sql }, 400)
  }
})

// ── KI-SELEKTION ──────────────────────────────────────────────────────────────

selectionsRouter.post('/ai-suggest', async (c) => {
  const { prompt: userPrompt, entity_type = 'contacts' } = await c.req.json() as any
  const apiKey = c.env.ANTHROPIC_API_KEY
  if (!apiKey) return c.json({ error: 'API-Key fehlt' }, 503)

  // Verfügbare Werte für Kontext laden
  const bereiche = await c.env.DB.prepare(`SELECT DISTINCT bereich FROM companies WHERE bereich IS NOT NULL ORDER BY bereich`).all()
  const positionen = await c.env.DB.prepare(`SELECT DISTINCT position FROM contacts WHERE position IS NOT NULL LIMIT 30`).all()

  const aiPrompt = `Du bist ein CRM-Assistent der von Busch GmbH (IT-Systemhaus).
Der Nutzer möchte eine Kontakt/Firmen-Selektion erstellen.

Nutzer-Anfrage: "${userPrompt}"

Verfügbare Geschäftsbereiche: ${(bereiche.results as any[]).map(r => r.bereich).join(', ')}
Bekannte Positionen (Beispiele): ${(positionen.results as any[]).slice(0, 15).map(r => r.position).join(', ')}

Verfügbare Filter-Felder:
- co.status: Firmenstatus (Werte: "customer", "prospect", "inactive")
- co.bereich: Geschäftsbereich (op: "in" oder "not_in", value: Array)
- co.zip: PLZ beginnt mit (op: "starts", value: z.B. "3", "32", "4")
- co.city: Stadtname (op: "contains" oder "eq")
- ct.position: Position/Rolle (op: "contains", value: Suchtext)
- ct.interests: Interessen-Tags (op: "contains", value: Suchtext)
- ct.marketing_global_optin: Newsletter Opt-in (op: "eq", value: true/false)
- last_activity_days: Letzter Kontakt in X Tagen (op: "lt"=innerhalb, "gt"=länger her, value: Anzahl Tage)
- has_open_deal: Hat offenen Deal (op: "eq", value: true/false)
- has_won_deal: Hat gewonnenen Deal (op: "eq", value: true/false)
- mkt_action: Marketing-Aktion erhalten (op: "eq"=ja / "not_exists"=nein, value: Aktionsname)

Erstelle eine sinnvolle Filter-Kombination. Antworte NUR als JSON:
{
  "filters": [
    {"field": "...", "op": "...", "value": "..."},
    ...
  ],
  "name": "Vorschlag für einen Selektionsnamen",
  "explanation": "Kurze Erklärung was diese Selektion liefert und warum diese Filter gewählt wurden"
}`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key':apiKey, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:1024,
        messages:[{ role:'user', content:aiPrompt }] })
    })
    const data = await res.json() as any
    const text = data?.content?.[0]?.text || ''
    const clean = text.replace(/```json|```/g,'').trim()
    const parsed = JSON.parse(clean)

    // Gleich ausführen und Ergebnis mitliefern
    if (parsed.filters?.length) {
      const { sql, params } = buildQuery(parsed.filters, entity_type)
      try {
        const r = params.length ? await c.env.DB.prepare(sql).bind(...params).all() : await c.env.DB.prepare(sql).all()
        parsed.preview = (r.results as any[]).slice(0, 10)
        parsed.count = r.results.length
      } catch(_) { parsed.count = 0; parsed.preview = [] }
    }
    return c.json({ success: true, ...parsed })
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ── SELEKTION SPEICHERN ───────────────────────────────────────────────────────

selectionsRouter.post('/', async (c) => {
  const b = await c.req.json() as any
  const now = new Date().toISOString()
  const id = crypto.randomUUID()

  // Ergebnis-Count berechnen
  let count = 0
  try {
    const { sql, params } = buildQuery(b.filters || [], b.entity_type || 'contacts')
    const r = params.length ? await c.env.DB.prepare(sql).bind(...params).all() : await c.env.DB.prepare(sql).all()
    count = r.results.length
  } catch(_) {}

  await c.env.DB.prepare(
    `INSERT INTO selections (id,name,description,entity_type,filters,result_count,last_run_at,created_by,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  ).bind(id, b.name, b.description||null, b.entity_type||'contacts',
    JSON.stringify(b.filters||[]), count, now, b.created_by||null, now, now).run()

  return c.json({ id, count, success: true })
})

// ── SELEKTIONEN LISTE ─────────────────────────────────────────────────────────

selectionsRouter.get('/', async (c) => {
  const r = await c.env.DB.prepare('SELECT * FROM selections ORDER BY updated_at DESC').all()
  return c.json(r.results)
})

// ── SELEKTION DETAIL & NEU AUSFÜHREN ─────────────────────────────────────────

selectionsRouter.get('/:id', async (c) => {
  const sel = await c.env.DB.prepare('SELECT * FROM selections WHERE id=?').bind(c.req.param('id')).first() as any
  if (!sel) return c.json({ error: 'Nicht gefunden' }, 404)
  return c.json({ ...sel, filters: JSON.parse(sel.filters||'[]') })
})

selectionsRouter.post('/:id/run', async (c) => {
  const sel = await c.env.DB.prepare('SELECT * FROM selections WHERE id=?').bind(c.req.param('id')).first() as any
  if (!sel) return c.json({ error: 'Nicht gefunden' }, 404)
  const filters = JSON.parse(sel.filters||'[]')
  const { sql, params } = buildQuery(filters, sel.entity_type)
  const now = new Date().toISOString()
  try {
    const r = params.length ? await c.env.DB.prepare(sql).bind(...params).all() : await c.env.DB.prepare(sql).all()
    await c.env.DB.prepare('UPDATE selections SET result_count=?, last_run_at=?, updated_at=? WHERE id=?')
      .bind(r.results.length, now, now, c.req.param('id')).run()
    return c.json({ results: r.results, count: r.results.length })
  } catch(e: any) {
    return c.json({ error: e.message }, 400)
  }
})

// ── CSV-EXPORT ────────────────────────────────────────────────────────────────

selectionsRouter.post('/:id/export-csv', async (c) => {
  const sel = await c.env.DB.prepare('SELECT * FROM selections WHERE id=?').bind(c.req.param('id')).first() as any
  if (!sel) return c.json({ error: 'Nicht gefunden' }, 404)
  const filters = JSON.parse(sel.filters||'[]')
  const { sql, params } = buildQuery(filters, sel.entity_type)
  const r = params.length ? await c.env.DB.prepare(sql).bind(...params).all() : await c.env.DB.prepare(sql).all()
  const rows = r.results as any[]
  if (!rows.length) return c.json({ error: 'Keine Ergebnisse' }, 404)

  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(';'),
    ...rows.map(row => headers.map(h => {
      const v = row[h] ?? ''
      return typeof v === 'string' && v.includes(';') ? `"${v}"` : String(v)
    }).join(';'))
  ].join('\r\n')

  const bom = '\uFEFF' // UTF-8 BOM für Excel
  return new Response(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="selektion-${sel.name.replace(/\s+/g,'-')}.csv"`
    }
  })
})

// ── IN WEBINAR EINLADEN ───────────────────────────────────────────────────────

selectionsRouter.post('/:id/invite-webinar', async (c) => {
  const { webinar_id, status = 'invited' } = await c.req.json() as any
  if (!webinar_id) return c.json({ error: 'webinar_id fehlt' }, 400)
  const sel = await c.env.DB.prepare('SELECT * FROM selections WHERE id=?').bind(c.req.param('id')).first() as any
  if (!sel) return c.json({ error: 'Nicht gefunden' }, 404)
  const filters = JSON.parse(sel.filters||'[]')
  const { sql, params } = buildQuery(filters, sel.entity_type)
  const r = params.length ? await c.env.DB.prepare(sql).bind(...params).all() : await c.env.DB.prepare(sql).all()
  const now = new Date().toISOString()
  let added = 0, skipped = 0
  for (const row of r.results as any[]) {
    const ct = await c.env.DB.prepare('SELECT email, company_id FROM contacts WHERE id=?').bind(row.id).first() as any
    try {
      await c.env.DB.prepare(
        `INSERT INTO webinar_contacts (id,webinar_id,contact_id,company_id,status,invited_at,email,created_at)
         VALUES (?,?,?,?,?,?,?,?)`
      ).bind(crypto.randomUUID(), webinar_id, row.id, ct?.company_id||null, status, status==='invited'?now:null, ct?.email||null, now).run()
      added++
    } catch(_) { skipped++ }
  }
  return c.json({ success: true, added, skipped })
})

// ── IN VERANSTALTUNG EINLADEN ─────────────────────────────────────────────────

selectionsRouter.post('/:id/invite-event', async (c) => {
  const { event_id, status = 'invited' } = await c.req.json() as any
  if (!event_id) return c.json({ error: 'event_id fehlt' }, 400)
  const sel = await c.env.DB.prepare('SELECT * FROM selections WHERE id=?').bind(c.req.param('id')).first() as any
  if (!sel) return c.json({ error: 'Nicht gefunden' }, 404)
  const filters = JSON.parse(sel.filters||'[]')
  const { sql, params } = buildQuery(filters, sel.entity_type)
  const r = params.length ? await c.env.DB.prepare(sql).bind(...params).all() : await c.env.DB.prepare(sql).all()
  const now = new Date().toISOString()
  let added = 0, skipped = 0
  for (const row of r.results as any[]) {
    const ct = await c.env.DB.prepare('SELECT company_id FROM contacts WHERE id=?').bind(row.id).first() as any
    try {
      await c.env.DB.prepare(
        `INSERT INTO event_contacts (id,event_id,contact_id,company_id,status,invited_at,created_at)
         VALUES (?,?,?,?,?,?,?)`
      ).bind(crypto.randomUUID(), event_id, row.id, ct?.company_id||null, status, status==='invited'?now:null, now).run()
      added++
    } catch(_) { skipped++ }
  }
  return c.json({ success: true, added, skipped })
})

// ── LÖSCHEN ───────────────────────────────────────────────────────────────────

selectionsRouter.delete('/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM selections WHERE id=?').bind(c.req.param('id')).run()
  return c.json({ success: true })
})

export { selectionsRouter }
