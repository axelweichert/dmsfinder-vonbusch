import { Hono } from 'hono'

const eventsRouter = new Hono<{ Bindings: { DB: D1Database; ANTHROPIC_API_KEY: string } }>()

// ── VERANSTALTUNGEN LISTE ─────────────────────────────────────────────────────

eventsRouter.get('/', async (c) => {
  const db = c.env.DB
  const status = c.req.query('status')
  const type = c.req.query('type')

  let q = `SELECT * FROM events`
  const filters: string[] = []
  const params: string[] = []

  if (status) { filters.push(`status = ?`); params.push(status) }
  if (type)   { filters.push(`event_type = ?`); params.push(type) }
  if (filters.length) q += ` WHERE ` + filters.join(' AND ')
  q += ` ORDER BY scheduled_at DESC`

  const r = params.length ? await db.prepare(q).bind(...params).all() : await db.prepare(q).all()
  const evts = r.results as any[]

  // Teilnehmer-Statistiken
  if (evts.length > 0) {
    const ids = evts.map((e: any) => `'${e.id}'`).join(',')
    const stats = await db.prepare(
      `SELECT event_id, status as st, COUNT(*) as cnt FROM event_contacts WHERE event_id IN (${ids}) GROUP BY event_id, status`
    ).all()
    const fb = await db.prepare(
      `SELECT event_id, COUNT(*) as cnt FROM event_feedback WHERE event_id IN (${ids}) AND submitted_at IS NOT NULL GROUP BY event_id`
    ).all()
    const sm: Record<string, Record<string, number>> = {}
    const fm: Record<string, number> = {}
    for (const s of stats.results as any[]) {
      if (!sm[s.event_id]) sm[s.event_id] = {}
      sm[s.event_id][s.st] = s.cnt
    }
    for (const f of fb.results as any[]) fm[f.event_id] = f.cnt

    evts.forEach((e: any) => {
      const st = sm[e.id] || {}
      e.ct_candidate   = st['candidate']   || 0
      e.ct_invited     = st['invited']      || 0
      e.ct_confirmed   = st['confirmed']    || 0
      e.ct_attended    = st['attended']     || 0
      e.ct_no_show     = st['no_show']      || 0
      e.ct_total       = Object.values(st).reduce((a: number, b: number) => a + b, 0)
      e.feedback_count = fm[e.id] || 0
    })
  }
  return c.json(evts)
})

// ── EVENT ANLEGEN ─────────────────────────────────────────────────────────────

