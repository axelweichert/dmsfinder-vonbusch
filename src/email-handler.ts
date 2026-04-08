import type { Env } from './index'

export async function emailHandler(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext) {
  try {
    // Nur von bekannten vonbusch.digital Adressen akzeptieren
    const from = message.from.toLowerCase()
    if (!from.includes('vonbusch.digital')) {
      message.setReject('Unauthorized sender')
      return
    }

    // E-Mail als Text lesen
    const raw = await streamToText(message.raw)

    // Excel-Anhang aus MIME extrahieren
    const { base64Data, filename } = extractExcelAttachment(raw)
    if (!base64Data) return // Kein Excel-Anhang

    // Base64 → Binary
    const binary = atob(base64Data)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

    // XLSX als ZIP entpacken und shared-strings.xml + sheet1.xml lesen
    const rows = await parseXlsxFromBytes(bytes)
    if (!rows.length) return

    // Import direkt in D1 durchführen
    await importRows(rows, env)

  } catch (err) {
    console.error('SalesViewer Email Import Fehler:', err)
  }
}

async function streamToText(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }
  const total = new Uint8Array(chunks.reduce((s, c) => s + c.length, 0))
  let offset = 0
  for (const c of chunks) { total.set(c, offset); offset += c.length }
  return new TextDecoder('latin1').decode(total)
}

function extractExcelAttachment(raw: string): { base64Data: string, filename: string } {
  // Boundary finden
  const boundaryMatch = raw.match(/boundary="?([^"\r\n;]+)"?/i)
  if (!boundaryMatch) return { base64Data: '', filename: '' }
  const boundary = boundaryMatch[1]
  const parts = raw.split('--' + boundary)

  for (const part of parts) {
    const lower = part.toLowerCase()
    if (
      lower.includes('application/vnd.openxmlformats') ||
      lower.includes('application/vnd.ms-excel') ||
      (lower.includes('.xlsx') && lower.includes('attachment'))
    ) {
      const filenameMatch = part.match(/filename\*?=(?:UTF-8'')?["']?([^"'\r\n;]+)["']?/i)
      const filename = filenameMatch ? decodeURIComponent(filenameMatch[1].trim()) : 'salesviewer.xlsx'

      // Header-Ende finden
      const headerEnd = part.search(/\r?\n\r?\n/)
      if (headerEnd === -1) continue
      const b64 = part.substring(headerEnd).replace(/[\r\n\s]/g, '')
      if (b64.length > 100) return { base64Data: b64, filename }
    }
  }
  return { base64Data: '', filename: '' }
}

async function parseXlsxFromBytes(bytes: Uint8Array): Promise<any[]> {
  // XLSX ist ein ZIP — wir suchen xl/sharedStrings.xml und xl/worksheets/sheet1.xml
  try {
    const { DecompressionStream } = globalThis as any

    // Einfacher ZIP-Parser: Local File Headers finden
    const view = new DataView(bytes.buffer)
    const files: Map<string, Uint8Array> = new Map()

    let offset = 0
    while (offset < bytes.length - 4) {
      // Local file header signature: 0x04034b50
      if (view.getUint32(offset, true) !== 0x04034b50) {
        offset++
        continue
      }

      const compression = view.getUint16(offset + 8, true)
      const compressedSize = view.getUint32(offset + 18, true)
      const filenameLength = view.getUint16(offset + 26, true)
      const extraLength = view.getUint16(offset + 28, true)
      const filename = new TextDecoder().decode(bytes.slice(offset + 30, offset + 30 + filenameLength))
      const dataOffset = offset + 30 + filenameLength + extraLength
      const compressedData = bytes.slice(dataOffset, dataOffset + compressedSize)

      if (filename.includes('sharedStrings') || filename.includes('sheet1') || filename.includes('sheet')) {
        if (compression === 0) {
          files.set(filename, compressedData)
        } else if (compression === 8 && DecompressionStream) {
          try {
            const ds = new DecompressionStream('deflate-raw')
            const writer = ds.writable.getWriter()
            writer.write(compressedData)
            writer.close()
            const reader = ds.readable.getReader()
            const chunks: Uint8Array[] = []
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              if (value) chunks.push(value)
            }
            const total = new Uint8Array(chunks.reduce((s, c) => s + c.length, 0))
            let off = 0
            for (const c of chunks) { total.set(c, off); off += c.length }
            files.set(filename, total)
          } catch { }
        }
      }
      offset = dataOffset + compressedSize
    }

    // sharedStrings und sheet1 parsen
    const ssKey = [...files.keys()].find(k => k.includes('sharedStrings'))
    const sheetKey = [...files.keys()].find(k => k.includes('sheet1') || (k.includes('sheet') && k.endsWith('.xml')))
    if (!ssKey || !sheetKey) return []

    const ssXml = new TextDecoder().decode(files.get(ssKey)!)
    const sheetXml = new TextDecoder().decode(files.get(sheetKey)!)

    // Shared strings parsen
    const sharedStrings: string[] = []
    const siMatches = ssXml.matchAll(/<si>([\s\S]*?)<\/si>/g)
    for (const m of siMatches) {
      const texts = [...m[1].matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map(t => t[1])
      sharedStrings.push(texts.join(''))
    }

    // Rows parsen
    const rowMatches = [...sheetXml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)]
    if (!rowMatches.length) return []

    // Header-Zeile finden (enthält "Unternehmen")
    let headers: string[] = []
    let headerRowIdx = -1
    const allRows: string[][] = []

    for (const rowMatch of rowMatches) {
      const cells: string[] = []
      const cellMatches = rowMatch[1].matchAll(/<c r="([A-Z]+\d+)"[^>]*t="([^"]*)"[^>]*>[\s\S]*?<v>([^<]*)<\/v>[\s\S]*?<\/c>|<c r="([A-Z]+\d+)"[^>]*>[\s\S]*?<v>([^<]*)<\/v>[\s\S]*?<\/c>/g)
      
      const rowData: {col: number, val: string}[] = []
      for (const cell of rowMatch[1].matchAll(/<c r="([A-Z]+)(\d+)"([^>]*)>([\s\S]*?)<\/c>/g)) {
        const colStr = cell[1]
        const col = colStr.split('').reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1
        const attrs = cell[3]
        const inner = cell[4]
        const vMatch = inner.match(/<v>([^<]*)<\/v>/)
        if (!vMatch) continue
        let val = vMatch[1]
        if (attrs.includes('t="s"')) val = sharedStrings[parseInt(val)] || ''
        else if (attrs.includes('t="str"') || attrs.includes('t="inlineStr"')) {
          val = inner.match(/<t>([^<]*)<\/t>/)?.[1] || val
        }
        rowData.push({ col, val })
      }

      const maxCol = Math.max(...rowData.map(r => r.col), 0)
      const row = new Array(maxCol + 1).fill('')
      for (const { col, val } of rowData) row[col] = val
      allRows.push(row)
    }

    // Header-Zeile finden
    for (let i = 0; i < allRows.length; i++) {
      if (allRows[i].some(c => c.trim() === 'Unternehmen')) {
        headers = allRows[i].map(h => h.trim())
        headerRowIdx = i
        break
      }
    }
    if (headerRowIdx === -1) return []

    // Datenzeilen in Objekte umwandeln
    const result: any[] = []
    for (let i = headerRowIdx + 1; i < allRows.length; i++) {
      const row = allRows[i]
      if (!row.some(c => c.trim())) continue
      const obj: any = {}
      headers.forEach((h, idx) => { if (h) obj[h] = row[idx] || '' })
      if (obj['Unternehmen']?.trim()) result.push(obj)
    }
    return result

  } catch (err) {
    console.error('XLSX parse error:', err)
    return []
  }
}

