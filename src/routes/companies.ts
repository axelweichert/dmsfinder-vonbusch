import { Hono } from 'hono'
import { addToJustInQueue } from './justin_queue'
import type { Env } from '../index'

export const companiesRouter = new Hono<{ Bindings: Env }>()

// ── LIST ──
companiesRouter.get('/', async (c) => {
  const { status, bereich, search, page = '1', limit = '100' } = c.req.query()
  const offset = (parseInt(page) - 1) * parseInt(limit)
  let q = `SELECT c.*,
    (SELECT COUNT(*) FROM contacts ct WHERE ct.company_id = c.id) as contact_count,
    (SELECT COUNT(*) FROM deals d WHERE d.company_id = c.id AND d.status='open') as deal_count,
    (SELECT COUNT(*) FROM contracts cv WHERE cv.company_id = c.id AND cv.status='active') as active_contracts
    FROM companies c WHERE 1=1`
  const p: any[] = []
  if (status)  { q += ' AND c.status = ?';  p.push(status) }
  if (bereich) { q += ' AND c.bereich = ?'; p.push(bereich) }
  if (search)  { q += ' AND (c.name LIKE ? OR c.city LIKE ?)'; p.push(`%${search}%`, `%${search}%`) }
  q += ' ORDER BY c.name ASC LIMIT ? OFFSET ?'; p.push(parseInt(limit), offset)
  const { results } = await c.env.DB.prepare(q).bind(...p).all()
  const cnt = await c.env.DB.prepare('SELECT COUNT(*) as n FROM companies').first<{n:number}>()
  return c.json({ data: results, total: cnt?.n ?? 0 })
})

// ── GET ONE ──
companiesRouter.get('/:id', async (c) => {
  const co = await c.env.DB.prepare('SELECT * FROM companies WHERE id = ?').bind(c.req.param('id')).first()
  if (!co) return c.json({ error: 'Not found' }, 404)
  return c.json(co)
})

