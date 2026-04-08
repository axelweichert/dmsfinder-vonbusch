import { Hono } from 'hono'

const sossRouter = new Hono<{ Bindings: any }>()

async function getMe(c: any) {
  const email = c.req.header('Cf-Access-Authenticated-User-Email') || ''
  return await c.env.DB.prepare(
    'SELECT id, role, team, display_name FROM users WHERE LOWER(email)=?'
  ).bind(email.toLowerCase()).first() as any
}

// ── AUFTRAGS-ÜBERSICHT ────────────────────────────────────────────────────────

sossRouter.get('/orders', async (c) => {
  const db = c.env.SOSS_DB
  if (!db) return c.json({ error: 'SOSS_DB nicht verfügbar' }, 503)

  const { status, limit = '50' } = c.req.query()
  let q = `SELECT o.*,
    cc.refinanzierer, cc.status as credit_status, cc.checked_at, cc.document_r2_key
    FROM soss_orders o
    LEFT JOIN soss_credit_checks cc ON cc.order_id = o.id
    WHERE 1=1`
  const p: any[] = []
  if (status) { q += ' AND o.status=?'; p.push(status) }
  q += ' ORDER BY o.created_at DESC LIMIT ?'
  p.push(parseInt(limit))

  const { results } = await db.prepare(q).bind(...p).all()

  // Firmen-Namen aus CRM D1 nachladen
  const enriched = await Promise.all((results as any[]).map(async (o: any) => {
    const co = await c.env.DB.prepare(
      'SELECT name, erp_id FROM companies WHERE id=?'
    ).bind(o.company_id).first() as any
    return { ...o, company_name: co?.name || o.erp_id, erp_id_display: co?.erp_id || o.erp_id }
  }))

  const total = await db.prepare('SELECT COUNT(*) as n FROM soss_orders').first() as any
  const pending = await db.prepare("SELECT COUNT(*) as n FROM soss_orders WHERE status='pending'").first() as any
  const approved = await db.prepare("SELECT COUNT(*) as n FROM soss_orders WHERE status='approved'").first() as any

  return c.json({ orders: enriched, total: total?.n || 0, pending: pending?.n || 0, approved: approved?.n || 0 })
})

// ── ORDER DETAIL ──────────────────────────────────────────────────────────────

sossRouter.get('/orders/:id', async (c) => {
  const db = c.env.SOSS_DB
  if (!db) return c.json({ error: 'SOSS_DB nicht verfügbar' }, 503)

  const order = await db.prepare(
    `SELECT o.*, cc.refinanzierer, cc.status as credit_status, cc.checked_at, cc.notes as credit_notes, cc.id as credit_check_id
     FROM soss_orders o
     LEFT JOIN soss_credit_checks cc ON cc.order_id=o.id
     WHERE o.id=?`
  ).bind(c.req.param('id')).first() as any
  if (!order) return c.json({ error: 'Nicht gefunden' }, 404)

  // Firmendata aus CRM
  const co = await c.env.DB.prepare(
    `SELECT co.name, co.erp_id, co.street, co.zip, co.city, co.phone,
     ct.first_name, ct.last_name, ct.email as ct_email
     FROM companies co LEFT JOIN contacts ct ON ct.company_id=co.id
     WHERE co.id=? LIMIT 1`
  ).bind(order.company_id).first() as any

  return c.json({ ...order, company: co })
})

// ── ORDER STATUS ÄNDERN ───────────────────────────────────────────────────────

sossRouter.patch('/orders/:id', async (c) => {
  const db = c.env.SOSS_DB
  const me = await getMe(c)
  if (!me) return c.json({ error: 'Nicht angemeldet' }, 401)
  if (!['admin', 'sales_manager'].includes(me.role)) return c.json({ error: 'Keine Berechtigung' }, 403)

  const { status, notes } = await c.req.json()
  const now = new Date().toISOString()
  await db.prepare('UPDATE soss_orders SET status=? WHERE id=?')
    .bind(status, c.req.param('id')).run()
  return c.json({ success: true })
})

// ── BONITÄTSPRÜFUNG GENEHMIGEN/ABLEHNEN ──────────────────────────────────────

