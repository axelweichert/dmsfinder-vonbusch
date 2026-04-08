import { Hono } from 'hono'
import type { Env } from '../index'

export const calendarRouter = new Hono<{ Bindings: Env }>()

const REDIRECT_URI = 'https://crm.vonbusch.app/api/calendar/callback'
const SCOPE = 'Calendars.Read Calendars.ReadWrite Mail.Read Mail.ReadWrite Mail.Send Contacts.Read Contacts.ReadWrite User.Read offline_access'

const pad = (n: number) => String(n).padStart(2, '0')
const fmtLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T00:00:00`

// ── Token aus D1 lesen + automatisch refreshen ──
async function getToken(db: D1Database, email: string, clientId: string, clientSecret: string, tenantId: string) {
  const row = await db.prepare(
    'SELECT access_token, refresh_token, expires_at FROM ms_tokens WHERE email = ?'
  ).bind(email).first<{ access_token: string; refresh_token: string; expires_at: string }>()
  if (!row) return null

  // Token noch gültig (mit 60 Sek. Puffer)?
  const expiresAt = new Date(row.expires_at)
  const now = new Date()
  if (expiresAt > new Date(now.getTime() + 60_000)) {
    return row.access_token
  }

  // Token abgelaufen → Refresh
  if (!row.refresh_token) return null

  try {
    const res = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: row.refresh_token,
          grant_type: 'refresh_token',
          scope: SCOPE,
        }),
      }
    )
    const data = await res.json() as any
    if (data.error || !data.access_token) return null

    // Neuen Token speichern
    await saveToken(db, email, data)
    return data.access_token
  } catch {
    return null
  }
}

// ── Token speichern ──
async function saveToken(db: D1Database, email: string, data: any) {
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()
  await db.prepare(`
    INSERT INTO ms_tokens (email, access_token, refresh_token, expires_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      access_token=excluded.access_token,
      refresh_token=excluded.refresh_token,
      expires_at=excluded.expires_at,
      updated_at=excluded.updated_at
  `).bind(email, data.access_token, data.refresh_token || '', expiresAt, new Date().toISOString()).run()
}

// ── Graph API abrufen ──
async function fetchGraph(token: string, startDt: string, endDt: string, select: string, top = 200) {
  const url = new URL('https://graph.microsoft.com/v1.0/me/calendarView')
  url.searchParams.set('startDateTime', startDt)
  url.searchParams.set('endDateTime', endDt)
  url.searchParams.set('$top', String(top))
  url.searchParams.set('$select', select)
  url.searchParams.set('$orderby', 'start/dateTime')

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      'Prefer': 'outlook.timezone="Europe/Berlin"'
    }
  })
  return res
}

// ── Debug: Secrets prüfen ──
calendarRouter.get('/debug', async (c) => {
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endDate = new Date(now.getFullYear(), now.getMonth() + 3, 0)
  return c.json({
    tenant_id_set: !!c.env.MS_TENANT_ID,
    client_id_set: !!c.env.MS_CLIENT_ID,
    client_secret_set: !!c.env.MS_CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    date_range: { start: fmtLocal(startDate), end: fmtLocal(endDate) }
  })
})

// ── Debug: Rohe Events für KW14 ──
calendarRouter.get('/debug-events', async (c) => {
  const email = c.req.header('Cf-Access-Authenticated-User-Email') || ''
  const token = await getToken(c.env.DB, email, c.env.MS_CLIENT_ID, c.env.MS_CLIENT_SECRET, c.env.MS_TENANT_ID)
  if (!token) return c.json({ needsAuth: true })

  const res = await fetchGraph(token, '2026-03-28T00:00:00', '2026-04-06T23:59:59',
    'subject,start,end,isAllDay', 50)

  if (!res.ok) {
    const txt = await res.text()
    return c.json({ error: res.status, body: txt })
  }

  const data = await res.json() as any
  return c.json({
    count: data.value?.length,
    events: data.value?.map((e: any) => ({
      subject: e.subject,
      start: e.start,
      end: e.end,
      isAllDay: e.isAllDay
    }))
  })
})

// ── OAuth Login starten ──
calendarRouter.get('/auth', async (c) => {
  const tenantId = c.env.MS_TENANT_ID
  const clientId = c.env.MS_CLIENT_ID
  const email = c.req.header('Cf-Access-Authenticated-User-Email') || ''
  const state = btoa(email)

  const url = new URL(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', REDIRECT_URI)
  url.searchParams.set('scope', SCOPE)
  url.searchParams.set('state', state)
  // prompt=consent nur wenn explizit angefordert (verhindert Consent-Loop)
  const forceConsent = c.req.query('force') === '1'
  url.searchParams.set('prompt', forceConsent ? 'consent' : 'select_account')

  return c.redirect(url.toString())
})

// ── OAuth Callback ──
calendarRouter.get('/callback', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  if (!code) return c.html('<script>window.location="/";alert("Anmeldung fehlgeschlagen")</script>')

  const email = state ? atob(state) : c.req.header('Cf-Access-Authenticated-User-Email') || ''

  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${c.env.MS_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: c.env.MS_CLIENT_ID,
        client_secret: c.env.MS_CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
        scope: SCOPE,
      }),
    }
  )

  const tokenData = await tokenRes.json() as any
  if (tokenData.error) {
    return c.html(`<script>window.location="/#kal";alert("Token-Fehler: ${tokenData.error_description}")</script>`)
  }

  await saveToken(c.env.DB, email, tokenData)
  return c.html('<script>window.location="/#kal";window.dispatchEvent(new Event("ms-auth-done"))</script>')
})

// ── Kalendereinträge abrufen (mit Paginierung) ──

// ── D1 Cache: Stale-While-Revalidate ────────────────────────────────────────
const CACHE_TTL_MS = 15 * 60 * 1000 // 15 Minuten

async function getCachedEvents(db: D1Database, email: string): Promise<{events: any[], fresh: boolean} | null> {
  const row = await db.prepare(
    'SELECT events_json, cached_at FROM calendar_cache WHERE email = ?'
  ).bind(email).first<{events_json: string, cached_at: string}>().catch(() => null)
  if (!row) return null
  const age = Date.now() - new Date(row.cached_at).getTime()
  return {
    events: JSON.parse(row.events_json),
    fresh: age < CACHE_TTL_MS
  }
}

async function setCachedEvents(db: D1Database, email: string, events: any[]): Promise<void> {
  const now = new Date().toISOString()
  await db.prepare(
    `INSERT INTO calendar_cache (email, events_json, event_count, cached_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET
       events_json = excluded.events_json,
       event_count = excluded.event_count,
       cached_at   = excluded.cached_at,
       updated_at  = excluded.updated_at`
  ).bind(email, JSON.stringify(events), events.length, now, now).run()
}

// waitUntil sicher verwenden (executionCtx kann undefined sein)
function safeWaitUntil(ctx: any, promise: Promise<any>): void {
  try {
    ctx?.waitUntil?.(promise)
  } catch {
    promise.catch(() => {})
  }
}

async function fetchAllGraphEvents(token: string): Promise<any[]> {
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endDate   = new Date(now.getFullYear(), now.getMonth() + 12, 0)
  const select = 'subject,start,end,location,bodyPreview,isAllDay,organizer,attendees,webLink'
  const firstUrl = new URL('https://graph.microsoft.com/v1.0/me/calendarView')
  firstUrl.searchParams.set('startDateTime', fmtLocal(startDate))
  firstUrl.searchParams.set('endDateTime',   fmtLocal(endDate))
  firstUrl.searchParams.set('$top', '500')
  firstUrl.searchParams.set('$select', select)
  firstUrl.searchParams.set('$orderby', 'start/dateTime')
  const allEvents: any[] = []
  let nextUrl: string | null = firstUrl.toString()
  let pages = 0
  while (nextUrl && pages < 20) {
    const res = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${token}`, 'Prefer': 'outlook.timezone="Europe/Berlin"' }
    })
    if (!res.ok) break
    const data = await res.json() as any
    allEvents.push(...(data.value || []))
    nextUrl = data['@odata.nextLink'] || null
    pages++
  }
  return allEvents
}

