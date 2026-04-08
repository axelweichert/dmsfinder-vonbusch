import { Hono } from 'hono'
import type { Env } from '../index'

export const searchRouter = new Hono<{ Bindings: Env }>()

searchRouter.get('/', async (c) => {
  const q = (c.req.query('q') || '').trim()
  if (q.length < 2) return c.json({ results: [] })

  const db = c.env.DB
  const term = '%' + q + '%'
  const results: any[] = []

  try {
    // ── Firmen ──
    const coByName = await db.prepare('SELECT id,name,city,status,bereich FROM companies WHERE name LIKE ? LIMIT 5').bind(term).all()
    const coByCity = await db.prepare('SELECT id,name,city,status,bereich FROM companies WHERE city LIKE ? LIMIT 3').bind(term).all()
    const seen = new Set<string>()
    for (const r of [...coByName.results, ...coByCity.results] as any[]) {
      if (seen.has(r.id)) continue; seen.add(r.id)
      results.push({ type:'company', id:r.id, title:r.name, sub:[r.bereich,r.city].filter(Boolean).join(' · '), status:r.status })
    }

    // ── Kontakte ──
    const ctByFirst = await db.prepare(`SELECT ct.id,ct.first_name,ct.last_name,ct.email,ct.position,co.name as cn,co.id as cid FROM contacts ct LEFT JOIN companies co ON ct.company_id=co.id WHERE ct.first_name LIKE ? LIMIT 5`).bind(term).all()
    const ctByLast  = await db.prepare(`SELECT ct.id,ct.first_name,ct.last_name,ct.email,ct.position,co.name as cn,co.id as cid FROM contacts ct LEFT JOIN companies co ON ct.company_id=co.id WHERE ct.last_name LIKE ? LIMIT 5`).bind(term).all()
    const ctByEmail = await db.prepare(`SELECT ct.id,ct.first_name,ct.last_name,ct.email,ct.position,co.name as cn,co.id as cid FROM contacts ct LEFT JOIN companies co ON ct.company_id=co.id WHERE ct.email LIKE ? LIMIT 3`).bind(term).all()
    const seenCt = new Set<string>()
    for (const r of [...ctByFirst.results, ...ctByLast.results, ...ctByEmail.results] as any[]) {
      if (seenCt.has(r.id) || seenCt.size >= 5) continue; seenCt.add(r.id)
      results.push({ type:'contact', id:r.id, companyId:r.cid, title:r.first_name+' '+r.last_name, sub:[r.position,r.cn].filter(Boolean).join(' · '), email:r.email })
    }

    // ── Deals ──
    const deals = await db.prepare(`SELECT d.id,d.title,d.stage,d.value,co.name as cn,co.id as cid FROM deals d LEFT JOIN companies co ON d.company_id=co.id WHERE d.title LIKE ? LIMIT 5`).bind(term).all()
    for (const r of deals.results as any[]) {
      results.push({ type:'deal', id:r.id, companyId:r.cid, title:r.title, sub:(r.cn||'')+(r.stage?' · '+r.stage:''), value:r.value })
    }

    // ── Aktivitäten ──
    const akBySubj = await db.prepare(`SELECT a.id,a.subject,a.type,a.status,co.name as cn,co.id as cid FROM activities a LEFT JOIN companies co ON a.company_id=co.id WHERE a.subject LIKE ? LIMIT 5`).bind(term).all()
    for (const r of akBySubj.results as any[]) {
      results.push({ type:'activity', id:r.id, companyId:r.cid, title:r.subject, sub:[r.cn,r.type].filter(Boolean).join(' · '), status:r.status })
    }

    // ── Tickets ──
    const tkByTitle = await db.prepare(`SELECT t.id,t.subject as title,t.status,t.priority,co.name as cn,co.id as cid FROM tickets t LEFT JOIN companies co ON t.company_id=co.id WHERE t.subject LIKE ? LIMIT 5`).bind(term).all()
    for (const r of tkByTitle.results as any[]) {
      results.push({ type:'ticket', id:r.id, companyId:r.cid, title:r.title, sub:[r.cn,r.priority].filter(Boolean).join(' · '), status:r.status })
    }

  } catch(err: any) {
    console.error('Search error:', err)
    return c.json({ error: err.message }, 500)
  }

  return c.json({ results, query: q })
})
