import { Hono } from 'hono'
import type { Env } from '../index'

export const documentsRouter = new Hono<{ Bindings: Env }>()

const DOC_TYPES = [
  'E-Mail','Vertrag','Angebot','Auftrag','Auftragsbestätigung',
  'Rechnung','Lieferschein','Gutschrift','Mahnung',
  'Vertragsbedingungen','Kündigung','Korrespondenz','Notiz','Sonstiges'
]

const MIME_MAP: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/msword': 'doc',
  'text/html': 'html',
  'text/plain': 'txt',
  'message/rfc822': 'eml',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
}

// ── Dokumente abrufen ──
documentsRouter.get('/', async (c) => {
  try {
    const db = c.env.DB
    const q = c.req.query('q') || ''
    const docType = c.req.query('type') || ''
    const companyId = c.req.query('company_id') || ''
    const page = parseInt(c.req.query('page') || '1')
    const limit = 50
    const offset = (page - 1) * limit

    if (q) {
      const term = '%' + q + '%'
      const BASE = `SELECT d.*, u.display_name as uploader, co.name as company_name FROM documents d LEFT JOIN users u ON d.uploaded_by=u.id LEFT JOIN companies co ON d.company_id=co.id WHERE `
      const bySubj   = await db.prepare(BASE + `d.subject LIKE ? LIMIT 50`).bind(term).all()
      const byCoName = await db.prepare(BASE + `co.name LIKE ? LIMIT 50`).bind(term).all()
      const bySum    = await db.prepare(BASE + `d.summary LIKE ? LIMIT 30`).bind(term).all()
      const byFull   = await db.prepare(BASE + `d.fulltext_idx LIKE ? LIMIT 30`).bind(term).all()
      const seen = new Set<string>(); const merged: any[] = []
      for (const r of [...bySubj.results, ...byCoName.results, ...bySum.results, ...byFull.results]) {
        if (!seen.has((r as any).id)) { seen.add((r as any).id); merged.push(r) }
      }
      return c.json({ documents: merged, total: merged.length, page: 1 })
    }

    let sql = `SELECT d.*, u.display_name as uploader, co.name as company_name FROM documents d LEFT JOIN users u ON d.uploaded_by=u.id LEFT JOIN companies co ON d.company_id=co.id WHERE 1=1`
    const params: any[] = []
    if (docType) { sql += ` AND d.doc_type=?`; params.push(docType) }
    if (companyId) { sql += ` AND d.company_id=?`; params.push(companyId) }
    sql += ` ORDER BY d.is_archived ASC, d.created_at DESC LIMIT ? OFFSET ?`
    params.push(limit, offset)

    const docs = await db.prepare(sql).bind(...params).all()
    return c.json({ documents: docs.results, total: docs.results.length, page })
  } catch(err: any) {
    console.error('Documents GET error:', err)
    return c.json({ error: err.message, documents: [] }, 500)
  }
})

// ── KI-Analyse (Claude + GPT-4o parallel) ──

async function analyzeWithClaude(apiKey: string, prompt: string): Promise<any> {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 600, messages: [{ role: 'user', content: prompt }] })
  })
  if (!resp.ok) throw new Error('Claude HTTP ' + resp.status)
  const data = await resp.json() as any
  const raw = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')
  const m = raw.match(/\{[\s\S]*\}/)
  if (!m) throw new Error('Claude: kein JSON')
  return JSON.parse(m[0])
}

async function analyzeWithGPT(apiKey: string, prompt: string): Promise<any> {
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify({ model: 'gpt-4o', max_tokens: 600, messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' } })
  })
  if (!resp.ok) throw new Error('GPT HTTP ' + resp.status)
  const data = await resp.json() as any
  const raw = data.choices?.[0]?.message?.content || ''
  const m = raw.match(/\{[\s\S]*\}/)
  if (!m) throw new Error('GPT: kein JSON')
  return JSON.parse(m[0])
}

