import { Hono } from 'hono'
import type { Env } from '../index'

export const salesviewerRouter = new Hono<{ Bindings: Env }>()

// POST /api/salesviewer/import
// Nimmt SalesViewer Excel als Base64 oder JSON-Array entgegen
salesviewerRouter.post('/import', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  const rows: any[] = body.rows // Array von geparsten Zeilen
  const userEmail = c.req.header('Cf-Access-Authenticated-User-Email') || ''

  if (!rows?.length) return c.json({ error: 'Keine Daten' }, 400)

  // Zuständigen User ermitteln (Standard: erster Sales Manager)
  const defaultUser = await db.prepare(
    `SELECT id FROM users WHERE role IN ('sales','sales_manager') AND active=1 ORDER BY display_name LIMIT 1`
  ).first<{id:string}>()
  const ownerId = defaultUser?.id || 'usr-aw'

  const now = new Date().toISOString()
  const results = { created: 0, updated: 0, activities: 0, skipped: 0, errors: [] as string[] }

  // Firmen deduplizieren (mehrere Besuche gleicher Firma zusammenführen)
  const firmenMap = new Map<string, any>()
  for (const row of rows) {
    const name = (row.Unternehmen || '').trim()
    if (!name || name === 'Unternehmen') continue
    if (!firmenMap.has(name)) {
      firmenMap.set(name, { ...row, besuche: [row] })
    } else {
      firmenMap.get(name).besuche.push(row)
    }
  }

  for (const [name, data] of firmenMap) {
    try {
      // Prüfen ob Firma bereits existiert (nach Name oder Website)
      const website = (data.Website || '').replace(/^www\./, '').trim()
      let existing = await db.prepare(
        `SELECT id FROM companies WHERE name = ? OR (website LIKE ? AND website != '') LIMIT 1`
      ).bind(name, `%${website}%`).first<{id:string}>()

      let coId: string

      if (existing) {
        coId = existing.id
        results.updated++
      } else {
        // Neue Firma anlegen
        coId = crypto.randomUUID()
        const web = data.Website ? (data.Website.startsWith('http') ? data.Website : 'https://' + data.Website) : ''

        // Bereich aus besuchten Seiten ableiten
        const seiten = (data.Besuchte_Seiten || '').toLowerCase()
        let bereich = 'POM'
        if (seiten.includes('cloudflare') || seiten.includes('security')) bereich = 'Cloudflare'
        else if (seiten.includes('wlan') || seiten.includes('netzwerk') || seiten.includes('ewlan')) bereich = 'eWLAN'
        else if (seiten.includes('robotik') || seiten.includes('robot')) bereich = 'Robotik'
        else if (seiten.includes('rfid') || seiten.includes('mde') || seiten.includes('autoid')) bereich = 'AutoID'
        else if (seiten.includes('proxmox') || seiten.includes('server')) bereich = 'Proxmox'
        else if (seiten.includes('largformat') || seiten.includes('lfp') || seiten.includes('grossformat')) bereich = 'LFP'
        else if (seiten.includes('digital') || seiten.includes('druck')) bereich = 'Digitaldruckerei'

        await db.prepare(
          `INSERT INTO companies (id,name,status,bereich,city,country,phone,email,website,account_manager_id,notes,created_at,updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
        ).bind(
          coId, name, 'prospect', bereich,
          data.Stadt || '', data.Land || 'Deutschland',
          data.Telefon || '', data.Email || '', web,
          ownerId,
          `SalesViewer Import ${new Date().toLocaleDateString('de-DE')} · Branche: ${data.Branche || '–'}`,
          now, now
        ).run()
        results.created++
      }

      // Aktivität für jeden Besuch anlegen
      for (const besuch of data.besuche) {
        const seiten = (besuch.Besuchte_Seiten || '').split('\n').filter(Boolean)
        const seitenText = seiten.slice(0, 5).join(', ')
        const datum = besuch.Datum || now

        const subject = `Website-Besuch: ${seiten.length} Seite(n) · ${besuch.Sitzungsdauer || '–'}`
        const body = `Besuchte Seiten: ${seitenText}${seiten.length > 5 ? ` (+${seiten.length - 5} weitere)` : ''}\n` +
          `Quelle: ${besuch.Quelle || 'direkt'} · Kategorie: ${besuch.Kategorie || '–'}\n` +
          `Sitzungsdauer: ${besuch.Sitzungsdauer || '–'} · Seitenaufrufe: ${besuch.Seitenaufrufe || '–'}`

        const akId = crypto.randomUUID()
        await db.prepare(
          `INSERT INTO activities (id,type,subject,body,company_id,owner_id,status,done_at,created_at,updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?)`
        ).bind(akId, 'note', subject, body, coId, ownerId, 'done', now, now, now).run()
        results.activities++
      }

      // KI-Zusammenfassung asynchron triggern (fire and forget)
      c.executionCtx?.waitUntil(
        fetch(`https://${c.req.header('host')}/api/companies/${coId}/ai-summary`, {
          method: 'POST',
          headers: { 'Cf-Access-Authenticated-User-Email': userEmail }
        }).catch(() => {})
      )

    } catch (err: any) {
      results.errors.push(`${name}: ${err.message}`)
    }
  }

  return c.json({ success: true, ...results })
})

