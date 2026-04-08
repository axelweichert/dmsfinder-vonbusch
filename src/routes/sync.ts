import { Hono } from 'hono'
import type { Env } from '../index'

export const syncRouter = new Hono<{ Bindings: Env }>()

syncRouter.get('/status', async (c) => {
  const { results } = await c.env.DB.prepare(`SELECT * FROM sync_log ORDER BY synced_at DESC LIMIT 20`).all()
  return c.json({ data: results })
})

syncRouter.post('/trigger', async (c) => {
  const now = new Date().toISOString()
  await c.env.DB.prepare(
    `INSERT INTO sync_log (id,entity_type,direction,status,records_processed,started_at,synced_at) VALUES (?,?,?,?,?,?,?)`
  ).bind(crypto.randomUUID(),'all','justin_to_crm','triggered',0,now,now).run()
  return c.json({ status: 'triggered', timestamp: now })
})

// Empfängt Daten vom Just.in Bridge Worker (via Cloudflared Tunnel)
syncRouter.post('/ingest', async (c) => {
  const { entity_type, records } = await c.req.json()
  const now = new Date().toISOString()
  let processed = 0

  if (entity_type === 'companies') {
    for (const r of records) {
      const ex = await c.env.DB.prepare('SELECT id FROM companies WHERE erp_id = ?').bind(r.erp_id).first()
      if (ex) {
        await c.env.DB.prepare(`UPDATE companies SET name=?,phone=?,email=?,street=?,zip=?,city=?,updated_at=? WHERE erp_id=?`)
          .bind(r.name,r.phone||'',r.email||'',r.street||'',r.zip||'',r.city||'',now,r.erp_id).run()
      } else {
        await c.env.DB.prepare(`INSERT INTO companies (id,name,status,erp_id,phone,email,street,zip,city,country,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
          .bind(crypto.randomUUID(),r.name,'customer',r.erp_id,r.phone||'',r.email||'',r.street||'',r.zip||'',r.city||'','DE',now,now).run()
      }
      processed++
    }
  }

  if (entity_type === 'tickets') {
    for (const r of records) {
      const ex = await c.env.DB.prepare('SELECT id FROM tickets WHERE erp_service_id = ?').bind(r.erp_service_id).first<{id:string}>()
      const co = await c.env.DB.prepare('SELECT id FROM companies WHERE erp_id = ?').bind(r.company_erp_id).first<{id:string}>()
      if (ex) {
        await c.env.DB.prepare(`UPDATE tickets SET status=?,priority=?,updated_at=? WHERE erp_service_id=?`)
          .bind(r.status,r.priority,now,r.erp_service_id).run()
      } else if (co) {
        await c.env.DB.prepare(`INSERT INTO tickets (id,ticket_number,subject,company_id,priority,status,erp_service_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`)
          .bind(crypto.randomUUID(),r.ticket_number||'ERP-'+r.erp_service_id,r.subject,co.id,r.priority||'medium',r.status||'open',r.erp_service_id,now,now).run()
      }
      processed++
    }
  }

  await c.env.DB.prepare(
    `INSERT INTO sync_log (id,entity_type,direction,status,records_processed,started_at,synced_at) VALUES (?,?,?,?,?,?,?)`
  ).bind(crypto.randomUUID(),entity_type,'justin_to_crm','success',processed,now,now).run()
  return c.json({ status: 'ok', processed })
})