function mergeDocAnalysis(claude: any, gpt: any): any {
  const pick = (a: any, b: any) => (a != null && a !== '' && a !== 'null') ? a : b
  const tags = [...new Set([...(claude.tags || []), ...(gpt.tags || [])])] as string[]
  const summary = [claude.summary, gpt.summary].filter(Boolean).join(' / ')
  return {
    doc_type:        pick(claude.doc_type,       gpt.doc_type),
    doc_date:        pick(claude.doc_date,        gpt.doc_date),
    subject:         pick(claude.subject,         gpt.subject),
    summary:         summary || pick(claude.summary, gpt.summary),
    company_name:    pick(claude.company_name,    gpt.company_name),
    company_street:  pick(claude.company_street,  gpt.company_street),
    company_zip:     pick(claude.company_zip,     gpt.company_zip),
    company_city:    pick(claude.company_city,    gpt.company_city),
    company_phone:   pick(claude.company_phone,   gpt.company_phone),
    contact_name:    pick(claude.contact_name,    gpt.contact_name),
    contact_email:   pick(claude.contact_email,   gpt.contact_email),
    tags,
    language:        pick(claude.language,        gpt.language) || 'de',
    fulltext_preview: pick(claude.fulltext_preview, gpt.fulltext_preview),
    deal_value:      pick(claude.deal_value,       gpt.deal_value)      || 0,
    monthly_rate:    pick(claude.monthly_rate,     gpt.monthly_rate)    || 0,
    contract_months: pick(claude.contract_months,  gpt.contract_months) || 0,
    one_time_costs:  pick(claude.one_time_costs,   gpt.one_time_costs)  || 0,
    _sources: ['Claude Sonnet 4', 'GPT-4o']
  }
}

documentsRouter.post('/analyze', async (c) => {
  try {
    const body = await c.req.json() as any
    const fileName: string = body.name || 'unbekannt'
    const fileSize: number = body.size || 0
    const fileType: string = body.type || ''
    const textContent: string = (body.text || '').substring(0, 8000)
    const ext = (MIME_MAP[fileType] || fileName.split('.').pop()?.toLowerCase() || 'bin').toLowerCase()
    const preview = textContent.substring(0, 200).replace(/\s+/g, ' ').trim()

    const prompt = `Analysiere dieses Geschäftsdokument für das DMS-System der von Busch GmbH.

Dateiname: ${fileName}
Dateityp: ${ext.toUpperCase()}
Größe: ${(fileSize/1024).toFixed(0)} KB
${textContent ? 'Dokumentinhalt:\n' + textContent : 'Kein Textinhalt extrahierbar.'}

Aufgaben:
1. Dokumenttyp aus dieser Liste: ${DOC_TYPES.join(', ')}
2. Empfänger-Firma: bevorzugt aus dem Adressblock (Anschriftfeld), sonst aus dem Dokumentinhalt
3. Firmenadresse: NUR aus einem eindeutigen Adressblock extrahieren (Straße, PLZ, Ort) - nicht aus Fließtext
4. Nettobetrag/Auftragswert (deal_value, Gesamtsumme falls explizit angegeben, sonst 0)
5. Monatliche Rate/Miete falls Servicevertrag oder Mietmodell (monthly_rate, 0 wenn nicht vorhanden)
6. Vertragslaufzeit in Monaten (contract_months, z.B. 36 für 3 Jahre, 0 wenn nicht erkennbar)
7. Einmalige Kaufkosten/Hardwarekosten (one_time_costs, z.B. Geräte, Lizenzen, Installation - alles was einmalig gezahlt wird, 0 wenn nicht vorhanden)
   → Gesamtumsatz = (monthly_rate × contract_months) + one_time_costs
8. Ansprechpartner aus Anrede ("Sehr geehrter Herr/Frau ...") oder Empfänger-Zeile
5. Datum aus Dokument lesen
6. Kurzen Betreff formulieren

Antworte NUR mit diesem JSON-Objekt, kein Text davor oder danach:
{"doc_type":"Typ aus der Liste","doc_date":"YYYY-MM-DD oder null","subject":"Titel max 80 Zeichen","summary":"2-3 Saetze Inhalt","company_name":"Empfaenger-Firma vollstaendiger Name oder null","company_street":"Strasse Hausnummer aus Adressblock oder null","company_zip":"PLZ aus Adressblock oder null","company_city":"Stadt aus Adressblock oder null","company_phone":"Telefon aus Dokument oder null","contact_name":"Vorname Nachname oder null","contact_email":"E-Mail oder null","tags":["tag1","tag2"],"language":"de","fulltext_preview":"${preview}","deal_value":0.00,"monthly_rate":0.00,"contract_months":0,"one_time_costs":0.00}`

    const [claudeResult, gptResult] = await Promise.allSettled([
      analyzeWithClaude(c.env.ANTHROPIC_API_KEY, prompt),
      analyzeWithGPT(c.env.OPENAI_API_KEY, prompt)
    ])

    const claudeOk = claudeResult.status === 'fulfilled' ? claudeResult.value : null
    const gptOk    = gptResult.status    === 'fulfilled' ? gptResult.value    : null

    if (!claudeOk && !gptOk) throw new Error('Beide KI-Dienste nicht verfügbar')

    const analysis = claudeOk && gptOk
      ? mergeDocAnalysis(claudeOk, gptOk)
      : claudeOk || gptOk

    if (analysis && !analysis._sources) {
      analysis._sources = claudeOk ? ['Claude Sonnet 4'] : ['GPT-4o']
    }

    return c.json({ success: true, analysis, fileInfo: { name: fileName, size: fileSize, type: fileType, ext } })
  } catch(err: any) {
    console.error('Analyze error:', err?.message || err)
    return c.json({ success: false, error: String(err?.message || err), analysis: { doc_type: 'Sonstiges', doc_date: null, subject: '', summary: '', company_name: null, tags: [], language: 'de', fulltext_preview: '' }, fileInfo: {} })
  }
})


