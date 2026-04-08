import { Hono } from 'hono'

const webinarsRouter = new Hono<{ Bindings: { DB: D1Database; ANTHROPIC_API_KEY: string } }>()

// ── WEBINAR LISTE ─────────────────────────────────────────────────────────────

webinarsRouter.get('/', async (c) => {
  const db = c.env.DB
  const status = c.req.query('status')
  const q = status
    ? `SELECT * FROM webinars WHERE status = ? ORDER BY scheduled_at DESC`
    : `SELECT * FROM webinars ORDER BY scheduled_at DESC`
  const r = status
    ? await db.prepare(q).bind(status).all()
    : await db.prepare(q).all()
  const webinars = r.results as any[]

  if (webinars.length > 0) {
    const ids = webinars.map((w: any) => `'${w.id}'`).join(',')
    const stats = await db.prepare(
      `SELECT webinar_id, status as st, COUNT(*) as cnt FROM webinar_contacts WHERE webinar_id IN (${ids}) GROUP BY webinar_id, status`
    ).all()
    const sm: Record<string, Record<string, number>> = {}
    for (const s of stats.results as any[]) {
      if (!sm[s.webinar_id]) sm[s.webinar_id] = {}
      sm[s.webinar_id][s.st] = s.cnt
    }
    webinars.forEach((w: any) => {
      const st = sm[w.id] || {}
      w.contacts_invited = st['invited'] || 0
      w.contacts_registered = st['registered'] || 0
      w.contacts_attended = st['attended'] || 0
      w.contacts_total = Object.values(st).reduce((a: number, b: number) => a + b, 0)
    })
  }
  return c.json(webinars)
})


// ── WEBINAR ANLEGEN ───────────────────────────────────────────────────────────

