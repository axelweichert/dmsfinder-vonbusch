import { Hono } from 'hono'

const marketingRouter = new Hono<{ Bindings: any }>()

// ── ZT-SHIELD LEADS ──────────────────────────────────────────────────────────

// GET /api/marketing/zt-shield — alle Leads
marketingRouter.get('/zt-shield', async (c) => {
  const db = c.env.ZT_SHIELD_DB
  if (!db) return c.json({ error: 'ZT_SHIELD_DB nicht verfügbar' }, 503)
  const { status, limit = '50', offset = '0' } = c.req.query()
  let q = 'SELECT * FROM leads WHERE 1=1'
  const p: any[] = []
  if (status) { q += ' AND status=?'; p.push(status) }
  q += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
  p.push(parseInt(limit), parseInt(offset))
  const { results } = await db.prepare(q).bind(...p).all()
  const total = await db.prepare('SELECT COUNT(*) as n FROM leads' + (status ? ' WHERE status=?' : '')).bind(...(status ? [status] : [])).first() as any
  return c.json({ leads: results, total: total?.n || 0 })
})

// PATCH /api/marketing/zt-shield/:id — Status / Notes updaten
marketingRouter.patch('/zt-shield/:id', async (c) => {
  const db = c.env.ZT_SHIELD_DB
  if (!db) return c.json({ error: 'ZT_SHIELD_DB nicht verfügbar' }, 503)
  const id = c.req.param('id')
  const body = await c.req.json()
  const now = new Date().toISOString()
  const fields: string[] = []
  const vals: any[] = []
  if (body.status !== undefined) { fields.push('status=?'); vals.push(body.status) }
  if (body.notes  !== undefined) { fields.push('notes=?');  vals.push(body.notes)  }
  if (!fields.length) return c.json({ error: 'Nichts zu updaten' }, 400)
  fields.push('updated_at=?'); vals.push(now)
  vals.push(id)
  await db.prepare(`UPDATE leads SET ${fields.join(',')} WHERE id=?`).bind(...vals).run()
  return c.json({ success: true })
})