sossRouter.patch('/credit-check/:id', async (c) => {
  const db = c.env.SOSS_DB
  const me = await getMe(c)
  if (!me) return c.json({ error: 'Nicht angemeldet' }, 401)

  const { status, notes, doc_id } = await c.req.json()
  const now = new Date().toISOString()

  await db.prepare(
    `UPDATE soss_credit_checks SET status=?, checked_by=?, checked_at=?, notes=?${doc_id ? ', document_r2_key=?' : ''} WHERE id=?`
  ).bind(...(doc_id
    ? [status, me.id, now, notes || '', doc_id, c.req.param('id')]
    : [status, me.id, now, notes || '', c.req.param('id')]
  )).run()

  // Order-Status synchronisieren
  const cc = await db.prepare('SELECT order_id FROM soss_credit_checks WHERE id=?')
    .bind(c.req.param('id')).first() as any
  if (cc?.order_id) {
    const orderStatus = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'credit_check'
    await db.prepare('UPDATE soss_orders SET status=? WHERE id=?')
      .bind(orderStatus, cc.order_id).run()
  }

  return c.json({ success: true })
})

// ── LINK GENERIEREN ────────────────────────────────────────────────────────────

sossRouter.get('/link', async (c) => {
  const { company_id, document_id } = c.req.query()
  if (!company_id || !document_id) return c.json({ error: 'Fehlende Parameter' }, 400)

  const co = await c.env.DB.prepare('SELECT erp_id, name FROM companies WHERE id=?')
    .bind(company_id).first() as any
  const doc = await c.env.DB.prepare('SELECT subject FROM documents WHERE id=?')
    .bind(document_id).first() as any

  if (!co?.erp_id) return c.json({ error: 'Firma hat keine Kundennummer' }, 400)

  // Angebotsnummer extrahieren (413251-7 → 413251)
  const offerNr = (doc?.subject || '').match(/(\d{5,6})/)?.[1] || ''
  if (!offerNr) return c.json({ error: 'Angebotsnummer nicht erkennbar' }, 400)

  const link = `https://soss.vonbusch.app/?k=${co.erp_id}&a=${offerNr}`
  return c.json({ link, kundennr: co.erp_id, angebotsnr: offerNr, firma: co.name, dokument: doc?.subject })
})



// ── SOSS STATS (für Dashboard-Badge) ──────────────────────────────────────────

sossRouter.get('/stats', async (c) => {
  const db = c.env.SOSS_DB
  if (!db) return c.json({ total: 0, pending: 0, won: 0 })
  try {
    const r = await db.prepare(
      "SELECT COUNT(*) as total, SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending FROM soss_orders"
    ).first() as any
    return c.json({ total: r?.total || 0, pending: r?.pending || 0 })
  } catch(_) {
    return c.json({ total: 0, pending: 0 })
  }
})

// ── BESTELLDOKUMENT AUS ARCHIV (oder on-the-fly) ─────────────────────────────