// ── Rückwirkender Firmen-Abgleich ──
documentsRouter.post('/rematch-companies', async (c) => {
  try {
    const db = c.env.DB
    // Alle Dokumente ohne company_id holen
    const docs = await db.prepare(
      `SELECT id, subject, summary FROM documents WHERE is_archived=0 AND (company_id IS NULL OR company_id='')`
    ).all()

    let matched = 0
    const results: any[] = []

    for (const doc of docs.results as any[]) {
      const text = ((doc.subject || '') + ' ' + (doc.summary || '')).trim()
      if (!text) continue

      // Strategie: Alle Firmennamen aus DB gegen subject/summary prüfen
      // Das ist zuverlässiger als Regex auf dem Dokumenttext
      const companies = await db.prepare(
        `SELECT id, name FROM companies WHERE name IS NOT NULL AND name != '' ORDER BY length(name) DESC LIMIT 100`
      ).all()

      let bestMatch: any = null
      for (const co of companies.results as any[]) {
        const name = (co.name || '').trim()
        if (name.length < 3) continue
        // Prüfe ob der Firmenname im Dokumenttext vorkommt
        if (text.toLowerCase().includes(name.toLowerCase())) {
          bestMatch = co
          break
        }
        // Auch Kurzform prüfen (erstes Wort, min 3 Zeichen)
        const short = name.split(/\s+/)[0]
        if (short.length >= 3 && text.toLowerCase().includes(short.toLowerCase())) {
          bestMatch = co
          break
        }
      }

      if (bestMatch) {
        await db.prepare(
          `UPDATE documents SET company_id=?, updated_at=? WHERE id=?`
        ).bind(bestMatch.id, new Date().toISOString(), doc.id).run()
        matched++
        results.push({ doc_id: doc.id, subject: doc.subject, company: (bestMatch as any).name })
      }
    }

    return c.json({ success: true, total: docs.results.length, matched, results })
  } catch(err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// ── Upload speichern ──
documentsRouter.post('/upload', async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File
    const meta = JSON.parse(formData.get('meta') as string || '{}')
    const email = c.req.header('Cf-Access-Authenticated-User-Email') || ''
    if (!file) return c.json({ error: 'Keine Datei' }, 400)

    const db = c.env.DB
    const user = await db.prepare('SELECT id FROM users WHERE LOWER(email)=?').bind(email.toLowerCase()).first<{id:string}>()
    const id  = crypto.randomUUID()
    const ext = MIME_MAP[file.type] || file.name.split('.').pop() || 'bin'
    const now = new Date().toISOString()
    const datePrefix = (meta.doc_date || now.substring(0,10)).substring(0,7).replace('-','/')
    const r2Key = `docs/${meta.company_id||'global'}/${datePrefix}/${id}.${ext}`

    await c.env.STORAGE.put(r2Key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
      customMetadata: { originalName: file.name, uploadedBy: email }
    })

    let r2KeyText: string|null = null
    if (meta.fulltext && meta.fulltext.length > 0) {
      r2KeyText = r2Key.replace('.'+ext, '.txt')
      await c.env.STORAGE.put(r2KeyText, meta.fulltext, { httpMetadata: { contentType: 'text/plain; charset=utf-8' } })
    }

    const finDataJson = meta.fin_data ? JSON.stringify(meta.fin_data) : null

    await db.prepare(`INSERT INTO documents (id,version,r2_key,r2_key_text,name,original_name,mime_type,size,doc_type,doc_date,subject,summary,fulltext_idx,tags,language,company_id,contact_id,uploaded_by,is_archived,fin_data,created_at,updated_at) VALUES (?,1,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,?)`)
      .bind(id, r2Key, r2KeyText, meta.subject||file.name, file.name, file.type, file.size,
        meta.doc_type||'Sonstiges', meta.doc_date||null, meta.subject||file.name,
        meta.summary||'', (meta.fulltext||'').substring(0,10000),
        JSON.stringify(meta.tags||[]), meta.language||'de',
        meta.company_id||null, meta.contact_id||null, user?.id||null,
        finDataJson, now, now).run()

    // Auto-Aktivität: Bei Angebot → "Angebot nachfassen" in 3 Tagen anlegen
    if ((meta.doc_type === 'Angebot') && user?.id) {
      try {
        const akId  = crypto.randomUUID()
        const dueAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10) + 'T09:00:00.000Z'
        const akSubject = 'Angebot nachfassen' + (meta.subject ? ': ' + meta.subject : '')
        await db.prepare(
          `INSERT INTO activities (id,type,subject,body,linked_type,linked_id,company_id,contact_id,owner_id,status,due_at,created_at,updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
        ).bind(
          akId, 'Angebot', akSubject,
          'Automatisch erstellt beim Upload des Angebots.',
          'document', id,
          meta.company_id || null,
          meta.contact_id || null,
          user.id,
          'open', dueAt, now, now
        ).run()
      } catch(akErr: any) {
        console.error('Auto-Aktivität Fehler:', akErr.message)
      }
    }

    // Auto-Deal: Bei Auftragsbestätigung oder Auftrag → gewonnenen Deal anlegen
    if ((meta.doc_type === 'Auftragsbestätigung' || meta.doc_type === 'Auftrag') && meta.company_id && user?.id) {
      try {
        const dealId = crypto.randomUUID()
        const dealTitle = meta.subject || (meta.doc_type + ' via Dokumenten-Upload')
        // Wert aus KI-Analyse oder meta.value
        // Wert: Gesamtbetrag, oder monatliche Rate × Laufzeit
        const rawDealValue  = parseFloat(String(meta.deal_value || 0)) || 0
        const rawMonthly    = parseFloat(String(meta.monthly_rate || 0)) || 0
        const rawMonths     = parseInt(String(meta.contract_months || 0)) || 0
        const rawOneTime    = parseFloat(String(meta.one_time_costs || 0)) || 0
        const calcRecurring = rawMonthly > 0 && rawMonths > 0 ? rawMonthly * rawMonths : 0
        const calcTotal     = calcRecurring + rawOneTime
        // Priorität: 1) expliziter Gesamtbetrag, 2) monatl.×Laufzeit+Einmalkauf, 3) meta.value
        const dealValue     = rawDealValue > 0 ? rawDealValue : (calcTotal > 0 ? calcTotal : parseFloat(String(meta.value || 0)) || 0)
        await db.prepare(
          `INSERT INTO deals (id,title,company_id,contact_id,owner_id,bereich,stage,value,probability,status,notes,created_at,updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
        ).bind(
          dealId, dealTitle,
          meta.company_id,
          meta.contact_id || null,
          user.id,
          meta.bereich || '',
          'won',
          dealValue,
          100,
          'open',
          (() => {
          const parts = []
          if (rawMonthly > 0 && rawMonths > 0) parts.push(`${rawMonthly.toFixed(2)} €/Monat × ${rawMonths} Monate = ${calcRecurring.toFixed(2)} €`)
          if (rawOneTime > 0) parts.push(`Einmalkauf: ${rawOneTime.toFixed(2)} €`)
          const calc = parts.length ? ' | Berechnung: ' + parts.join(' + ') : ''
          return 'Auto aus ' + meta.doc_type + ' Upload.' + calc
        })(),
          now, now
        ).run()
      } catch(dealErr: any) {
        console.error('Auto-Deal Fehler:', dealErr.message)
      }
    }

    return c.json({ id, success: true }, 201)
  } catch(err: any) {
    console.error('Upload error:', err)
    return c.json({ error: err.message }, 500)
  }
})