eventsRouter.post('/', async (c) => {
  const b = await c.req.json() as any
  const now = new Date().toISOString()
  const id = 'event-' + crypto.randomUUID().split('-')[0] + '-' + new Date().getFullYear()
  await c.env.DB.prepare(
    `INSERT INTO events (id,title,event_type,topic,teaser,description,agenda,location,location_address,
     scheduled_at,end_at,duration_min,max_participants,status,host_user_id,partner,catering,dress_code,
     feedback_enabled,notes,email_subject,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(id, b.title, b.event_type||'sonstiges', b.topic||null, b.teaser||null,
    b.description||null, b.agenda||null, b.location||null, b.location_address||null,
    b.scheduled_at||null, b.end_at||null, b.duration_min||120, b.max_participants||null,
    b.status||'planned', b.host_user_id||null, b.partner||null, b.catering||'none',
    b.dress_code||null, b.feedback_enabled!==false?1:0, b.notes||null,
    b.email_subject||null, now, now).run()
  return c.json({ id, success: true })
})

// ── EVENT DETAIL ──────────────────────────────────────────────────────────────

eventsRouter.get('/:id', async (c) => {
  const e = await c.env.DB.prepare('SELECT * FROM events WHERE id=?').bind(c.req.param('id')).first()
  if (!e) return c.json({ error: 'Nicht gefunden' }, 404)
  return c.json(e)
})

// ── EVENT BEARBEITEN ──────────────────────────────────────────────────────────

eventsRouter.patch('/:id', async (c) => {
  const b = await c.req.json() as any
  const allowed = ['title','event_type','topic','teaser','description','agenda','location',
    'location_address','scheduled_at','end_at','duration_min','max_participants','status',
    'host_user_id','partner','catering','dress_code','feedback_enabled','nachlese','notes','email_subject']
  const filtered = Object.fromEntries(Object.entries(b).filter(([k]) => allowed.includes(k)))
  if (!Object.keys(filtered).length) return c.json({ success: true })
  const now = new Date().toISOString()
  const fields = Object.keys(filtered).map(k => `${k} = ?`).join(', ')
  await c.env.DB.prepare(`UPDATE events SET ${fields}, updated_at = ? WHERE id = ?`)
    .bind(...Object.values(filtered), now, c.req.param('id')).run()
  return c.json({ success: true })
})

// ── EVENT LÖSCHEN ─────────────────────────────────────────────────────────────

eventsRouter.delete('/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM events WHERE id=?').bind(c.req.param('id')).run()
  return c.json({ success: true })
})

// ── TEILNEHMER LISTE ──────────────────────────────────────────────────────────

eventsRouter.get('/:id/contacts', async (c) => {
  const status = c.req.query('status')
  let q = `SELECT ec.*, ct.first_name, ct.last_name, ct.email as ct_email, ct.phone, ct.mobile,
    co.name as firma_name
    FROM event_contacts ec
    LEFT JOIN contacts ct ON ct.id = ec.contact_id
    LEFT JOIN companies co ON co.id = ec.company_id
    WHERE ec.event_id = ?`
  if (status) q += ` AND ec.status = '${status}'`
  q += ` ORDER BY co.name, ct.last_name`
  const r = await c.env.DB.prepare(q).bind(c.req.param('id')).all()
  return c.json(r.results)
})

// ── KONTAKT HINZUFÜGEN ────────────────────────────────────────────────────────

eventsRouter.post('/:id/invite', async (c) => {
  const b = await c.req.json() as any
  const ids: string[] = Array.isArray(b.contact_ids) ? b.contact_ids : [b.contact_id]
  const now = new Date().toISOString()
  let added = 0, skipped = 0

  for (const ctId of ids) {
    const ct = await c.env.DB.prepare('SELECT email, company_id FROM contacts WHERE id=?').bind(ctId).first() as any
    const targetStatus = b.status || 'invited'
    try {
      await c.env.DB.prepare(
        `INSERT INTO event_contacts (id,event_id,contact_id,company_id,status,invited_at,created_at)
         VALUES (?,?,?,?,?,?,?)`
      ).bind(crypto.randomUUID(), c.req.param('id'), ctId, ct?.company_id||null,
        targetStatus, targetStatus==='invited'?now:null, now).run()
      added++
    } catch(_) { skipped++ }
  }
  return c.json({ success: true, added, skipped })
})

// ── TEILNEHMER STATUS ÄNDERN ──────────────────────────────────────────────────

eventsRouter.patch('/:id/contacts/:contactId', async (c) => {
  const b = await c.req.json() as any
  const { status, notes, nachtel_done, nachtel_result, lead_created } = b
  const now = new Date().toISOString()

  const tsMap: Record<string, string> = {
    invited: 'invited_at', confirmed: 'confirmed_at', attended: 'attended_at'
  }
  const tsField = status ? tsMap[status] : null

  let sets = []
  let vals = []

  if (status !== undefined) { sets.push('status = ?'); vals.push(status) }
  if (tsField) { sets.push(`${tsField} = ?`); vals.push(now) }
  if (notes !== undefined) { sets.push('notes = ?'); vals.push(notes) }
  if (nachtel_done !== undefined) {
    sets.push('nachtel_done = ?'); vals.push(nachtel_done ? 1 : 0)
    if (nachtel_done) { sets.push('nachtel_at = ?'); vals.push(now) }
  }
  if (nachtel_result !== undefined) { sets.push('nachtel_result = ?'); vals.push(nachtel_result) }
  if (lead_created !== undefined) { sets.push('lead_created = ?'); vals.push(lead_created ? 1 : 0) }

  if (!sets.length) return c.json({ success: true })
  await c.env.DB.prepare(
    `UPDATE event_contacts SET ${sets.join(', ')} WHERE event_id = ? AND contact_id = ?`
  ).bind(...vals, c.req.param('id'), c.req.param('contactId')).run()
  return c.json({ success: true })
})

// ── TEILNEHMER ENTFERNEN ──────────────────────────────────────────────────────

eventsRouter.delete('/:id/contacts/:contactId', async (c) => {
  await c.env.DB.prepare('DELETE FROM event_contacts WHERE event_id=? AND contact_id=?')
    .bind(c.req.param('id'), c.req.param('contactId')).run()
  return c.json({ success: true })
})

// ── FEEDBACK-LINKS ERSTELLEN ──────────────────────────────────────────────────

eventsRouter.post('/:id/create-feedback', async (c) => {
  const b = await c.req.json() as any
  const contactIds: string[] = b.contact_ids || []
  const now = new Date().toISOString()
  const eventId = c.req.param('id')
  const created = []

  for (const ctId of contactIds) {
    const ct = await c.env.DB.prepare(
      'SELECT first_name, last_name, email, company_id FROM contacts WHERE id=?'
    ).bind(ctId).first() as any
    const co = ct?.company_id ? await c.env.DB.prepare('SELECT name FROM companies WHERE id=?').bind(ct.company_id).first() as any : null

    const existing = await c.env.DB.prepare(
      'SELECT id FROM event_feedback WHERE event_id=? AND contact_id=?'
    ).bind(eventId, ctId).first()
    if (existing) continue

    const token = crypto.randomUUID().replace(/-/g,'')
    await c.env.DB.prepare(
      `INSERT INTO event_feedback (id,event_id,contact_id,company_name,contact_name,token,created_at)
       VALUES (?,?,?,?,?,?,?)`
    ).bind(crypto.randomUUID(), eventId, ctId, co?.name||null,
      (ct?.first_name||'') + ' ' + (ct?.last_name||''), token, now).run()

    // feedback_sent_at in event_contacts setzen
    await c.env.DB.prepare(
      'UPDATE event_contacts SET feedback_sent_at=? WHERE event_id=? AND contact_id=?'
    ).bind(now, eventId, ctId).run()

    created.push({ contactId: ctId, token, email: ct?.email })
  }
  return c.json({ success: true, created })
})

// ── FEEDBACK ABGEBEN (öffentlich, nur Token) ──────────────────────────────────

eventsRouter.get('/feedback/:token', async (c) => {
  const fb = await c.env.DB.prepare(
    `SELECT ef.*, e.title, e.event_type, e.scheduled_at, e.partner FROM event_feedback ef
     LEFT JOIN events e ON e.id = ef.event_id WHERE ef.token = ?`
  ).bind(c.req.param('token')).first()
  if (!fb) return c.json({ error: 'Ungültiger Link' }, 404)
  return c.json(fb)
})

eventsRouter.post('/feedback/:token', async (c) => {
  const b = await c.req.json() as any
  const fb = await c.env.DB.prepare('SELECT * FROM event_feedback WHERE token=?')
    .bind(c.req.param('token')).first() as any
  if (!fb) return c.json({ error: 'Ungültiger Token' }, 404)
  if (fb.submitted_at) return c.json({ error: 'Fragebogen wurde bereits abgesendet' }, 409)

  const now = new Date().toISOString()
  await c.env.DB.prepare(
    `UPDATE event_feedback SET overall_rating=?, content_rating=?, organization_rating=?,
     would_recommend=?, interested_in=?, next_steps=?, free_text=?, submitted_at=? WHERE token=?`
  ).bind(
    b.overall_rating||null, b.content_rating||null, b.organization_rating||null,
    b.would_recommend?1:0, b.interested_in?JSON.stringify(b.interested_in):null,
    b.next_steps||null, b.free_text||null, now, c.req.param('token')
  ).run()

  // feedback_received_at in event_contacts setzen
  if (fb.contact_id) {
    await c.env.DB.prepare(
      'UPDATE event_contacts SET feedback_received_at=? WHERE event_id=? AND contact_id=?'
    ).bind(now, fb.event_id, fb.contact_id).run()
  }
  return c.json({ success: true })
})

// ── FEEDBACK LISTE ────────────────────────────────────────────────────────────

eventsRouter.get('/:id/feedback', async (c) => {
  const r = await c.env.DB.prepare(
    'SELECT * FROM event_feedback WHERE event_id=? ORDER BY submitted_at DESC NULLS LAST'
  ).bind(c.req.param('id')).all()
  return c.json(r.results)
})

// ── KI KONTAKT-SELEKTION ──────────────────────────────────────────────────────

eventsRouter.post('/:id/ai-suggest', async (c) => {
  const apiKey = c.env.ANTHROPIC_API_KEY
  if (!apiKey) return c.json({ error: 'API-Key fehlt' }, 503)

  const evt = await c.env.DB.prepare('SELECT * FROM events WHERE id=?').bind(c.req.param('id')).first() as any
  if (!evt) return c.json({ error: 'Event nicht gefunden' }, 404)

  // Bereits eingeladene laden
  const already = await c.env.DB.prepare(
    'SELECT contact_id FROM event_contacts WHERE event_id=?'
  ).bind(c.req.param('id')).all()
  const alreadyIds = new Set((already.results as any[]).map(r => r.contact_id))

  // Kontakte mit Interessen laden (max 300)
  const cts = await c.env.DB.prepare(
    `SELECT ct.id, ct.first_name, ct.last_name, ct.position, ct.interests,
     co.name as firma, co.bereich, co.status as firmen_status,
     (SELECT MAX(a.created_at) FROM activities a WHERE a.company_id = co.id) as last_activity
     FROM contacts ct
     LEFT JOIN companies co ON co.id = ct.company_id
     WHERE ct.marketing_global_optin = 1 OR ct.marketing_global_optin IS NULL
     LIMIT 300`
  ).all()

  const candidates = (cts.results as any[])
    .filter(ct => !alreadyIds.has(ct.id))
    .map(ct => ({
      id: ct.id,
      name: `${ct.first_name} ${ct.last_name}`,
      firma: ct.firma || '–',
      bereich: ct.bereich || '–',
      position: ct.position || '–',
      interests: ct.interests || '[]',
      last_activity: ct.last_activity || 'nie',
      status: ct.firmen_status || '–'
    }))

  const dt = evt.scheduled_at ? new Date(evt.scheduled_at) : null
  const dateStr = dt ? dt.toLocaleDateString('de-DE', {day:'2-digit', month:'long', year:'numeric'}) : ''

  const prompt = `Du bist ein CRM-Assistent der von Busch GmbH.

Veranstaltung:
- Titel: ${evt.title}
- Typ: ${evt.event_type} (nxt=Großkonferenz, exclusive=Exklusiv-Event, business_bytes=Frühstück/Workshop)
- Thema: ${evt.topic || 'allgemein'}
- Beschreibung: ${evt.teaser || evt.description || ''}
- Datum: ${dateStr}
- Max. Teilnehmer: ${evt.max_participants || 'unbegrenzt'}
- Partner: ${evt.partner || 'keiner'}

Wähle aus den folgenden Kontakten (${candidates.length} verfügbar) die ${Math.min(evt.max_participants || 30, 40)} am besten passenden aus.

Kriterien:
- Passung zum Thema (Interessen, Branche, Position)
- Kundenbeziehung (Kunden bevorzugen)
- Aktualität (letzter Kontakt)
- Event-Typ: business_bytes → max. 10-12 Entscheider; exclusive → ~20 Kunden/Prospects; nxt → breite Mischung

Kontakte:
${candidates.slice(0, 200).map(ct => `${ct.id}|${ct.name}|${ct.firma}|${ct.bereich}|${ct.position}|${ct.status}|last:${ct.last_activity?.substring(0,10)}`).join('\n')}

Antworte NUR als JSON:
{
  "recommended": ["contact_id_1", "contact_id_2", ...],
  "reasoning": "Kurze Begründung der Auswahl",
  "excluded_reason": "Warum bestimmte Kontakte nicht empfohlen wurden"
}`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key':apiKey, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:2048,
        messages:[{ role:'user', content:prompt }] })
    })
    const data = await res.json() as any
    const text = data?.content?.[0]?.text || ''
    const clean = text.replace(/```json|```/g,'').trim()
    const parsed = JSON.parse(clean)

    // Details zu den empfohlenen Kontakten laden
    if (parsed.recommended?.length) {
      const detailIds = parsed.recommended.slice(0, 50)
      const details = candidates.filter(ct => detailIds.includes(ct.id))
      parsed.details = details
    }
    return c.json({ success: true, ...parsed })
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ── KI EINLADUNGSMAIL ─────────────────────────────────────────────────────────

eventsRouter.post('/:id/generate-email', async (c) => {
  const apiKey = c.env.ANTHROPIC_API_KEY
  if (!apiKey) return c.json({ error: 'API-Key fehlt' }, 503)

  const evt = await c.env.DB.prepare('SELECT * FROM events WHERE id=?').bind(c.req.param('id')).first() as any
  if (!evt) return c.json({ error: 'Event nicht gefunden' }, 404)

  const dt = evt.scheduled_at ? new Date(evt.scheduled_at) : null
  const dateStr = dt ? dt.toLocaleDateString('de-DE', {weekday:'long', day:'2-digit', month:'long', year:'numeric'}) : ''
  const timeStr = dt ? dt.toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'}) : ''

  const typeLabel: Record<string, string> = {
    nxt: 'NXT-Jahreskonferenz', exclusive: 'Exklusives Partner-Event',
    business_bytes: 'Business Bytes (Frühstück/Workshop)', sonstiges: 'Veranstaltung'
  }

  const prompt = `Du bist Marketing-Texter der von Busch GmbH, IT-Systemhaus Bielefeld.
Erstelle eine persönliche, professionelle Einladungsmail für folgende Veranstaltung.

Veranstaltung:
- Titel: ${evt.title}
- Format: ${typeLabel[evt.event_type] || evt.event_type}
- Thema: ${evt.topic}
- Teaser: ${evt.teaser || ''}
- Beschreibung: ${evt.description || ''}
- Datum: ${dateStr}
- Uhrzeit: ${timeStr} Uhr
- Dauer: ${evt.duration_min} Minuten
- Ort: ${evt.location || ''}${evt.location_address ? ', ' + evt.location_address : ''}
- Max. Teilnehmer: ${evt.max_participants || 'limitiert'}
- Partner: ${evt.partner || 'von Busch GmbH'}
- Verpflegung: ${evt.catering === 'dinner' ? 'Gemeinsames Abendessen' : evt.catering === 'breakfast' ? 'Frühstück' : 'Keine'}
- Dresscode: ${evt.dress_code || 'Business Casual'}
- Agenda: ${evt.agenda || ''}

Stil: Persönlich, direkt (Du-Form wenn Business Bytes, Sie-Form bei Exklusiv/NXT), professionell, begeisternd.

Antworte NUR als JSON:
{
  "subject": "...",
  "preheader": "...",
  "greeting_placeholder": "Liebe/r [NAME],",
  "intro": "...",
  "highlights": ["...", "...", "..."],
  "agenda_text": "...",
  "cta_text": "Jetzt Platz sichern",
  "closing": "...",
  "html": "vollständiges HTML der Einladungsmail (responsiv, vonBusch-Stil, prominentes Datum, CTA-Button blau #0066CC)"
}`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key':apiKey, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:4096,
        messages:[{ role:'user', content:prompt }] })
    })
    const data = await res.json() as any
    const text = data?.content?.[0]?.text || ''
    const clean = text.replace(/```json|```/g,'').trim()
    const parsed = JSON.parse(clean)
    return c.json({ success: true, email: parsed })
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ── NACHLESE SPEICHERN ────────────────────────────────────────────────────────

eventsRouter.post('/:id/nachlese', async (c) => {
  const { nachlese } = await c.req.json() as any
  await c.env.DB.prepare('UPDATE events SET nachlese=?, updated_at=? WHERE id=?')
    .bind(nachlese, new Date().toISOString(), c.req.param('id')).run()
  return c.json({ success: true })
})

// ── STATS ─────────────────────────────────────────────────────────────────────

eventsRouter.get('/stats/overview', async (c) => {
  const total = await c.env.DB.prepare('SELECT COUNT(*) as n FROM events').first() as any
  const planned = await c.env.DB.prepare("SELECT COUNT(*) as n FROM events WHERE status IN ('planned','invites_sent','confirmed')").first() as any
  const done = await c.env.DB.prepare("SELECT COUNT(*) as n FROM events WHERE status='done'").first() as any
  return c.json({ total: total?.n||0, planned: planned?.n||0, done: done?.n||0 })
})

export { eventsRouter }
