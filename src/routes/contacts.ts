import { Hono } from 'hono'
import { addToJustInQueue } from './justin_queue'
import type { Env } from '../index'

export const contactsRouter = new Hono<{ Bindings: Env }>()

contactsRouter.get('/', async (c) => {
  const { status, company_id, optin, bereich, search, birthday_month, page = '1', limit = '100' } = c.req.query()
  const offset = (parseInt(page) - 1) * parseInt(limit)
  let q = `SELECT ct.*, co.name as firma_name, co.bereich as firma_bereich, co.status as firma_status
    FROM contacts ct LEFT JOIN companies co ON ct.company_id = co.id WHERE 1=1`
  const p: any[] = []
  if (status)         { q += ' AND ct.status = ?'; p.push(status) }
  if (company_id)     { q += ' AND ct.company_id = ?'; p.push(company_id) }
  if (optin === 'true')  q += ' AND ct.marketing_global_optin = 1'
  if (optin === 'false') q += ' AND ct.marketing_global_optin = 0'
  if (bereich)        { q += ' AND co.bereich LIKE ?'; p.push(`%${bereich}%`) }
  if (birthday_month) { q += ' AND strftime("%m", ct.birthday) = ?'; p.push(String(birthday_month).padStart(2,'0')) }
  if (search)         { q += ' AND (ct.first_name LIKE ? OR ct.last_name LIKE ? OR ct.email LIKE ?)'; p.push(`%${search}%`, `%${search}%`, `%${search}%`) }
  q += ' ORDER BY ct.last_name ASC, ct.first_name ASC LIMIT ? OFFSET ?'; p.push(parseInt(limit), offset)
  const { results } = await c.env.DB.prepare(q).bind(...p).all()
  const cnt = await c.env.DB.prepare('SELECT COUNT(*) as n FROM contacts').first<{n:number}>()
  return c.json({ data: results, total: cnt?.n ?? 0 })
})

contactsRouter.get('/:id', async (c) => {
  const ct = await c.env.DB.prepare(
    `SELECT ct.*, co.name as firma_name, co.bereich as firma_bereich
     FROM contacts ct LEFT JOIN companies co ON ct.company_id = co.id WHERE ct.id = ?`
  ).bind(c.req.param('id')).first()
  if (!ct) return c.json({ error: 'Not found' }, 404)
  return c.json(ct)
})