// ── Download ──
documentsRouter.get('/:id/download', async (c) => {
  const doc = await c.env.DB.prepare('SELECT * FROM documents WHERE id=?').bind(c.req.param('id')).first() as any
  if (!doc) return c.json({ error: 'Not found' }, 404)
  const obj = await c.env.STORAGE.get(doc.r2_key)
  if (!obj) return c.json({ error: 'Datei nicht gefunden' }, 404)
  return new Response(obj.body, { headers: { 'Content-Type': doc.mime_type||'application/octet-stream', 'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.original_name)}"` } })
})

// ── View (inline, für PDF/Bild-Vorschau im Browser) ──
documentsRouter.get('/:id/view', async (c) => {
  const doc = await c.env.DB.prepare('SELECT * FROM documents WHERE id=?').bind(c.req.param('id')).first() as any
  if (!doc) return c.json({ error: 'Not found' }, 404)
  const obj = await c.env.STORAGE.get(doc.r2_key)
  if (!obj) return c.json({ error: 'Datei nicht gefunden' }, 404)
  return new Response(obj.body, { headers: { 'Content-Type': doc.mime_type||'application/octet-stream', 'Content-Disposition': `inline; filename="${encodeURIComponent(doc.original_name)}"` } })
})

// ── Revisionssicheres Archivieren ──────────────────────────────────────────────
documentsRouter.patch('/:id/archive', async (c) => {
  const db = c.env.DB
  const storage: R2Bucket = c.env.STORAGE
  const archive: R2Bucket = c.env.ARCHIVE

  if (!archive) return c.json({ error: 'Archiv-Bucket nicht verfügbar' }, 503)

  const { reason } = await c.req.json().catch(() => ({ reason: '' }))
  const email = c.req.header('Cf-Access-Authenticated-User-Email') || ''
  const now   = new Date().toISOString()

  const user = await db.prepare('SELECT id, display_name FROM users WHERE LOWER(email)=?')
    .bind(email.toLowerCase()).first<{id:string; display_name:string}>()

  const doc = await db.prepare('SELECT * FROM documents WHERE id=?')
    .bind(c.req.param('id')).first<any>()

  if (!doc) return c.json({ error: 'Dokument nicht gefunden' }, 404)
  if (doc.is_archived) return c.json({ error: 'Dokument bereits archiviert' }, 409)

  // Datei aus normalem R2 holen
  const obj = await storage.get(doc.r2_key)
  if (!obj) return c.json({ error: 'Datei nicht in R2 gefunden' }, 404)

  // Archiv-Key: archive/YYYY/MM/original-key (chronologisch + nachvollziehbar)
  const d = new Date(now)
  const archiveKey = `archive/${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${doc.r2_key}`

  // Datei in Archiv-Bucket kopieren (mit Metadaten)
  const body = await obj.arrayBuffer()
  await archive.put(archiveKey, body, {
    httpMetadata: {
      contentType: doc.mime_type || 'application/octet-stream',
      contentDisposition: `inline; filename="${doc.original_name}"`,
    },
    customMetadata: {
      originalName:   doc.original_name,
      docType:        doc.doc_type || '',
      docDate:        doc.doc_date || '',
      subject:        doc.subject  || '',
      companyId:      doc.company_id || '',
      uploadedBy:     doc.uploaded_by || '',
      archivedBy:     user?.id || '',
      archivedByName: user?.display_name || email,
      archivedAt:     now,
      archiveReason:  reason || '',
      checksum:       doc.checksum || '',
      crmDocId:       doc.id,
    }
  })

  // D1 aktualisieren
  await db.prepare(`UPDATE documents SET
    is_archived=1, archived_at=?, archived_by=?, archive_reason=?, archive_r2_key=?, updated_at=?
    WHERE id=?`
  ).bind(now, user?.id||null, reason||'', archiveKey, now, doc.id).run()

  return c.json({
    success:     true,
    archive_key: archiveKey,
    archived_at: now,
    archived_by: user?.display_name || email,
  })
})

// ── Archivierte Dokumente abrufen ────────────────────────────────────────────
documentsRouter.get('/archived', async (c) => {
  const db = c.env.DB
  const { company_id, limit = '50' } = c.req.query()
  let sql = `SELECT d.*, u.display_name as uploader, ab.display_name as archiver, co.name as company_name
    FROM documents d
    LEFT JOIN users u  ON d.uploaded_by=u.id
    LEFT JOIN users ab ON d.archived_by=ab.id
    LEFT JOIN companies co ON d.company_id=co.id
    WHERE d.is_archived=1`
  const params: any[] = []
  if (company_id) { sql += ' AND d.company_id=?'; params.push(company_id) }
  sql += ' ORDER BY d.archived_at DESC LIMIT ?'
  params.push(parseInt(limit))
  const { results } = await db.prepare(sql).bind(...params).all()
  return c.json({ documents: results })
})

// ── Archivierte Datei aus Archiv-Bucket abrufen ──────────────────────────────
documentsRouter.get('/:id/archive-view', async (c) => {
  const archive: R2Bucket = c.env.ARCHIVE
  if (!archive) return c.json({ error: 'Archiv-Bucket nicht verfügbar' }, 503)
  const doc = await c.env.DB.prepare('SELECT * FROM documents WHERE id=?')
    .bind(c.req.param('id')).first<any>()
  if (!doc?.archive_r2_key) return c.json({ error: 'Kein Archiv-Eintrag' }, 404)
  const obj = await archive.get(doc.archive_r2_key)
  if (!obj) return c.json({ error: 'Datei nicht im Archiv gefunden' }, 404)
  return new Response(obj.body, {
    headers: {
      'Content-Type': doc.mime_type || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${encodeURIComponent(doc.original_name)}"`,
      'X-Archive-Key': doc.archive_r2_key,
      'X-Archived-At': doc.archived_at || '',
    }
  })
})

// ── Metadaten aktualisieren ──
documentsRouter.patch('/:id', async (c) => {
  const b = await c.req.json() as any
  const allowed = ['doc_type','doc_date','subject','summary','tags','company_id','contact_id']
  const updates: string[] = []; const vals: any[] = []
  for (const [k,v] of Object.entries(b)) {
    if (allowed.includes(k)) { updates.push(k+'=?'); vals.push(k==='tags'?JSON.stringify(v):v) }
  }
  if (!updates.length) return c.json({ error: 'Nichts zu aktualisieren' }, 400)
  updates.push('updated_at=?'); vals.push(new Date().toISOString(), c.req.param('id'))
  await c.env.DB.prepare('UPDATE documents SET '+updates.join(',')+' WHERE id=?').bind(...vals).run()
  return c.json({ success: true })
})

documentsRouter.get('/meta/types', async (c) => c.json({ types: DOC_TYPES }))

// Won-Deals aus bestehenden Auftragsbestätigungen/Aufträgen erstellen
documentsRouter.post('/create-won-deals', async (c) => {
  const db = c.env.DB
  const email = c.req.header('Cf-Access-Authenticated-User-Email') || ''
  const user = await db.prepare('SELECT id FROM users WHERE LOWER(email)=?').bind(email.toLowerCase()).first() as any

  const { results: docs } = await db.prepare(
    `SELECT d.*, co.name as company_name FROM documents d
     LEFT JOIN companies co ON d.company_id = co.id
     WHERE d.doc_type IN ('Auftragsbestätigung','Auftrag')
     AND d.company_id IS NOT NULL AND d.is_archived=0`
  ).all()

  let created = 0
  let skipped = 0
  const now = new Date().toISOString()

  for (const doc of docs as any[]) {
    // Prüfen ob für dieses Dokument schon ein Won-Deal existiert
    const existing = await db.prepare(
      `SELECT id FROM deals WHERE notes LIKE ? AND stage='won'`
    ).bind(`%${doc.id}%`).first()
    if (existing) { skipped++; continue }

    // Auch prüfen ob für diese Firma generell Won-Deals existieren
    const existingFirm = await db.prepare(
      `SELECT id FROM deals WHERE company_id=? AND stage='won' LIMIT 1`
    ).bind(doc.company_id).first()
    if (existingFirm) { skipped++; continue }

    // Betrag aus gespeichertem Volltext extrahieren (z.B. "12.345,00 €")
    let docValue = 0
    if (doc.fulltext_idx) {
      const txt = doc.fulltext_idx as string
      const m = txt.match(/(\d{1,3}(?:\.\d{3})*,\d{2})\s*(?:EUR|€)/)
             || txt.match(/(?:EUR|€)\s*(\d{1,3}(?:\.\d{3})*,\d{2})/)
      if (m) docValue = parseFloat(m[1].replace(/\./g, '').replace(',', '.')) || 0
    }
    // Wenn kein Betrag aus Text: aktive Verträge der Firma → monatliche Rate × Restlaufzeit
    if (!docValue && doc.company_id) {
      const { results: svList } = await db.prepare(
        `SELECT monthly_value, end_date FROM contracts WHERE company_id=? AND status='active' LIMIT 5`
      ).bind(doc.company_id).all() as any
      for (const sv of svList) {
        if (sv.monthly_value && sv.end_date) {
          const refDate = doc.created_at ? new Date(doc.created_at) : new Date()
          const months = Math.max(0, Math.round(
            (new Date(sv.end_date).getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
          ))
          if (months > 0) docValue += sv.monthly_value * months
        }
      }
    }

    const dealId = crypto.randomUUID()
    await db.prepare(
      `INSERT INTO deals (id,title,company_id,owner_id,bereich,stage,value,probability,status,notes,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(
      dealId,
      (doc.subject || doc.doc_type) + (doc.company_name ? ' – ' + doc.company_name : ''),
      doc.company_id,
      user?.id || doc.uploaded_by,
      '',
      'won',
      docValue,
      100,
      'open',
      `Erstellt aus Dokument-Upload: ${doc.id} (${doc.doc_type})`,
      doc.created_at || now,
      now
    ).run()
    created++
  }

  return c.json({ success: true, created, skipped, total: docs.length })
})
