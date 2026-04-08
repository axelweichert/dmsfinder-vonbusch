import { Hono } from 'hono'
import type { Env } from '../index'

export const mailRouter = new Hono<{ Bindings: Env }>()

// ── Token holen ──
async function getToken(db: D1Database, email: string, clientId: string, clientSecret: string, tenantId: string): Promise<string | null> {
  const SCOPE = 'Calendars.Read Calendars.ReadWrite Mail.Read Mail.ReadWrite Mail.Send Contacts.Read Contacts.ReadWrite User.Read offline_access'
  const row = await db.prepare(
    'SELECT access_token, refresh_token, expires_at FROM ms_tokens WHERE email = ?'
  ).bind(email).first<{ access_token: string; refresh_token: string; expires_at: string }>()
  if (!row) return null
  if (new Date(row.expires_at) > new Date(Date.now() + 60_000)) return row.access_token
  if (!row.refresh_token) return null

  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId, client_secret: clientSecret,
      refresh_token: row.refresh_token, grant_type: 'refresh_token', scope: SCOPE
    })
  })
  const data = await res.json() as any
  if (!data.access_token) return null
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()
  await db.prepare(
    'INSERT INTO ms_tokens (email,access_token,refresh_token,expires_at,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET access_token=excluded.access_token,refresh_token=excluded.refresh_token,expires_at=excluded.expires_at,updated_at=excluded.updated_at'
  ).bind(email, data.access_token, data.refresh_token || row.refresh_token, expiresAt, new Date().toISOString()).run()
  return data.access_token
}

// ── Firma/Kontakt anhand E-Mail-Adresse finden ──
async function findCompanyContact(db: D1Database, addresses: string[]): Promise<{ companyId: string | null, contactId: string | null }> {
  let companyId: string | null = null
  let contactId: string | null = null

  for (const addr of addresses) {
    const addrLower = addr.toLowerCase()

    // 1. Kontakt direkt suchen (Gleichheit, kein LIKE)
    const contact = await db.prepare(
      'SELECT id, company_id FROM contacts WHERE LOWER(email) = ? LIMIT 1'
    ).bind(addrLower).first<{ id: string; company_id: string }>()
    if (contact) { contactId = contact.id; companyId = contact.company_id; break }

    // 2. Auch email_private prüfen
    const contact2 = await db.prepare(
      'SELECT id, company_id FROM contacts WHERE LOWER(email_private) = ? LIMIT 1'
    ).bind(addrLower).first<{ id: string; company_id: string }>()
    if (contact2) { contactId = contact2.id; companyId = contact2.company_id; break }

    // 3. Firma direkt über E-Mail (Gleichheit)
    const coByEmail = await db.prepare(
      'SELECT id FROM companies WHERE LOWER(email) = ? LIMIT 1'
    ).bind(addrLower).first<{ id: string }>()
    if (coByEmail) { companyId = coByEmail.id; break }

    // 4. Domain-Matching: E-Mail-Domain der Firma
    const domain = addrLower.split('@')[1]
    if (domain) {
      const coByDomain = await db.prepare(
        'SELECT id FROM companies WHERE LOWER(email) LIKE ? LIMIT 1'
      ).bind('%@' + domain).first<{ id: string }>()
      if (coByDomain) { companyId = coByDomain.id; break }

      // 5. Website-Domain (nur TLD+Domain, kein Wildcard am Anfang)
      const coByWeb = await db.prepare(
        'SELECT id FROM companies WHERE LOWER(website) LIKE ? LIMIT 1'
      ).bind('%' + domain).first<{ id: string }>()
      if (coByWeb) { companyId = coByWeb.id; break }
    }
  }
  return { companyId, contactId }
}

