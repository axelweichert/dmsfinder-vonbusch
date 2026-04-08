import { Hono } from 'hono'

const proposalsRouter = new Hono<{ Bindings: { DB: D1Database; ANTHROPIC_API_KEY: string } }>()

// ── KI ANSCHREIBEN GENERIEREN ─────────────────────────────────────────────────

proposalsRouter.post('/generate-text', async (c) => {
  const apiKey = c.env.ANTHROPIC_API_KEY
  if (!apiKey) return c.json({ error: 'API-Key fehlt' }, 503)

  const b = await c.req.json() as any
  const net = b.net_total || 0

  const prompt = `Du bist ein erfahrener Vertriebstexter der von Busch GmbH, einem IT-Systemhaus in Bielefeld.
Schreibe ein professionelles Anschreiben und einen Schlusstext für folgendes Angebot.

Angaben zum Angebot:
- Deal/Titel: ${b.deal_title || ''}
- Kunde (Firma): ${b.firma || ''}
- Ansprechpartner (vollständiger Name): ${b.contact || ''}
- Geschäftsbereich: ${b.bereich || ''}
- Angebotsinhalt: ${b.items || ''}
- Gesamtvolumen (netto): ${net ? '€ ' + Math.round(net).toLocaleString('de-DE') : 'noch offen'}
- Absender/Vertrieb: ${b.sender || 'von Busch GmbH'}

WICHTIGE REGELN:
1. Leite den Vornamen aus dem vollständigen Namen ab und bestimme das Geschlecht anhand typisch deutscher Vornamen:
   - Männliche Vornamen → "Sehr geehrter Herr [Nachname],"
   - Weibliche Vornamen → "Sehr geehrte Frau [Nachname],"
   - Unbekannt → "Sehr geehrte Damen und Herren,"
2. Nutze IMMER die korrekte Anrede als erste Zeile des intro-Feldes
3. Stil: Professionell, direkt, auf Augenhöhe — kein Marketing-Blabla
4. Bezug zum konkreten Thema/Inhalt des Deals herstellen
5. intro: Anrede + 3-4 inhaltliche Sätze
6. outro: 2-3 Sätze, Gesprächsangebot, persönliche Note

Antworte NUR als JSON ohne Markdown-Blöcke:
{
  "salutation": "Sehr geehrter Herr Mustermann",
  "intro": "Sehr geehrter Herr Mustermann,\\n\\n[3-4 Sätze Anschreiben]",
  "outro": "[2-3 Sätze Schlusstext]"
}`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key':apiKey, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:1024,
        messages:[{ role:'user', content:prompt }] })
    })
    const data = await res.json() as any
    const text = data?.content?.[0]?.text || ''
    const clean = text.replace(/```json|```/g,'').trim()
    const parsed = JSON.parse(clean)
    return c.json({ success:true, ...parsed })
  } catch(e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// ── PDF GENERIERUNG via Cloudflare Browser Rendering REST API ─────────────────
// Kein Paket, kein Binding — nur ein fetch() zur CF REST API.
// Benötigt Secrets: CF_ACCOUNT_ID + CF_BR_TOKEN (Browser Rendering - Edit)

proposalsRouter.post('/pdf', async (c) => {
  try {
    const accountId = (c.env as any).CF_ACCOUNT_ID as string | undefined
    const token     = (c.env as any).CF_BR_TOKEN    as string | undefined

    const body = await c.req.json() as { html: string }
    if (!body?.html) return c.json({ error: 'Kein HTML übergeben' }, 400)

    // Fallback: Secrets noch nicht konfiguriert
    if (!accountId || !token) {
      return c.json({ error: 'CF_ACCOUNT_ID oder CF_BR_TOKEN nicht als Secret konfiguriert', fallback: true }, 503)
    }

    const apiResp = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/browser-rendering/pdf`,
      {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          html:       body.html,
          pdfOptions: {
            format:          'a4',
            printBackground: true,
            margin: { top: '14mm', right: '14mm', bottom: '14mm', left: '14mm' },
          },
        }),
      }
    )

    if (!apiResp.ok) {
      const errText = await apiResp.text().catch(() => '')
      console.error('Browser Rendering API Fehler:', apiResp.status, errText)
      // fallback:true → Frontend fällt automatisch auf jsPDF zurück
      return c.json({ error: 'CF Browser Rendering HTTP ' + apiResp.status + ': ' + errText.substring(0, 300), fallback: true }, 503)
    }

    const pdfBuffer = await apiResp.arrayBuffer()
    return new Response(pdfBuffer, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': 'inline; filename="angebot.pdf"',
      },
    })
  } catch (err: any) {
    console.error('PDF Endpoint Fehler:', err)
    return c.json({ error: err.message || 'Interner Fehler' }, 500)
  }
})

export { proposalsRouter }