async function importRows(rows: any[], env: Env) {
  const db = env.DB
  const defaultUser = await db.prepare(
    `SELECT id FROM users WHERE role IN ('sales','sales_manager') AND active=1 ORDER BY display_name LIMIT 1`
  ).first<{id:string}>()
  const ownerId = defaultUser?.id || 'usr-aw'
  const now = new Date().toISOString()

  // Firmen deduplizieren
  const firmenMap = new Map<string, any>()
  for (const row of rows) {
    const name = (row['Unternehmen'] || '').trim()
    if (!name) continue
    if (!firmenMap.has(name)) firmenMap.set(name, { ...row, besuche: [row] })
    else firmenMap.get(name).besuche.push(row)
  }

  for (const [name, data] of firmenMap) {
    try {
      const website = (data['Website'] || '').replace(/^www\./, '').trim()
      const existing = await db.prepare(
        `SELECT id FROM companies WHERE name = ? OR (website LIKE ? AND website != '') LIMIT 1`
      ).bind(name, `%${website}%`).first<{id:string}>()

      let coId: string
      if (existing) {
        coId = existing.id
      } else {
        coId = crypto.randomUUID()
        const web = data['Website'] ? (data['Website'].startsWith('http') ? data['Website'] : 'https://' + data['Website']) : ''
        const seiten = (data['Besuchte Seiten'] || '').toLowerCase()
        let bereich = 'POM'
        if (seiten.includes('cloudflare')) bereich = 'Cloudflare'
        else if (seiten.includes('wlan')) bereich = 'eWLAN'
        else if (seiten.includes('robotik')) bereich = 'Robotik'

        await db.prepare(
          `INSERT INTO companies (id,name,status,bereich,city,country,phone,email,website,account_manager_id,notes,created_at,updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
        ).bind(coId, name, 'prospect', bereich,
          data['Stadt']||'', data['Land']||'Deutschland',
          data['Telefon']||'', data['E-Mail']||'', web, ownerId,
          `SalesViewer E-Mail Import ${new Date().toLocaleDateString('de-DE')} · Branche: ${data['Branche']||'–'}`,
          now, now).run()
      }

      // Aktivitäten für jeden Besuch
      for (const besuch of data.besuche) {
        const seiten = (besuch['Besuchte Seiten'] || '').split('\n').filter(Boolean)
        await db.prepare(
          `INSERT INTO activities (id,type,subject,body,company_id,owner_id,status,done_at,created_at,updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?)`
        ).bind(crypto.randomUUID(), 'note',
          `Website-Besuch (E-Mail): ${seiten.length} Seite(n) · ${besuch['Sitzungsdauer']||'–'}`,
          `Besuchte Seiten: ${seiten.slice(0,5).join(', ')}\nQuelle: ${besuch['Quelle']||'direkt'}\nAutomatisch via E-Mail-Import`,
          coId, ownerId, 'done', now, now, now).run()
      }

    } catch(err: any) {
      console.error(`Import Fehler ${name}:`, err.message)
    }
  }
}