// ── Webhook registrieren ──
mailRouter.post('/subscribe', async (c) => {
  const email = c.req.header('Cf-Access-Authenticated-User-Email') || ''
  const token = await getToken(c.env.DB, email, c.env.MS_CLIENT_ID, c.env.MS_CLIENT_SECRET, c.env.MS_TENANT_ID)
  if (!token) return c.json({ error: 'Nicht authentifiziert — bitte zuerst Kalender verbinden' }, 401)

  const webhookSecret = c.env.WEBHOOK_SECRET || 'vonbusch-crm-webhook'
  const notificationUrl = 'https://crm.vonbusch.app/api/mail/webhook?secret=' + webhookSecret + '&email=' + encodeURIComponent(email)
  const expiresAt = new Date(Date.now() + 4200 * 60 * 1000).toISOString()

  const res = await fetch('https://graph.microsoft.com/v1.0/subscriptions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ changeType: 'created', notificationUrl, resource: 'me/messages', expirationDateTime: expiresAt, clientState: webhookSecret })
  })
  const data = await res.json() as any
  if (data.error) return c.json({ error: data.error.message }, 500)

  await c.env.DB.prepare(
    'INSERT INTO mail_subscriptions (id,email,subscription_id,expires_at,created_at) VALUES (?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET subscription_id=excluded.subscription_id,expires_at=excluded.expires_at'
  ).bind(crypto.randomUUID(), email, data.id, data.expirationDateTime, new Date().toISOString()).run()

  return c.json({ success: true, subscriptionId: data.id, expiresAt: data.expirationDateTime })
})

// ── Webhook erneuern ──
mailRouter.post('/renew', async (c) => {
  const email = c.req.header('Cf-Access-Authenticated-User-Email') || ''
  const sub = await c.env.DB.prepare('SELECT subscription_id FROM mail_subscriptions WHERE email = ?')
    .bind(email).first<{ subscription_id: string }>()
  if (!sub) return c.json({ error: 'Keine Subscription gefunden' }, 404)

  const token = await getToken(c.env.DB, email, c.env.MS_CLIENT_ID, c.env.MS_CLIENT_SECRET, c.env.MS_TENANT_ID)
  if (!token) return c.json({ error: 'Kein Token' }, 401)

  const expiresAt = new Date(Date.now() + 4200 * 60 * 1000).toISOString()
  const res = await fetch('https://graph.microsoft.com/v1.0/subscriptions/' + sub.subscription_id, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expirationDateTime: expiresAt })
  })
  if (!res.ok) return c.json({ error: 'Renewal fehlgeschlagen' }, 500)
  await c.env.DB.prepare('UPDATE mail_subscriptions SET expires_at=? WHERE email=?').bind(expiresAt, email).run()
  return c.json({ success: true, expiresAt })
})

// ── Status ──
mailRouter.get('/status', async (c) => {
  const email = c.req.header('Cf-Access-Authenticated-User-Email') || ''
  const sub = await c.env.DB.prepare('SELECT * FROM mail_subscriptions WHERE email = ?').bind(email).first()
  return c.json({ subscribed: !!sub, subscription: sub })
})

// ── Webhook Endpunkt (von Microsoft aufgerufen) ──
mailRouter.post('/webhook', async (c) => {
  const webhookSecret = c.env.WEBHOOK_SECRET || 'vonbusch-crm-webhook'

  // Validierungsanfrage beim Registrieren
  const validationToken = c.req.query('validationToken')
  if (validationToken) {
    return new Response(validationToken, { status: 200, headers: { 'Content-Type': 'text/plain' } })
  }

  const secret = c.req.query('secret')
  if (secret !== webhookSecret) return c.json({ error: 'Unauthorized' }, 401)

  const email = c.req.query('email') || ''
  const body = await c.req.json() as any
  const notifications = body.value || []

  for (const notification of notifications) {
    if (notification.clientState !== webhookSecret) continue
    const resourceId = notification.resourceData?.id
    if (!resourceId) continue
    c.executionCtx?.waitUntil(processMail(c.env, email, resourceId))
  }

  return c.json({ success: true })
})