// POST /api/salesviewer/import-r2
// Wird intern vom Email-Handler aufgerufen
salesviewerRouter.post('/import-r2', async (c) => {
  const internalToken = c.req.header('X-Internal-Token')
  if (internalToken !== 'salesviewer-internal') return c.json({ error: 'Unauthorized' }, 401)

  const { r2Key, filename } = await c.req.json()
  if (!r2Key) return c.json({ error: 'Kein R2-Key' }, 400)

  // Excel aus R2 laden
  const obj = await c.env.STORAGE.get(r2Key)
  if (!obj) return c.json({ error: 'Datei nicht in R2 gefunden' }, 404)

  const arrayBuffer = await obj.arrayBuffer()

  // XLSX mit eingebautem Parser verarbeiten
  // Da wir keinen SheetJS im Worker haben, nutzen wir einen einfachen XLSX-Parser
  // Die Datei wird als Binary verarbeitet
  const rows = await parseXlsxSimple(arrayBuffer)

  if (!rows.length) return c.json({ error: 'Keine Daten in Excel' }, 400)

  // Gleiche Import-Logik wie beim manuellen Upload
  const db = c.env.DB
  const defaultUser = await db.prepare(
    `SELECT id FROM users WHERE role IN ('sales','sales_manager') AND active=1 ORDER BY display_name LIMIT 1`
  ).first<{id:string}>()
  const ownerId = defaultUser?.id || 'usr-aw'
  const now = new Date().toISOString()
  const results = { created: 0, updated: 0, activities: 0, errors: [] as string[] }

  // Firmen deduplizieren
  const firmenMap = new Map<string, any>()
  for (const row of rows) {
    const name = (row['Unternehmen'] || '').trim()
    if (!name || name === 'Unternehmen') continue
    if (!firmenMap.has(name)) firmenMap.set(name, { ...row, besuche: [row] })
    else firmenMap.get(name).besuche.push(row)
  }

  for (const [name, data] of firmenMap) {
    try {
      const website = (data['Website'] || '').replace(/^www\./, '').trim()
      let existing = await db.prepare(
        `SELECT id FROM companies WHERE name = ? OR (website LIKE ? AND website != '') LIMIT 1`
      ).bind(name, `%${website}%`).first<{id:string}>()

      let coId: string
      if (existing) {
        coId = existing.id
        results.updated++
      } else {
        coId = crypto.randomUUID()
        const web = data['Website'] ? (data['Website'].startsWith('http') ? data['Website'] : 'https://' + data['Website']) : ''
        const seiten = (data['Besuchte Seiten'] || data['Besuchte_Seiten'] || '').toLowerCase()
        let bereich = 'POM'
        if (seiten.includes('cloudflare')) bereich = 'Cloudflare'
        else if (seiten.includes('wlan')) bereich = 'eWLAN'
        else if (seiten.includes('robotik')) bereich = 'Robotik'

        await db.prepare(
          `INSERT INTO companies (id,name,status,bereich,city,country,phone,email,website,account_manager_id,notes,created_at,updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
        ).bind(coId, name, 'prospect', bereich, data['Stadt']||'', data['Land']||'Deutschland',
          data['Telefon']||'', data['E-Mail']||data['Email']||'', web, ownerId,
          `SalesViewer E-Mail Import ${new Date().toLocaleDateString('de-DE')} · Branche: ${data['Branche']||'–'}`,
          now, now).run()
        results.created++
      }

      for (const besuch of data.besuche) {
        const seiten = (besuch['Besuchte Seiten'] || besuch['Besuchte_Seiten'] || '').split('\n').filter(Boolean)
        const akId = crypto.randomUUID()
        await db.prepare(
          `INSERT INTO activities (id,type,subject,body,company_id,owner_id,status,done_at,created_at,updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?)`
        ).bind(akId, 'note',
          `Website-Besuch: ${seiten.length} Seite(n) · ${besuch['Sitzungsdauer']||'–'}`,
          `Besuchte Seiten: ${seiten.slice(0,5).join(', ')}\nQuelle: ${besuch['Quelle']||'direkt'}`,
          coId, ownerId, 'done', now, now, now).run()
        results.activities++
      }
    } catch(err: any) {
      results.errors.push(`${name}: ${err.message}`)
    }
  }

  return c.json({ success: true, ...results })
})

// Einfacher XLSX-Parser für Cloudflare Workers (ohne SheetJS)
async function parseXlsxSimple(buffer: ArrayBuffer): Promise<any[]> {
  // XLSX ist ein ZIP — wir nutzen eine vereinfachte Extraktion
  // Da wir keinen vollständigen XLSX-Parser haben, delegieren wir das
  // Für jetzt: Datei in R2 ablegen und manuell importieren
  // TODO: SheetJS als WASM einbinden für vollständige Unterstützung
  return []
}