webinarsRouter.post('/', async (c) => {
  const b = await c.req.json() as any
  const now = new Date().toISOString()
  const id = 'webinar-' + crypto.randomUUID().split('-')[0] + '-' + new Date().getFullYear()
  await c.env.DB.prepare(
    `INSERT INTO webinars (id,title,topic,teaser,description,scheduled_at,duration_min,status,host_user_id,registration_url,gotowebinar_id,max_participants,email_subject,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(id, b.title, b.topic||null, b.teaser||null, b.description||null,
    b.scheduled_at||null, b.duration_min||60, b.status||'planned',
    b.host_user_id||null, b.registration_url||null, b.gotowebinar_id||null,
    b.max_participants||null, b.email_subject||null, now, now).run()
  return c.json({ id, success: true })
})

// ── WEBINAR DETAIL ────────────────────────────────────────────────────────────

webinarsRouter.get('/:id', async (c) => {
  const w = await c.env.DB.prepare('SELECT * FROM webinars WHERE id=?').bind(c.req.param('id')).first()
  if (!w) return c.json({ error: 'Nicht gefunden' }, 404)
  return c.json(w)
})

// ── WEBINAR BEARBEITEN ────────────────────────────────────────────────────────

webinarsRouter.patch('/:id', async (c) => {
  const b = await c.req.json() as any
  const allowed = ['title','topic','teaser','description','scheduled_at','duration_min','status',
    'host_user_id','registration_url','recording_url','gotowebinar_id','max_participants','email_subject']
  const filtered = Object.fromEntries(Object.entries(b).filter(([k]) => allowed.includes(k)))
  if (!Object.keys(filtered).length) return c.json({ success: true })
  const now = new Date().toISOString()
  const fields = Object.keys(filtered).map(k => `${k} = ?`).join(', ')
  await c.env.DB.prepare(`UPDATE webinars SET ${fields}, updated_at = ? WHERE id = ?`)
    .bind(...Object.values(filtered), now, c.req.param('id')).run()
  return c.json({ success: true })
})

// ── WEBINAR LÖSCHEN ───────────────────────────────────────────────────────────

webinarsRouter.delete('/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM webinars WHERE id=?').bind(c.req.param('id')).run()
  return c.json({ success: true })
})

// ── TEILNEHMER LISTE ──────────────────────────────────────────────────────────

webinarsRouter.get('/:id/contacts', async (c) => {
  const status = c.req.query('status')
  let q = `SELECT wc.*, ct.first_name, ct.last_name, ct.email as ct_email, ct.phone,
    co.name as firma_name, co.id as co_id
    FROM webinar_contacts wc
    LEFT JOIN contacts ct ON ct.id = wc.contact_id
    LEFT JOIN companies co ON co.id = wc.company_id
    WHERE wc.webinar_id = ?`
  if (status) q += ` AND wc.status = '${status}'`
  q += ` ORDER BY co.name, ct.last_name`
  const r = await c.env.DB.prepare(q).bind(c.req.param('id')).all()
  return c.json(r.results)
})

// ── KONTAKT EINLADEN ──────────────────────────────────────────────────────────

webinarsRouter.post('/:id/invite', async (c) => {
  const b = await c.req.json() as any
  // contact_ids: string[] | single contact_id: string
  const ids: string[] = Array.isArray(b.contact_ids) ? b.contact_ids : [b.contact_id]
  const now = new Date().toISOString()
  let added = 0, skipped = 0

  for (const ctId of ids) {
    // Kontakt-E-Mail laden
    const ct = await c.env.DB.prepare('SELECT email, company_id FROM contacts WHERE id=?').bind(ctId).first() as any
    try {
      await c.env.DB.prepare(
        `INSERT INTO webinar_contacts (id,webinar_id,contact_id,company_id,status,invited_at,email,created_at)
         VALUES (?,?,?,?,?,?,?,?)`
      ).bind(crypto.randomUUID(), c.req.param('id'), ctId, ct?.company_id||null,
        'invited', now, ct?.email||null, now).run()
      added++
    } catch(_) { skipped++ }
  }
  return c.json({ success: true, added, skipped })
})

// ── TEILNEHMER STATUS ÄNDERN ──────────────────────────────────────────────────

webinarsRouter.patch('/:id/contacts/:contactId', async (c) => {
  const { status, notes } = await c.req.json() as any
  const now = new Date().toISOString()
  const statusFields: Record<string, string> = {
    registered: 'registered_at', attended: 'attended_at'
  }
  const tsField = statusFields[status]
  const q = tsField
    ? `UPDATE webinar_contacts SET status=?, ${tsField}=?, notes=?, updated_at=? WHERE webinar_id=? AND contact_id=?`
    : `UPDATE webinar_contacts SET status=?, notes=?, updated_at=? WHERE webinar_id=? AND contact_id=?`
  const params = tsField
    ? [status, now, notes||null, now, c.req.param('id'), c.req.param('contactId')]
    : [status, notes||null, now, c.req.param('id'), c.req.param('contactId')]
  // Kein updated_at in Tabelle – direkt status+note schreiben
  await c.env.DB.prepare(
    `UPDATE webinar_contacts SET status=?${tsField?`, ${tsField}=?`:''}, notes=? WHERE webinar_id=? AND contact_id=?`
  ).bind(...(tsField ? [status, now, notes||null] : [status, notes||null]),
    c.req.param('id'), c.req.param('contactId')).run()
  return c.json({ success: true })
})

// ── TEILNEHMER ENTFERNEN ──────────────────────────────────────────────────────

webinarsRouter.delete('/:id/contacts/:contactId', async (c) => {
  await c.env.DB.prepare('DELETE FROM webinar_contacts WHERE webinar_id=? AND contact_id=?')
    .bind(c.req.param('id'), c.req.param('contactId')).run()
  return c.json({ success: true })
})

// ── KI EINLADUNGSMAIL GENERIEREN ──────────────────────────────────────────────

webinarsRouter.post('/:id/generate-email', async (c) => {
  const apiKey = c.env.ANTHROPIC_API_KEY
  if (!apiKey) return c.json({ error: 'API-Key fehlt' }, 503)

  const w = await c.env.DB.prepare('SELECT * FROM webinars WHERE id=?').bind(c.req.param('id')).first() as any
  if (!w) return c.json({ error: 'Webinar nicht gefunden' }, 404)

  const { tone = 'professional' } = await c.req.json().catch(() => ({})) as any

  const dt = w.scheduled_at ? new Date(w.scheduled_at) : null
  const dateStr = dt ? dt.toLocaleDateString('de-DE', { weekday:'long', day:'2-digit', month:'long', year:'numeric' }) : ''
  const timeStr = dt ? dt.toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' }) : ''

  const prompt = `Du bist ein Marketing-Texter der von Busch GmbH, einem IT-Systemhaus aus Bielefeld.
Erstelle eine professionelle Webinar-Einladungsmail auf Deutsch.

Webinar-Daten:
- Titel: ${w.title}
- Thema: ${w.topic}
- Teaser: ${w.teaser || ''}
- Beschreibung: ${w.description || ''}
- Datum: ${dateStr}
- Uhrzeit: ${timeStr} Uhr
- Dauer: ${w.duration_min} Minuten
- Registrierungslink: ${w.registration_url || '[REGISTRIERUNGSLINK]'}

Stil: ${tone === 'casual' ? 'Locker, direkt, Du-Form' : 'Professionell, Sie-Form'}

Erstelle die Mail im folgenden Format (nutze genau diese Struktur, antworte NUR mit JSON):
{
  "subject": "...",
  "preheader": "...",
  "headline": "...",
  "intro": "...",
  "bullet_points": ["...", "...", "..."],
  "cta_text": "...",
  "closing": "...",
  "html": "vollständiges HTML der E-Mail (mit vonBusch-Branding, responsive, professionelles Design)"
}

Das HTML soll dem Stil der von Busch Marketing-Mails entsprechen:
- Weiße Card auf grauem Hintergrund  
- vonBusch Logo oben (Text 'vonBusch' in schwarz, bold)
- Trennlinie nach Header
- Klar strukturierter Inhalt
- Blauer CTA-Button (#0066CC) mit Registrierungslink
- Datum/Uhrzeit prominent hervorgehoben
- Footer: von Busch GmbH · Alfred-Bozi-Str. 12 · 33602 Bielefeld · future@vonbusch.digital
- Abmeldelink-Platzhalter im Footer`

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
    return c.json({ success:true, email:parsed })
  } catch(e:any) {
    return c.json({ error: e.message }, 500)
  }
})

// ── STATS ─────────────────────────────────────────────────────────────────────

webinarsRouter.get('/stats/overview', async (c) => {
  const total = await c.env.DB.prepare('SELECT COUNT(*) as n FROM webinars').first() as any
  const planned = await c.env.DB.prepare("SELECT COUNT(*) as n FROM webinars WHERE status='planned'").first() as any
  const done = await c.env.DB.prepare("SELECT COUNT(*) as n FROM webinars WHERE status='done'").first() as any
  return c.json({ total: total?.n||0, planned: planned?.n||0, done: done?.n||0 })
})

export { webinarsRouter }