// ── Mail via Webhook verarbeiten ──
async function processMail(env: Env, userEmail: string, messageId: string) {
  try {
    const token = await getToken(env.DB, userEmail, env.MS_CLIENT_ID, env.MS_CLIENT_SECRET, env.MS_TENANT_ID)
    if (!token) return

    const res = await fetch(
      'https://graph.microsoft.com/v1.0/me/messages/' + messageId + '?$select=subject,from,toRecipients,ccRecipients,receivedDateTime,bodyPreview,webLink,isDraft',
      { headers: { Authorization: 'Bearer ' + token } }
    )
    if (!res.ok) return
    const mail = await res.json() as any
    if (mail.isDraft) return

    const addresses: string[] = []
    if (mail.from?.emailAddress?.address) addresses.push(mail.from.emailAddress.address.toLowerCase())
    ;(mail.toRecipients || []).forEach((r: any) => { if (r.emailAddress?.address) addresses.push(r.emailAddress.address.toLowerCase()) })
    ;(mail.ccRecipients || []).forEach((r: any) => { if (r.emailAddress?.address) addresses.push(r.emailAddress.address.toLowerCase()) })

    const external = addresses.filter(a => !a.includes('vonbusch.digital') && !a.includes('vonbusch.eu'))
    if (!external.length) return

    const { companyId, contactId } = await findCompanyContact(env.DB, external)
    if (!companyId) return

    const user = await env.DB.prepare('SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1')
      .bind(userEmail.toLowerCase()).first<{ id: string }>()
    if (!user) return

    const fromAddr = mail.from?.emailAddress?.address?.toLowerCase() || ''
    const isOutgoing = fromAddr.includes('vonbusch.digital') || fromAddr.includes('vonbusch.eu')
    const direction = isOutgoing ? 'Ausgehend' : 'Eingehend'
    const now = new Date().toISOString()

    // Dedup: Prüfe ob diese Mail bereits archiviert wurde (anhand outlook_event_id)
    const existing = await env.DB.prepare('SELECT id FROM activities WHERE outlook_event_id=? LIMIT 1').bind(messageId).first()
    if (existing) return

    await env.DB.prepare(
      'INSERT INTO activities (id,type,subject,body,company_id,contact_id,owner_id,status,done_at,created_at,updated_at,outlook_event_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
    ).bind(
      crypto.randomUUID(), 'email',
      direction + ': ' + (mail.subject || '(kein Betreff)'),
      'Von: ' + (mail.from?.emailAddress?.name || '') + ' <' + (mail.from?.emailAddress?.address || '') + '>\n' +
      'Empfangen: ' + new Date(mail.receivedDateTime).toLocaleString('de-DE') + '\n\n' +
      (mail.bodyPreview || '') + '\n\nOutlook: ' + (mail.webLink || ''),
      companyId, contactId || null, user.id, 'done', now, now, now, messageId
    ).run()

    // Auch als Dokument speichern
    const docId = crypto.randomUUID()
    const bodyText = 'Von: ' + (mail.from?.emailAddress?.name||'') + ' <' + (mail.from?.emailAddress?.address||'') + '>\n' +
      'Betreff: ' + (mail.subject||'') + '\n' +
      'Datum: ' + new Date(mail.receivedDateTime).toLocaleString('de-DE') + '\n\n' +
      (mail.bodyPreview||'')
    await env.DB.prepare(
      'INSERT OR IGNORE INTO documents (id,version,r2_key,name,original_name,mime_type,size,doc_type,doc_date,subject,summary,company_id,contact_id,uploaded_by,is_archived,created_at,updated_at,fulltext_idx) VALUES (?,1,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,?)'
    ).bind(
      docId, 'email-sync/' + messageId,
      direction + ': ' + (mail.subject||'(kein Betreff)'),
      direction + ': ' + (mail.subject||'(kein Betreff)') + '.eml',
      'message/rfc822', bodyText.length,
      'E-Mail', now, mail.subject||'', bodyText.substring(0,500),
      companyId, contactId||null, user.id, now, now, bodyText
    ).run()
  } catch (err) {
    console.error('processMail error:', err)
  }
}