contactsRouter.post('/', async (c) => {
  const b = await c.req.json()
  const id = crypto.randomUUID(); const now = new Date().toISOString()
  await c.env.DB.prepare(
    `INSERT INTO contacts (id,company_id,first_name,last_name,email,email_private,phone,mobile,
     position,department,is_decision_maker,birthday,street,zip,city,status,account_manager_id,
     source,notes,interests,marketing_email,marketing_events,marketing_phone,marketing_post,
     marketing_global_optin,marketing_optin_date,erp_id,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    id,b.company_id,b.first_name,b.last_name,b.email||'',b.email_private||'',b.phone||'',b.mobile||'',
    b.position||'',b.department||'',b.is_decision_maker??0,b.birthday||null,b.street||'',b.zip||'',b.city||'',
    b.status||'prospect',b.account_manager_id||null,b.source||'manual',b.notes||'',
    JSON.stringify(b.interests||[]),b.marketing_email?1:0,b.marketing_events?1:0,
    b.marketing_phone?1:0,b.marketing_post?1:0,b.marketing_global_optin?1:0,
    b.marketing_global_optin?now:null,b.erp_id||null,now,now
  ).run()
  return c.json({ id }, 201)
})

contactsRouter.patch('/:id', async (c) => {
  const raw = await c.req.json() as any; const now = new Date().toISOString()
  const ctAllowed = ['first_name','last_name','email','phone','mobile','position','department','notes','dsgvo_email','dsgvo_phone','linkedin','xing','instagram','facebook']
  const b: any = Object.fromEntries(Object.entries(raw).filter(([k]) => ctAllowed.includes(k)))
  if (!Object.keys(b).length) return c.json({ success: true })
  const fields = Object.keys(b).map((k: string) => `${k} = ?`).join(', ')
  await c.env.DB.prepare(`UPDATE contacts SET ${fields}, updated_at = ? WHERE id = ?`).bind(...Object.values(b), now, c.req.param('id')).run()
  return c.json({ success: true })
})

contactsRouter.delete('/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM contacts WHERE id = ?').bind(c.req.param('id')).run()
  return c.json({ success: true })
})

// ── DUPLIKAT-PRÜFUNG ─────────────────────────────────────────────────────────
contactsRouter.get('/check-duplicate', async (c) => {
  const name = c.req.query('name') || ''
  const companyId = c.req.query('company_id') || ''
  const email = c.req.query('email') || ''
  if (!name || name.length < 2) return c.json({ duplicates: [] })

  const parts = name.split(' ')
  const fn = parts[0] || ''
  const ln = parts.slice(1).join(' ') || ''

  const conditions: string[] = []
  const params: string[] = []

  if (fn && ln) {
    conditions.push(`(first_name LIKE ? AND last_name LIKE ?)`)
    params.push(`%${fn}%`, `%${ln}%`)
  }
  if (email) {
    conditions.push(`LOWER(email)=?`)
    params.push(email.toLowerCase())
  }
  if (!conditions.length) return c.json({ duplicates: [] })

  const where = conditions.join(' OR ')
  const compFilter = companyId ? ` AND company_id=?` : ''
  if (companyId) params.push(companyId)

  const { results } = await c.env.DB.prepare(
    `SELECT id, first_name, last_name, email, company_id FROM contacts
     WHERE (${where})${compFilter} LIMIT 5`
  ).bind(...params).all()

  return c.json({ duplicates: results })
})
// ── MARKETING TAGS ────────────────────────────────────────────────────────────

// Alle Tags eines Kontakts laden
contactsRouter.get('/:id/marketing', async (c) => {
  const tags = await c.env.DB.prepare(
    'SELECT * FROM contact_marketing_tags WHERE contact_id=? ORDER BY category, action, year DESC'
  ).bind(c.req.param('id')).all()
  return c.json(tags.results)
})

// Tag setzen / aktualisieren (upsert)
contactsRouter.post('/:id/marketing', async (c) => {
  const b = await c.req.json() as any
  const { category, action, year, status, notes } = b
  const now = new Date().toISOString()
  const id = crypto.randomUUID()

  // Prüfen ob schon vorhanden
  const existing = await c.env.DB.prepare(
    'SELECT id FROM contact_marketing_tags WHERE contact_id=? AND action=? AND (year=? OR (year IS NULL AND ? IS NULL))'
  ).bind(c.req.param('id'), action, year||null, year||null).first() as any

  if (existing) {
    await c.env.DB.prepare(
      'UPDATE contact_marketing_tags SET status=?, notes=?, sent_at=CASE WHEN ?="sent" AND sent_at IS NULL THEN ? ELSE sent_at END, updated_at=? WHERE id=?'
    ).bind(status, notes||null, status, now, now, existing.id).run()
  } else {
    await c.env.DB.prepare(
      'INSERT INTO contact_marketing_tags (id,contact_id,category,action,year,status,notes,sent_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)'
    ).bind(id, c.req.param('id'), category, action, year||null, status, notes||null, status==='sent'?now:null, now, now).run()
  }
  return c.json({ success: true })
})

// Tag löschen
contactsRouter.delete('/:id/marketing/:tagId', async (c) => {
  await c.env.DB.prepare('DELETE FROM contact_marketing_tags WHERE id=? AND contact_id=?')
    .bind(c.req.param('tagId'), c.req.param('id')).run()
  return c.json({ success: true })
})

// Übersicht: Wie viele Kontakte pro Aktion+Jahr
contactsRouter.get('/marketing/stats', async (c) => {
  const stats = await c.env.DB.prepare(
    "SELECT action, year, status, COUNT(*) as count FROM contact_marketing_tags GROUP BY action, year, status ORDER BY action, year DESC"
  ).all()
  return c.json(stats.results)
})



// ── DUPLIKAT-KANDIDATEN ───────────────────────────────────────────────────────
contactsRouter.get('/:id/duplicates', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB
  const ct = await db.prepare('SELECT * FROM contacts WHERE id=?').bind(id).first<any>()
  if (!ct) return c.json({ candidates: [] })

  const byEmail = ct.email ? await db.prepare(
    `SELECT c.*,co.name as company_name FROM contacts c
     LEFT JOIN companies co ON c.company_id=co.id
     WHERE c.id!=? AND c.email=? LIMIT 5`
  ).bind(id, ct.email).all() : { results: [] }

  const nameLike = `%${(ct.last_name||'').trim()}%`
  const byName = await db.prepare(
    `SELECT c.*,co.name as company_name FROM contacts c
     LEFT JOIN companies co ON c.company_id=co.id
     WHERE c.id!=? AND c.last_name LIKE ? AND c.first_name LIKE ?
     LIMIT 5`
  ).bind(id, nameLike, `%${(ct.first_name||'').substring(0,3)}%`).all()

  const seen = new Set<string>([id])
  const candidates: any[] = []
  for (const r of [...(byEmail.results||[]), ...(byName.results||[])]) {
    if (!seen.has((r as any).id)) { seen.add((r as any).id); candidates.push(r) }
  }
  return c.json({ contact: ct, candidates: candidates.slice(0, 6) })
})

// ── MERGE KONTAKTE ─────────────────────────────────────────────────────────────
contactsRouter.post('/merge', async (c) => {
  const { winner_id, loser_id } = await c.req.json() as { winner_id: string; loser_id: string }
  if (!winner_id || !loser_id || winner_id === loser_id)
    return c.json({ error: 'winner_id und loser_id erforderlich' }, 400)

  const db  = c.env.DB
  const now = new Date().toISOString()

  const tables: Array<{ table: string; col: string }> = [
    { table: 'deals',      col: 'contact_id' },
    { table: 'activities', col: 'contact_id' },
    { table: 'documents',  col: 'contact_id' },
    { table: 'tickets',    col: 'contact_id' },
  ]
  for (const { table, col } of tables) {
    try {
      await db.prepare(`UPDATE ${table} SET ${col}=?,updated_at=? WHERE ${col}=?`)
        .bind(winner_id, now, loser_id).run()
    } catch(_) {}
  }

  // Loser löschen (Kontakte haben keinen eigenen Audit-Trail)
  await db.prepare('DELETE FROM contacts WHERE id=?').bind(loser_id).run()

  return c.json({ success: true, winner_id, loser_id })
})