sossRouter.get('/bestellung/:orderId', async (c) => {
  const db = c.env.SOSS_DB
  if (!db) return c.json({ error: 'SOSS_DB nicht verfuegbar' }, 503)

  // Nur SOSS_DB abfragen (kein Cross-DB JOIN - D1 unterstuetzt das nicht)
  const ord = await db.prepare(
    'SELECT * FROM soss_orders WHERE id=?'
  ).bind(c.req.param('orderId')).first() as any
  if (!ord) return c.json({ error: 'Auftrag nicht gefunden' }, 404)

  // 1. Versuch: Archiv (PDF oder HTML)
  const sigKey = ord.signature_r2_key || ''
  const bestellKey = sigKey.startsWith('bestellungen/') ? sigKey : null
  const archivKey = bestellKey ||
    ('bestellungen/' + ord.signed_at.substring(0,7).replace('-','/') + '/' + ord.id + '-bestellung.pdf')

  try {
    const obj = await c.env.ARCHIVE.get(archivKey)
    if (obj) {
      const isPdf = archivKey.endsWith('.pdf')
      return new Response(obj.body as ReadableStream, {
        headers: {
          'Content-Type': isPdf ? 'application/pdf' : 'text/html; charset=utf-8',
          'Content-Disposition': 'inline; filename="Bestellung-' + ord.offer_number + (isPdf?'.pdf':'.html') + '"',
          'Cache-Control': 'private, max-age=3600',
        }
      })
    }
  } catch(_) {}

  // Suche auch HTML-Variante
  const htmlKey = archivKey.replace('.pdf', '.html')
  try {
    const obj = await c.env.ARCHIVE.get(htmlKey)
    if (obj) {
      return new Response(obj.body as ReadableStream, {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, max-age=3600' }
      })
    }
  } catch(_) {}

  // 2. Fallback: HTML-Bestelldokument on-the-fly generieren
  const crmDb = c.env.DB
  let firma = ord.firma || ''
  let adresse = ''
  let kontakt = ''
  let email = ''
  if (!firma && crmDb) {
    try {
      const co = await crmDb.prepare('SELECT name, street, zip, city, email FROM companies WHERE id=? LIMIT 1').bind(ord.company_id).first() as any
      if (co) {
        firma = co.name || ''
        adresse = [co.street, (co.zip && co.city) ? co.zip + ' ' + co.city : co.city].filter(Boolean).join(', ')
        email = co.email || ''
      }
      const ct = await crmDb.prepare('SELECT first_name, last_name, email FROM contacts WHERE company_id=? LIMIT 1').bind(ord.company_id).first() as any
      if (ct) {
        kontakt = ((ct.first_name||'') + ' ' + (ct.last_name||'')).trim()
        email = ct.email || email
      }
    } catch(_) {}
  }

  const dateStr = new Date(ord.signed_at).toLocaleString('de-DE', {dateStyle:'long', timeStyle:'short'})
  const fEu = (n: number) => new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(n)
  const finLabel = ord.financing_type === 'kauf' ? 'Kauf' : 'Finanzierung'

  // Signatur aus Archiv laden
  let sigHtml = ''
  if (ord.signature_r2_key && ord.signature_r2_key.startsWith('signatures/')) {
    try {
      const sigObj = await c.env.ARCHIVE.get(ord.signature_r2_key)
      if (sigObj) {
        const sigBytes = await sigObj.arrayBuffer()
        const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sigBytes)))
        sigHtml = '<div style="border:2px solid #0d1a14;border-radius:6px;padding:12px;margin:16px 0;background:#fafafa">'
          + '<div style="font-size:11px;font-weight:bold;color:#666;margin-bottom:8px">DIGITALE UNTERSCHRIFT</div>'
          + '<img src="data:image/png;base64,' + sigB64 + '" style="max-width:300px;max-height:100px;display:block;border:1px solid #eee;background:#fff" />'
          + '<div style="font-size:11px;color:#999;margin-top:6px">Unterzeichnet am ' + dateStr + (ord.ip_address ? ' · IP: ' + ord.ip_address : '') + '</div>'
          + '</div>'
      }
    } catch(_) {}
  }

  const html = '<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">'
    + '<title>Bestellung ' + ord.offer_number + '</title>'
    + '<style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:0 32px;color:#1a1a1a}'
    + 'h1{font-size:22px}h2{font-size:13px;color:#666;text-transform:uppercase;margin:24px 0 8px}'
    + 'table{width:100%;border-collapse:collapse;margin-bottom:16px}'
    + 'td{padding:8px 0;border-bottom:1px solid #eee;font-size:14px}'
    + 'td:first-child{color:#666;width:180px}td:last-child{font-weight:500}'
    + '.stamp{border:2px solid #0d1a14;padding:8px 16px;display:inline-block;font-weight:bold;margin:16px 0}'
    + '.footer{margin-top:48px;border-top:1px solid #ddd;padding-top:12px;font-size:11px;color:#999}'
    + '</style></head><body>'
    + '<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0d1a14;padding-bottom:16px;margin-bottom:24px">'
    + '<div><svg style="height:36px;width:auto;display:block" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 546.42 118.1"><path fill="#0d1a14" d="M513.89,50V163.78h10.49V133c0-11.59.91-25.67,15.33-25.67,12.19,0,13,9.39,13,19.87v36.56h10.48V125.29c0-15.18-3.93-28.15-21-28.15-7.6,0-13.24,3.45-17.56,9.66l-.26-.27V50Zm-20.58,53.67a32.06,32.06,0,0,0-19-6.49c-18.09,0-32.9,14.91-32.9,34.22,0,19.59,14.15,34.22,32.77,34.22,7.34,0,13.5-2.35,19.53-6.63V144.19h-.27c-5.11,7-11.27,11.18-20.05,11.18-12.84,0-21.23-11.18-21.23-24s9-24,21.76-24c8.25,0,14.28,4.42,19.13,10.9h.26ZM425,109.15c-2.75-6.76-9.31-12-16.39-12a18,18,0,0,0-18.35,18.36c0,20.41,27.79,15.45,27.79,29.93a9.6,9.6,0,0,1-10,9.94c-6.95,0-10-4.28-12.58-10.35l-9.31,4.14c3.28,10.21,11.4,16.42,21.76,16.42a20.66,20.66,0,0,0,20.84-21.11c0-10.9-7.08-15.46-14.29-18.63s-14.28-5.38-14.28-11.31c0-4.14,3.93-7.18,7.6-7.18s6.94,3.18,8.39,6.63ZM330,98.94H319.52v37.39c0,17.24,6.16,29.25,24.38,29.25s24.38-12,24.38-29.25V98.94H357.79v36.14c0,10.9-1.18,20.29-13.89,20.29S330,146,330,135.08ZM252.94,70.52h4.32c13.5,0,22.94,1.65,22.94,17.38,0,16.14-10.62,17.66-23.07,17.66h-4.19Zm-11,93.26h22.93c19.53,0,35.39-8.28,35.39-29,0-12.42-6.94-23.59-18.74-26.63,6.68-4.69,9.7-11.86,9.7-20.28,0-21.25-15.07-28.14-33-28.14H241.93Zm11-48.28h9.57c12.05,0,26.73,2.34,26.73,18.48,0,15.87-13,19-25.29,19h-11ZM179.28,98.94H168.79v64.84h10.49V133c0-11.59.92-25.67,15.33-25.67,12.19,0,13,9.39,13,19.87v36.56h10.48V125.29c0-15.18-3.93-28.15-21-28.15-7.6,0-13.24,3.45-17.56,9.66h-.26Zm-61.21,8.41c13,0,21.89,10.9,21.89,24s-8.91,24-21.89,24-21.89-10.77-21.89-24,8.91-24,21.89-24m0,58.23c18,0,32.37-15,32.37-34.08s-14.28-34.36-32.37-34.36S85.7,112.46,85.7,131.5s14.41,34.08,32.37,34.08M28.68,98.94H16.75L47,168.06,77.18,98.94H65.38L47,142.54Z" transform="translate(-16.75 -49.96)"/></svg><br>'
    + '<span style="font-size:12px;color:#666">von Busch GmbH &middot; Alfred-Bozi-Str. 12 &middot; 33602 Bielefeld</span></div>'
    + '<div style="text-align:right"><strong>BESTELLUNG</strong><br>'
    + '<span style="font-size:12px;color:#666">Angebotsnr.: ' + ord.offer_number + '<br>'
    + 'Datum: ' + dateStr + '<br>Ref.: ' + ord.id.substring(0,8).toUpperCase() + '</span></div></div>'
    + '<h2>Auftraggeber</h2><table>'
    + '<tr><td>Firma</td><td>' + (firma||'-') + '</td></tr>'
    + (adresse ? '<tr><td>Adresse</td><td>' + adresse + '</td></tr>' : '')
    + (kontakt ? '<tr><td>Ansprechpartner</td><td>' + kontakt + '</td></tr>' : '')
    + (email ? '<tr><td>E-Mail</td><td>' + email + '</td></tr>' : '')
    + '<tr><td>Kundennummer</td><td>' + ord.erp_id + '</td></tr></table>'
    + '<h2>Auftragsdetails</h2><table>'
    + '<tr><td>Angebotsnummer</td><td>' + ord.offer_number + '</td></tr>'
    + '<tr><td>Finanzierungsart</td><td>' + finLabel + '</td></tr>'
    + (ord.monthly_rate ? '<tr><td>Monatliche Rate</td><td><strong>' + fEu(ord.monthly_rate) + ' / Monat</strong> zzgl. MwSt.</td></tr>' : '')
    + (ord.contract_months ? '<tr><td>Laufzeit</td><td>' + ord.contract_months + ' Monate</td></tr>' : '')
    + (ord.total_value ? '<tr><td>Gesamtbetrag</td><td>' + fEu(ord.total_value) + ' zzgl. MwSt.</td></tr>' : '')
    + '<tr><td>Servicevertrag</td><td>' + (ord.service_included ? 'Ja' : ord.service_interest ? 'Interesse geaeuert' : 'Nein') + '</td></tr>'
    + '<tr><td>Beauftragt am</td><td>' + dateStr + '</td></tr></table>'
    + sigHtml
    + '<div class="stamp">&#10003; Verbindliche Beauftragung</div>'
    + '<p style="font-size:12px;color:#666;margin-top:16px">Hinweis: Die Originalunterschrift ist revisionssicher im Archiv hinterlegt (ID: ' + ord.id + '). Dieses Dokument wurde on-the-fly aus den CRM-Daten generiert.</p>'
    + '<div class="footer">von Busch GmbH &middot; Alfred-Bozi-Str. 12 &middot; 33602 Bielefeld &middot; Tel.: 0521-9624-0 | Dok-ID: ' + ord.id + '</div>'
    + '</body></html>'

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' }
  })
})

export { sossRouter }