// POST /api/marketing/zt-shield/:id/convert — Lead → Aktivität + Firma/Kontakt
marketingRouter.post('/zt-shield/:id/convert', async (c) => {
  const crmDb = c.env.DB
  const ztDb  = c.env.ZT_SHIELD_DB
  if (!ztDb) return c.json({ error: 'ZT_SHIELD_DB nicht verfügbar' }, 503)

  const id = c.req.param('id')
  const email = c.req.header('Cf-Access-Authenticated-User-Email') || ''
  const user = await crmDb.prepare('SELECT id FROM users WHERE LOWER(email)=?').bind(email.toLowerCase()).first() as any

  const lead = await ztDb.prepare('SELECT * FROM leads WHERE id=?').bind(id).first() as any
  if (!lead) return c.json({ error: 'Lead nicht gefunden' }, 404)

  const now = new Date().toISOString()
  const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10) + 'T09:00:00.000Z'

  // 1. Firma suchen oder anlegen
  let companyId: string | null = null
  if (lead.company) {
    const existing = await crmDb.prepare(
      `SELECT id FROM companies WHERE LOWER(name) LIKE LOWER(?)`
    ).bind('%' + lead.company + '%').first() as any
    if (existing) {
      companyId = existing.id
    } else {
      companyId = crypto.randomUUID()
      await crmDb.prepare(
        `INSERT INTO companies (id,name,status,branche,created_at,updated_at) VALUES (?,?,'prospect','Cloudflare',?,?)`
      ).bind(companyId, lead.company, now, now).run()
    }
  }

  // 2. Kontakt suchen oder anlegen
  let contactId: string | null = null
  if (lead.email) {
    const existingCt = await crmDb.prepare(
      `SELECT id FROM contacts WHERE LOWER(email)=?`
    ).bind(lead.email.toLowerCase()).first() as any
    if (existingCt) {
      contactId = existingCt.id
    } else if (companyId) {
      contactId = crypto.randomUUID()
      await crmDb.prepare(
        `INSERT INTO contacts (id,company_id,first_name,last_name,email,created_at,updated_at) VALUES (?,?,?,?,?,?,?)`
      ).bind(contactId, companyId, lead.firstname, lead.lastname, lead.email, now, now).run()
    }
  }

  // 3. Aktivität anlegen
  const akId = crypto.randomUUID()
  const subject = `ZT-Shield Anfrage: ${lead.firstname} ${lead.lastname}${lead.company ? ' – ' + lead.company : ''}`
  const body = [
    `Modell: ${lead.model || '–'}`,
    `Lizenz: ${lead.license || '–'}`,
    `User: ${lead.users || '–'}`,
    lead.email_addon ? `E-Mail Security: ${lead.mboxes || 0} Mailboxen` : null,
    `Mitarbeiter: ${lead.employees || '–'}`,
    `Monatlicher Wert: ${lead.monthly_total || '–'}`,
    lead.message ? `Nachricht: ${lead.message}` : null,
  ].filter(Boolean).join('\n')

  await crmDb.prepare(
    `INSERT INTO activities (id,type,subject,body,company_id,contact_id,owner_id,status,due_at,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    akId, 'Lead', subject, body,
    companyId, contactId,
    user?.id || 'usr-aw',
    'open', dueAt, now, now
  ).run()

  // 4. Lead-Status auf "bearbeitet" setzen
  await ztDb.prepare(`UPDATE leads SET status='bearbeitet', updated_at=? WHERE id=?`).bind(now, id).run()

  return c.json({
    success: true,
    activity_id: akId,
    company_id: companyId,
    contact_id: contactId,
    company_created: !!(companyId && !lead.company_existed)
  })
})

export { marketingRouter }

// ── SECURITY CHECK LEADS ──────────────────────────────────────────────────────

marketingRouter.get('/sec-check', async (c) => {
  const db = c.env.SEC_CHECK_DB
  if (!db) return c.json({ error: 'SEC_CHECK_DB nicht verfügbar' }, 503)
  const { status, limit = '50' } = c.req.query()
  let q = 'SELECT l.*, s.risk_level, s.score_total FROM leads l LEFT JOIN lead_scores s ON s.lead_id=l.id WHERE 1=1'
  const p: any[] = []
  if (status) { q += ' AND l.status=?'; p.push(status) }
  q += ' ORDER BY l.created_at DESC LIMIT ?'
  p.push(parseInt(limit))
  const { results } = await db.prepare(q).bind(...p).all()
  const total = await db.prepare('SELECT COUNT(*) as n FROM leads' + (status ? ' WHERE status=?' : '')).bind(...(status ? [status] : [])).first() as any
  return c.json({ leads: results, total: total?.n || 0 })
})

marketingRouter.patch('/sec-check/:id', async (c) => {
  const db = c.env.SEC_CHECK_DB
  if (!db) return c.json({ error: 'SEC_CHECK_DB nicht verfügbar' }, 503)
  const id = c.req.param('id')
  const body = await c.req.json()
  const now = new Date().toISOString()
  const fields: string[] = []
  const vals: any[] = []
  if (body.status !== undefined) { fields.push('status=?'); vals.push(body.status) }
  if (!fields.length) return c.json({ error: 'Nichts zu updaten' }, 400)
  fields.push('done_at=?'); vals.push(body.status === 'done' ? now : null)
  vals.push(id)
  await db.prepare(`UPDATE leads SET ${fields.join(',')} WHERE id=?`).bind(...vals).run()
  return c.json({ success: true })
})

marketingRouter.post('/sec-check/:id/convert', async (c) => {
  const crmDb = c.env.DB
  const secDb = c.env.SEC_CHECK_DB
  if (!secDb) return c.json({ error: 'SEC_CHECK_DB nicht verfügbar' }, 503)
  const id = c.req.param('id')
  const email = c.req.header('Cf-Access-Authenticated-User-Email') || ''
  const user = await crmDb.prepare('SELECT id FROM users WHERE LOWER(email)=?').bind(email.toLowerCase()).first() as any
  const lead = await secDb.prepare('SELECT l.*, s.risk_level, s.score_total FROM leads l LEFT JOIN lead_scores s ON s.lead_id=l.id WHERE l.id=?').bind(id).first() as any
  if (!lead) return c.json({ error: 'Lead nicht gefunden' }, 404)
  const now = new Date().toISOString()
  const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0,10) + 'T09:00:00.000Z'

  let companyId: string | null = null
  if (lead.company_name) {
    const existing = await crmDb.prepare(`SELECT id FROM companies WHERE LOWER(name) LIKE LOWER(?)`).bind('%'+lead.company_name+'%').first() as any
    if (existing) { companyId = existing.id }
    else {
      companyId = crypto.randomUUID()
      await crmDb.prepare(`INSERT INTO companies (id,name,status,bereich,created_at,updated_at) VALUES (?,?,'prospect','Cloudflare',?,?)`).bind(companyId, lead.company_name, now, now).run()
    }
  }

  let contactId: string | null = null
  if (lead.email && companyId) {
    const existingCt = await crmDb.prepare(`SELECT id FROM contacts WHERE LOWER(email)=?`).bind(lead.email.toLowerCase()).first() as any
    if (existingCt) { contactId = existingCt.id }
    else {
      contactId = crypto.randomUUID()
      const nameParts = (lead.contact_name || '').split(' ')
      const first = nameParts[0] || ''
      const last = nameParts.slice(1).join(' ') || ''
      await crmDb.prepare(`INSERT INTO contacts (id,company_id,first_name,last_name,email,phone,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`).bind(contactId, companyId, first, last, lead.email, lead.phone||null, now, now).run()
    }
  }

  const akId = crypto.randomUUID()
  const riskLabel = lead.risk_level === 'high' ? '🔴 Hoch' : lead.risk_level === 'medium' ? '🟡 Mittel' : '🟢 Niedrig'
  const body = [
    `3-Minuten Security Check Ergebnis`,
    `Risiko: ${riskLabel} (Score: ${lead.score_total ?? '–'}/100)`,
    `Mitarbeiter: ${lead.employee_range || '–'}`,
    `Firewall: ${lead.firewall_vendor || '–'}`,
    `VPN: ${lead.vpn_technology || '–'}`,
    `Zero Trust: ${lead.zero_trust_vendor || '–'}`,
    lead.consent_contact ? 'Kontaktaufnahme: Ja' : 'Kontaktaufnahme: Nein',
    lead.discount_opt_in ? 'Rabatt-Interesse: Ja' : '',
  ].filter(Boolean).join('\n')

  await crmDb.prepare(`INSERT INTO activities (id,type,subject,body,company_id,contact_id,owner_id,status,due_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind(
    akId, 'Lead', `Security Check: ${lead.company_name||lead.contact_name}`, body,
    companyId, contactId, user?.id||'usr-aw', 'open', dueAt, now, now
  ).run()

  await secDb.prepare(`UPDATE leads SET status='done', done_at=? WHERE id=?`).bind(now, id).run()
  return c.json({ success: true, activity_id: akId, company_id: companyId })
})