// ── CREATE ──
companiesRouter.post('/', async (c) => {
  const b = await c.req.json()
  const id = crypto.randomUUID(); const now = new Date().toISOString()
  await c.env.DB.prepare(
    `INSERT INTO companies (id,name,status,bereich,street,zip,city,country,phone,fax,email,website,notes,account_manager_id,erp_id,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(id,b.name,b.status||'prospect',b.bereich||'',b.street||'',b.zip||'',b.city||'',b.country||'DE',b.phone||'',b.fax||'',b.email||'',b.website||'',b.notes||'',b.account_manager_id||null,b.erp_id||null,now,now).run()
  return c.json({ id }, 201)
})

// ── UPDATE ──
companiesRouter.patch('/:id', async (c) => {
  const b = await c.req.json(); const now = new Date().toISOString()
  const allowed = ['name','status','bereich','street','zip','city','country','phone','fax','email','website','notes','account_manager_id','erp_id','linkedin','xing','instagram','facebook']
  const filtered = Object.fromEntries(Object.entries(b).filter(([k]) => allowed.includes(k)))
  if (!Object.keys(filtered).length) return c.json({ success: true })
  const fields = Object.keys(filtered).map(k => `${k} = ?`).join(', ')
  await c.env.DB.prepare(`UPDATE companies SET ${fields}, updated_at = ? WHERE id = ?`).bind(...Object.values(filtered), now, c.req.param('id')).run()
  return c.json({ success: true })
})

// ── Auto-Kundennummern vergeben ──────────────────────────────────────────────
companiesRouter.post('/assign-kundennr', async (c) => {
  const now = new Date().toISOString()
  let converted = 0
  let assigned = 0

  // Schritt 1: Altes "ERP-NNN" Format konvertieren → 10000 + N
  const { results: oldFormat } = await c.env.DB.prepare(
    "SELECT id, erp_id FROM companies WHERE erp_id LIKE 'ERP-%'"
  ).all()

  for (const row of oldFormat as any[]) {
    const num = parseInt((row.erp_id as string).replace('ERP-', ''), 10)
    if (!isNaN(num)) {
      const newNr = String(10000 + num)
      await c.env.DB.prepare('UPDATE companies SET erp_id = ?, updated_at = ? WHERE id = ?')
        .bind(newNr, now, row.id).run()
      converted++
    }
  }

  // Schritt 2: Firmen komplett ohne Kundennr. → neue Nummern ab höchster vorhandener
  const maxRow = await c.env.DB.prepare(
    "SELECT MAX(CAST(erp_id AS INTEGER)) as maxnr FROM companies WHERE erp_id GLOB '[0-9]*'"
  ).first() as any
  let nextNr = Math.max((maxRow?.maxnr || 0) + 1, 10001)

  const { results: noNr } = await c.env.DB.prepare(
    "SELECT id FROM companies WHERE erp_id IS NULL OR erp_id = '' ORDER BY created_at ASC"
  ).all()

  for (const row of noNr as any[]) {
    await c.env.DB.prepare('UPDATE companies SET erp_id = ?, updated_at = ? WHERE id = ?')
      .bind(String(nextNr), now, row.id).run()
    nextNr++
    assigned++
  }

  const total = converted + assigned
  if (!total) return c.json({ success: true, assigned: 0, converted: 0, message: 'Alle Firmen haben bereits eine 5-stellige Kundennr.' })
  return c.json({ success: true, converted, assigned, total, message: `${converted} konvertiert (ERP-NNN → 5-stellig), ${assigned} neu vergeben` })
})

// ── DELETE ──
companiesRouter.delete('/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM companies WHERE id = ?').bind(c.req.param('id')).run()
  return c.json({ success: true })
})

// ── KI-ZUSAMMENFASSUNG ──
// GET  /api/companies/:id/ai-summary  → cached Summary zurückgeben (oder generieren)
// POST /api/companies/:id/ai-summary  → Neu generieren (refresh)
companiesRouter.get('/:id/ai-summary', async (c) => {
  const id = c.req.param('id')
  const co = await c.env.DB.prepare('SELECT * FROM companies WHERE id = ?').bind(id).first() as any
  if (!co) return c.json({ error: 'Not found' }, 404)

  // Cache: Summary nicht älter als 30 Tage zurückgeben
  if (co.ai_summary && co.ai_summary_at) {
    const age = Date.now() - new Date(co.ai_summary_at).getTime()
    if (age < 30 * 24 * 60 * 60 * 1000) {
      return c.json({ summary: co.ai_summary, cached: true, generated_at: co.ai_summary_at })
    }
  }

  // Kein Cache → Frontend soll explizit POST auslösen
  return c.json({ needs_generation: true })
})

companiesRouter.post('/:id/ai-summary', async (c) => {
  const id = c.req.param('id')
  const co = await c.env.DB.prepare('SELECT * FROM companies WHERE id = ?').bind(id).first() as any
  if (!co) return c.json({ error: 'Not found' }, 404)
  return generateAndCache(c, co)
})

async function callClaudeForSummary(apiKey: string, prompt: string): Promise<any> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 25000)
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    signal: ctrl.signal,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 900, messages: [{ role: 'user', content: prompt }] })
  })
  clearTimeout(timer)
  if (!resp.ok) throw new Error('Claude HTTP ' + resp.status)
  const data = await resp.json() as any
  const raw = data.content?.[0]?.text || ''
  const m = raw.match(/\{[\s\S]*\}/)
  if (!m) throw new Error('Claude: kein JSON')
  return JSON.parse(m[0])
}

async function callGPTForSummary(apiKey: string, prompt: string): Promise<any> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 25000)
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    signal: ctrl.signal,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify({ model: 'gpt-4o', max_tokens: 900, messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' } })
  })
  clearTimeout(timer)
  if (!resp.ok) throw new Error('GPT HTTP ' + resp.status)
  const data = await resp.json() as any
  const raw = data.choices?.[0]?.message?.content || ''
  const m = raw.match(/\{[\s\S]*\}/)
  if (!m) throw new Error('GPT: kein JSON')
  return JSON.parse(m[0])
}

function mergeSummaries(claude: any, gpt: any): any {
  const pick = (a: any, b: any) => (a != null && a !== '' && a !== '–') ? a : b
  const merged: any = {
    kurzprofil: pick(claude.kurzprofil, gpt.kurzprofil),
    mitarbeiter: pick(claude.mitarbeiter, gpt.mitarbeiter),
    marktposition: pick(claude.marktposition, gpt.marktposition),
    it_reifegrad: pick(claude.it_reifegrad, gpt.it_reifegrad),
    empfehlung: pick(claude.empfehlung, gpt.empfehlung),
    umsatz_verlauf: claude.umsatz_verlauf || gpt.umsatz_verlauf,
    _sources: ['Claude Sonnet 4', 'GPT-4o']
  }
  const vc = [claude.vertriebschancen, gpt.vertriebschancen].filter(Boolean)
  merged.vertriebschancen = (vc.length === 2 && claude.vertriebschancen !== gpt.vertriebschancen)
    ? claude.vertriebschancen + ' // GPT-4o: ' + gpt.vertriebschancen
    : pick(claude.vertriebschancen, gpt.vertriebschancen)
  const ri = [claude.risiken, gpt.risiken].filter(Boolean)
  merged.risiken = (ri.length === 2 && claude.risiken !== gpt.risiken)
    ? claude.risiken + ' // GPT-4o: ' + gpt.risiken
    : pick(claude.risiken, gpt.risiken)
  if (claude.stammdaten || gpt.stammdaten) {
    const csd = claude.stammdaten || {}
    const gsd = gpt.stammdaten || {}
    merged.stammdaten = {
      street: pick(csd.street, gsd.street),
      zip: pick(csd.zip, gsd.zip),
      city: pick(csd.city, gsd.city),
      phone: pick(csd.phone, gsd.phone),
      fax: pick(csd.fax, gsd.fax),
      website: pick(csd.website, gsd.website),
      bereich: pick(csd.bereich, gsd.bereich)
    }
  }
  return merged
}


async function generateAndCache(c: any, co: any) {
  // Kontext aus D1 laden
  const [contacts, deals, contracts, tickets] = await Promise.all([
    c.env.DB.prepare('SELECT first_name, last_name, position, department FROM contacts WHERE company_id = ? LIMIT 20').bind(co.id).all(),
    c.env.DB.prepare('SELECT title, stage, value, bereich FROM deals WHERE company_id = ? ORDER BY created_at DESC LIMIT 10').bind(co.id).all(),
    c.env.DB.prepare('SELECT product, bereich, monthly_value, status, start_date, end_date FROM contracts WHERE company_id = ? AND status="active"').bind(co.id).all(),
    c.env.DB.prepare('SELECT COUNT(*) as n FROM tickets WHERE company_id = ? AND status NOT IN ("resolved","closed")').bind(co.id).first<{n:number}>(),
  ])

  const ctxContacts = (contacts.results as any[]).map((x: any) => `${x.first_name} ${x.last_name} (${x.position||'–'}, ${x.department||'–'})`).join(', ')
  const ctxDeals = (deals.results as any[]).map((x: any) => `${x.title}: ${x.stage}, €${x.value}`).join(' | ')
  const ctxContracts = (contracts.results as any[]).map((x: any) => `${x.product} (${x.bereich}, €${x.monthly_value}/Monat)`).join(' | ')

  const missingFields: string[] = []
  if (!co.street) missingFields.push('Straße')
  if (!co.zip) missingFields.push('PLZ')
  if (!co.city) missingFields.push('Stadt')
  if (!co.phone) missingFields.push('Telefon')
  if (!co.website) missingFields.push('Website')
  if (!co.bereich) missingFields.push('Branche')

  const enrichHint = missingFields.length > 0
    ? `\nFEHLENDE STAMMDATEN (nur wenn sicher, sonst null): ${missingFields.join(', ')}. Füge "stammdaten"-Objekt hinzu: {street,zip,city,phone,fax,website,bereich}.`
    : ''

  const prompt = `Du bist ein erfahrener B2B-Vertriebsanalyst für von Busch GmbH (IT-Systemhaus, OWL/NRW).

Erstelle eine kompakte, professionelle Unternehmensanalyse. Die Analyse soll für den Vertrieb nützlich sein und konkrete Einschätzungen enthalten.

UNTERNEHMENSDATEN:
- Name: ${co.name}
- Branche/Bereich: ${co.bereich || '–'}
- Status: ${co.status}
- Adresse: ${[co.street, co.zip, co.city].filter(Boolean).join(', ') || '–'}
- Website: ${co.website || 'nicht bekannt'}
- Telefon: ${co.phone || '–'}

CRM-KONTEXT (interne Daten):
- Bekannte Kontakte: ${ctxContacts || 'keine'}
- Aktuelle Deals: ${ctxDeals || 'keine'}
- Aktive Serviceverträge: ${ctxContracts || 'keine'}
- Offene Tickets: ${tickets?.n ?? 0}
${enrichHint}

Antworte ausschließlich in gültigem JSON ohne Markdown-Backticks:
{
  "kurzprofil": "2-3 Sätze: Was macht das Unternehmen, Branche, Marktposition",
  "mitarbeiter": "Geschätzte Mitarbeiterzahl und Unternehmensstruktur",
  "umsatz_verlauf": [
    {"jahr": 2019, "umsatz_mio": 0.0, "anmerkung": "..."},
    {"jahr": 2020, "umsatz_mio": 0.0, "anmerkung": "..."},
    {"jahr": 2021, "umsatz_mio": 0.0, "anmerkung": "..."},
    {"jahr": 2022, "umsatz_mio": 0.0, "anmerkung": "..."},
    {"jahr": 2023, "umsatz_mio": 0.0, "anmerkung": "..."}
  ],
  "marktposition": "Marktposition und Wettbewerbssituation in der Region OWL",
  "it_reifegrad": "Einschätzung IT-Reifegrad: niedrig / mittel / hoch",
  "vertriebschancen": "Konkrete Chancen für von Busch GmbH basierend auf Firmenprofil und CRM-Daten",
  "risiken": "Mögliche Risiken oder Herausforderungen im Vertriebsprozess",
  "empfehlung": "Klare Handlungsempfehlung für den nächsten Schritt"
}`

  try {
    const [claudeResult, gptResult] = await Promise.allSettled([
      callClaudeForSummary(c.env.ANTHROPIC_API_KEY, prompt),
      callGPTForSummary(c.env.OPENAI_API_KEY, prompt)
    ])

    const claudeOk = claudeResult.status === 'fulfilled' ? claudeResult.value : null
    const gptOk    = gptResult.status    === 'fulfilled' ? gptResult.value    : null

    if (!claudeOk && !gptOk) {
      return c.json({ error: 'Beide KI-Dienste nicht verfügbar' }, 502)
    }

    let parsed: any = (claudeOk && gptOk)
      ? mergeSummaries(claudeOk, gptOk)
      : claudeOk || gptOk

    if (!parsed._sources) {
      parsed._sources = claudeOk ? ['Claude Sonnet 4'] : ['GPT-4o']
    }

    const now = new Date().toISOString()

    // Stammdaten aus KI-Antwort in D1 schreiben (nur leere Felder)
    if (parsed.stammdaten) {
      const sd = parsed.stammdaten
      const updates: string[] = []
      const vals: any[] = []
      if (sd.street && !co.street)  { updates.push('street=?');  vals.push(sd.street) }
      if (sd.zip    && !co.zip)     { updates.push('zip=?');     vals.push(sd.zip) }
      if (sd.city   && !co.city)    { updates.push('city=?');    vals.push(sd.city) }
      if (sd.phone  && !co.phone)   { updates.push('phone=?');   vals.push(sd.phone) }
      if (sd.fax    && !co.fax)     { updates.push('fax=?');     vals.push(sd.fax) }
      if (sd.website && !co.website){ updates.push('website=?'); vals.push(sd.website.startsWith('http') ? sd.website : 'https://' + sd.website) }
      if (sd.bereich && !co.bereich){ updates.push('bereich=?'); vals.push(sd.bereich) }
      if (updates.length) {
        updates.push('updated_at=?')
        vals.push(now)
        vals.push(co.id)
        await c.env.DB.prepare('UPDATE companies SET ' + updates.join(',') + ' WHERE id=?').bind(...vals).run()
      }
      delete parsed.stammdaten
    }

    const summaryStr = JSON.stringify(parsed)

    // In D1 cachen
    await c.env.DB.prepare('UPDATE companies SET ai_summary = ?, ai_summary_at = ? WHERE id = ?')
      .bind(summaryStr, now, co.id).run()

    return c.json({ summary: summaryStr, cached: false, generated_at: now })
  } catch (err: any) {
    console.error('AI summary error:', err)
    return c.json({ error: 'KI nicht verfügbar', detail: err.message }, 500)
  }
}


// ── PATCH /api/companies/:id/enrich-address — Adresse aus Dokument ergänzen ──
companiesRouter.patch('/:id/enrich-address', async (c) => {
  const id = c.req.param('id')
  const b = await c.req.json() as any
  const co = await c.env.DB.prepare('SELECT * FROM companies WHERE id=?').bind(id).first() as any
  if (!co) return c.json({ error: 'Not found' }, 404)

  const isEmpty = (v: any) => !v || String(v).trim() === ''
  const updates: string[] = []
  const vals: any[] = []

  // Nur leere Felder befüllen — bestehende Daten NIEMALS überschreiben
  if (b.street && isEmpty(co.street)) { updates.push('street=?'); vals.push(b.street) }
  if (b.zip    && isEmpty(co.zip))    { updates.push('zip=?');    vals.push(b.zip) }
  if (b.city   && isEmpty(co.city))   { updates.push('city=?');   vals.push(b.city) }
  if (b.phone  && isEmpty(co.phone))  { updates.push('phone=?');  vals.push(b.phone) }

  if (updates.length) {
    updates.push('updated_at=?')
    vals.push(new Date().toISOString(), id)
    await c.env.DB.prepare('UPDATE companies SET ' + updates.join(',') + ' WHERE id=?').bind(...vals).run()
  }

  return c.json({ success: true, updated: updates.length - 1 })
})

// ── POST /api/companies/:id/enrich — Fehlende Stammdaten per KI ergänzen ──
companiesRouter.post('/:id/enrich', async (c) => {
  const id = c.req.param('id')
  const co = await c.env.DB.prepare('SELECT * FROM companies WHERE id = ?').bind(id).first() as any
  if (!co) return c.json({ error: 'Not found' }, 404)

  const isEmpty = (v: any) => !v || String(v).trim() === ''
  const missingFields: string[] = []
  if (isEmpty(co.street))  missingFields.push('Straße und Hausnummer')
  if (isEmpty(co.zip))     missingFields.push('PLZ')
  if (isEmpty(co.city))    missingFields.push('Stadt')
  if (isEmpty(co.phone))   missingFields.push('Telefonnummer')
  if (isEmpty(co.website)) missingFields.push('Website-URL')
  if (isEmpty(co.bereich)) missingFields.push('Branche')
  if (isEmpty(co.email))   missingFields.push('E-Mail-Adresse')

  if (!missingFields.length) return c.json({ success: true, message: 'Alle Felder bereits gefüllt', updated: [] })

  const prompt = `Suche im Web nach dem Unternehmen "${co.name}" in Deutschland und ergänze die fehlenden Stammdaten.
${co.city ? 'Bekannter Standort: ' + co.city : ''}
${co.website ? 'Bekannte Website: ' + co.website : ''}
${co.email ? 'Bekannte E-Mail: ' + co.email : ''}

Fehlende Felder: ${missingFields.join(', ')}

Antworte am Ende NUR mit einem JSON-Objekt, kein Markdown, kein Text davor/danach:
{
  "street": "Straße Hausnummer oder null",
  "zip": "PLZ oder null",
  "city": "Stadt oder null",
  "phone": "Telefon mit Vorwahl oder null",
  "fax": "Fax mit Vorwahl oder null",
  "website": "https://... oder null",
  "bereich": "Branche oder null",
  "email": "Kontakt-E-Mail oder null"
}`

  try {
    // Mit Web-Search damit KI aktiv nach Firmendaten suchen kann
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': c.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await resp.json() as any
    // Text aus allen content-Blöcken zusammensetzen (web_search gibt mehrere Blöcke zurück)
    const text = (data.content || [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n')
    let extracted: any = {}
    try {
      const m = text.match(/\{[\s\S]*\}/)
      if (m) extracted = JSON.parse(m[0])
    } catch { return c.json({ error: 'KI-Antwort nicht parsebar: ' + text.substring(0,200) }, 500) }

    const now = new Date().toISOString()
    const updates: string[] = []
    const vals: any[] = []
    const updated: string[] = []

    const fields: [string, string][] = [
      ['street','Straße'], ['zip','PLZ'], ['city','Stadt'],
      ['phone','Telefon'], ['website','Website'],
      ['bereich','Branche'], ['email','E-Mail']
    ]

    for (const [field, label] of fields) {
      if (extracted[field] && isEmpty(co[field])) {
        let val = extracted[field]
        if (field === 'website' && !val.startsWith('http')) val = 'https://' + val
        updates.push(field + '=?')
        vals.push(val)
        updated.push(label + ': ' + val)
      }
    }

    if (updates.length) {
      updates.push('updated_at=?')
      vals.push(now)
      vals.push(id)
      await c.env.DB.prepare('UPDATE companies SET ' + updates.join(',') + ' WHERE id=?').bind(...vals).run()
    }

    return c.json({ success: true, updated, message: updated.length ? updated.length + ' Felder ergänzt' : 'Keine neuen Daten gefunden' })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// ── DUPLIKAT-PRÜFUNG ─────────────────────────────────────────────────────────
companiesRouter.get('/check-duplicate', async (c) => {
  const name = c.req.query('name') || ''
  if (!name || name.length < 2) return c.json({ duplicates: [] })

  // Ähnliche Namen: exakt, ohne GmbH/AG/etc., Soundalike
  const clean = name.replace(/\b(GmbH|AG|KG|GbR|e\.V\.|OHG|UG|Ltd|SE)\b/gi,'').trim()
  const { results } = await c.env.DB.prepare(
    `SELECT id, name, status, erp_id FROM companies
     WHERE (name LIKE ? OR name LIKE ? OR name LIKE ?)
     AND name != ?
     LIMIT 5`
  ).bind(`%${clean}%`, `%${name}%`, `${clean}%`, name).all()

  return c.json({ duplicates: results })
})

// ── DUPLIKAT-KANDIDATEN ───────────────────────────────────────────────────────
companiesRouter.get('/:id/duplicates', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB
  const co = await db.prepare('SELECT * FROM companies WHERE id=?').bind(id).first<any>()
  if (!co) return c.json({ candidates: [] })

  const clean = (co.name || '').replace(/\b(GmbH|AG|KG|GbR|e\.V\.|OHG|UG|Ltd|SE)\b/gi,'').trim()
  const prefix = clean.substring(0, Math.min(clean.length, 8))

  // Suche nach Name-Ähnlichkeit + gleicher PLZ
  const byName = await db.prepare(
    `SELECT id,name,status,city,zip,phone,email,street FROM companies
     WHERE id!=? AND status!='archived' AND (name LIKE ? OR name LIKE ?)
     LIMIT 8`
  ).bind(id, `%${prefix}%`, `%${clean}%`).all()

  const byZip = co.zip ? await db.prepare(
    `SELECT id,name,status,city,zip,phone,email,street FROM companies
     WHERE id!=? AND status!='archived' AND zip=? AND id NOT IN (SELECT id FROM companies WHERE name LIKE ?)
     LIMIT 4`
  ).bind(id, co.zip, `%${prefix}%`).all() : { results: [] }

  const seen = new Set<string>([id])
  const candidates: any[] = []
  for (const r of [...(byName.results||[]), ...(byZip.results||[])]) {
    if (!seen.has((r as any).id)) { seen.add((r as any).id); candidates.push(r) }
  }
  return c.json({ company: co, candidates: candidates.slice(0, 8) })
})

// ── MERGE FIRMEN ──────────────────────────────────────────────────────────────
companiesRouter.post('/merge', async (c) => {
  const { winner_id, loser_id } = await c.req.json() as { winner_id: string; loser_id: string }
  if (!winner_id || !loser_id || winner_id === loser_id)
    return c.json({ error: 'winner_id und loser_id erforderlich und verschieden' }, 400)

  const db  = c.env.DB
  const now = new Date().toISOString()

  // Alle verknüpften Datensätze auf winner umhängen
  const tables: Array<{ table: string; col: string }> = [
    { table: 'contacts',   col: 'company_id' },
    { table: 'deals',      col: 'company_id' },
    { table: 'activities', col: 'company_id' },
    { table: 'documents',  col: 'company_id' },
    { table: 'tickets',    col: 'company_id' },
    { table: 'contracts',  col: 'company_id' },
  ]
  for (const { table, col } of tables) {
    try {
      await db.prepare(`UPDATE ${table} SET ${col}=?,updated_at=? WHERE ${col}=?`)
        .bind(winner_id, now, loser_id).run()
    } catch(_) {}
  }

  // Loser archivieren (nicht löschen — für Audit-Trail)
  await db.prepare(`UPDATE companies SET status='archived',notes=COALESCE(notes||' ','')|| '[Zusammengeführt mit '||?||' am '||?||']',updated_at=? WHERE id=?`)
    .bind(winner_id, now.substring(0,10), now, loser_id).run()

  return c.json({ success: true, winner_id, loser_id })
})