// ── Manueller EML Import ──
mailRouter.post('/import-eml', async (c) => {
  try {
    const email = c.req.header('Cf-Access-Authenticated-User-Email') || ''
    const body = await c.req.json() as any
    const { subject, fromEmail, fromName, toEmails, date, bodyPreview } = body
    const db = c.env.DB

    // Externe Adressen sammeln
    const allAddresses = [fromEmail, ...(toEmails || [])].filter((a: string) =>
      a && !a.toLowerCase().includes('vonbusch.digital') && !a.toLowerCase().includes('vonbusch.eu')
    )

    if (!allAddresses.length) {
      return c.json({ error: 'Nur interne von Busch GmbH Adressen — nichts zu importieren' })
    }

    // User holen
    const user = await db.prepare('SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1')
      .bind(email.toLowerCase()).first<{ id: string }>()
    if (!user) return c.json({ error: 'User nicht gefunden' }, 401)

    // Firma/Kontakt suchen
    let { companyId, contactId } = await findCompanyContact(db, allAddresses)

    // Nicht gefunden → automatisch anlegen
    if (!companyId) {
      const primaryAddr = allAddresses[0].toLowerCase()
      const domain = primaryAddr.split('@')[1] || ''

      const companyName = domain
        .replace(/\.(de|com|eu|net|org|io)$/, '')
        .split(/[-_.]/)
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
        .trim() || primaryAddr

      const isFromExternal = !fromEmail.toLowerCase().includes('vonbusch')
      const contactName = isFromExternal ? (fromName || primaryAddr.split('@')[0]) : primaryAddr.split('@')[0]
      const nameParts = contactName.replace(/['"<>]/g, '').trim().split(/\s+/)
      const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : contactName
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '–'

      const now2 = new Date().toISOString()
      const newCoId = crypto.randomUUID()
      const newCtId = crypto.randomUUID()

      await db.prepare(
        'INSERT INTO companies (id,name,status,city,country,email,website,notes,account_manager_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
      ).bind(
        newCoId, companyName, 'prospect', '', 'DE',
        isFromExternal ? fromEmail : '',
        domain ? 'https://' + domain : '',
        'Automatisch angelegt via E-Mail Import (' + new Date(date || now2).toLocaleDateString('de-DE') + ')',
        user.id, now2, now2
      ).run()

      await db.prepare(
        'INSERT INTO contacts (id,company_id,first_name,last_name,email,status,source,account_manager_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)'
      ).bind(newCtId, newCoId, firstName, lastName, isFromExternal ? fromEmail : primaryAddr, 'prospect', 'email', user.id, now2, now2).run()

      companyId = newCoId
      contactId = newCtId

      // KI-Signatur-Extraktion synchron ausführen
      await extractAndEnrich(db, newCoId, newCtId, fromName, fromEmail, bodyPreview || '', c.env.ANTHROPIC_API_KEY, email)
    }

    // Aktivität anlegen
    const isOutgoing = fromEmail.toLowerCase().includes('vonbusch')
    const direction = isOutgoing ? 'Ausgehend' : 'Eingehend'
    const now = new Date().toISOString()
    const mailDate = date || now

    await db.prepare(
      'INSERT INTO activities (id,type,subject,body,company_id,contact_id,owner_id,status,done_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
    ).bind(
      crypto.randomUUID(), 'email',
      direction + ': ' + (subject || '(kein Betreff)'),
      'Von: ' + (fromName || '') + ' <' + (fromEmail || '') + '>\nDatum: ' + new Date(mailDate).toLocaleString('de-DE') + '\n\n' + (bodyPreview || ''),
      companyId, contactId || null, user.id, 'done', mailDate, now, now
    ).run()

    // Firmenname für Antwort
    const company = await db.prepare('SELECT name, notes FROM companies WHERE id = ?')
      .bind(companyId).first<{ name: string; notes: string }>()
    const isNew = company?.notes?.includes('Automatisch angelegt') || false

    return c.json({
      success: true,
      message: 'Mail als Aktivität bei "' + (company?.name || '') + '" gespeichert',
      created: isNew ? 'Firma "' + company?.name + '" und Kontakt als Prospect angelegt' : null
    })
  } catch (err: any) {
    console.error('import-eml error:', err)
    return c.json({ error: err.message || 'Interner Fehler' }, 500)
  }
})

// ── KI-Signatur-Extraktion + Firmen/Kontakt-Anreicherung ──
async function extractAndEnrich(
  db: D1Database,
  companyId: string,
  contactId: string,
  fromName: string,
  fromEmail: string,
  bodyPreview: string,
  apiKey: string,
  userEmail: string
) {
  try {
    const prompt = `Extrahiere aus dieser E-Mail-Signatur/Nachricht die folgenden Informationen und antworte NUR mit einem JSON-Objekt, kein Text davor oder danach:

Absender: ${fromName} <${fromEmail}>
Nachricht/Signatur:
${bodyPreview}

Extrahiere:
{
  "company_name": "Offizieller Firmenname (z.B. Muster GmbH & Co. KG)",
  "first_name": "Vorname des Absenders",
  "last_name": "Nachname des Absenders",
  "position": "Position/Titel",
  "phone": "Telefonnummer",
  "mobile": "Mobilnummer",
  "street": "Straße und Hausnummer",
  "zip": "PLZ",
  "city": "Stadt",
  "country": "Land (DE für Deutschland)",
  "website": "Website-URL"
}

Felder die nicht erkennbar sind bitte als null angeben. Keine Erfindungen.`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20251001',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!res.ok) return
    const data = await res.json() as any
    const text = data.content?.[0]?.text || ''

    let extracted: any = {}
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) extracted = JSON.parse(jsonMatch[0])
    } catch { return }

    // Firma updaten
    const updates: string[] = []
    const vals: any[] = []

    if (extracted.company_name) { updates.push('name = ?'); vals.push(extracted.company_name) }
    if (extracted.street) { updates.push('street = ?'); vals.push(extracted.street) }
    if (extracted.zip) { updates.push('zip = ?'); vals.push(extracted.zip) }
    if (extracted.city) { updates.push('city = ?'); vals.push(extracted.city) }
    if (extracted.country) { updates.push('country = ?'); vals.push(extracted.country) }
    if (extracted.phone) { updates.push('phone = ?'); vals.push(extracted.phone) }
    if (extracted.website) { updates.push('website = ?'); vals.push(extracted.website.startsWith('http') ? extracted.website : 'https://' + extracted.website) }

    if (updates.length) {
      updates.push('updated_at = ?')
      vals.push(new Date().toISOString())
      vals.push(companyId)
      await db.prepare('UPDATE companies SET ' + updates.join(', ') + ' WHERE id = ?').bind(...vals).run()
    }

    // Kontakt updaten
    const ctUpdates: string[] = []
    const ctVals: any[] = []

    if (extracted.first_name) { ctUpdates.push('first_name = ?'); ctVals.push(extracted.first_name) }
    if (extracted.last_name) { ctUpdates.push('last_name = ?'); ctVals.push(extracted.last_name) }
    if (extracted.position) { ctUpdates.push('position = ?'); ctVals.push(extracted.position) }
    if (extracted.phone) { ctUpdates.push('phone = ?'); ctVals.push(extracted.phone) }
    if (extracted.mobile) { ctUpdates.push('mobile = ?'); ctVals.push(extracted.mobile) }

    if (ctUpdates.length) {
      ctUpdates.push('updated_at = ?')
      ctVals.push(new Date().toISOString())
      ctVals.push(contactId)
      await db.prepare('UPDATE contacts SET ' + ctUpdates.join(', ') + ' WHERE id = ?').bind(...ctVals).run()
    }

    // KI-Unternehmensanalyse starten
    await fetch('https://crm.vonbusch.app/api/companies/' + companyId + '/ai-summary', {
      method: 'POST',
      headers: { 'Cf-Access-Authenticated-User-Email': userEmail }
    }).catch(() => {})

  } catch (err) {
    console.error('extractAndEnrich error:', err)
  }
}