calendarRouter.get('/events', async (c) => {
  const email = c.req.header('Cf-Access-Authenticated-User-Email') || ''

  // 1. Cache prüfen — sofort antworten wenn vorhanden
  const cached = await getCachedEvents(c.env.DB, email)
  if (cached) {
    if (!cached.fresh) {
      // Stale: alten Cache sofort zurückgeben + im Hintergrund refreshen
      const token = await getToken(c.env.DB, email, c.env.MS_CLIENT_ID, c.env.MS_CLIENT_SECRET, c.env.MS_TENANT_ID)
      if (token) {
        safeWaitUntil(c.executionCtx,
          fetchAllGraphEvents(token)
            .then(events => setCachedEvents(c.env.DB, email, events))
            .catch(() => {})
        )
      }
    }
    return c.json({ events: cached.events, count: cached.events.length, fromCache: true, fresh: cached.fresh })
  }

  // 2. Kein Cache: Token holen und Graph-API aufrufen
  const token = await getToken(c.env.DB, email, c.env.MS_CLIENT_ID, c.env.MS_CLIENT_SECRET, c.env.MS_TENANT_ID)
  if (!token) return c.json({ needsAuth: true }, 401)

  try {
    const events = await fetchAllGraphEvents(token)
    // Cache schreiben (Hintergrund)
    // Cache synchron schreiben (sicher, kein executionCtx nötig)
    await setCachedEvents(c.env.DB, email, events).catch(() => {})
    return c.json({ events, count: events.length, fromCache: false, fresh: true })
  } catch (err: any) {
    console.error('calendar /events error:', String(err?.message || err))
    if (err?.status === 401) return c.json({ needsAuth: true }, 401)
    // events immer mitliefern damit Frontend nicht leer bleibt
    return c.json({ events: [], count: 0, error: String(err?.message || err) }, 500)
  }
})

// ── Auth-Status prüfen ──
calendarRouter.get('/status', async (c) => {
  const email = c.req.header('Cf-Access-Authenticated-User-Email') || ''
  const token = await getToken(c.env.DB, email, c.env.MS_CLIENT_ID, c.env.MS_CLIENT_SECRET, c.env.MS_TENANT_ID)
  return c.json({ authenticated: !!token, email })
})
