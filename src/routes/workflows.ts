import { Hono } from 'hono'

const workflowsRouter = new Hono<{ Bindings: { DB: D1Database } }>()

// ── WORKFLOW LISTE ────────────────────────────────────────────────────────────

workflowsRouter.get('/', async (c) => {
  const r = await c.env.DB.prepare(
    'SELECT w.*, (SELECT COUNT(*) FROM workflow_logs l WHERE l.workflow_id=w.id) as log_count FROM workflows w ORDER BY active DESC, updated_at DESC'
  ).all()
  return c.json(r.results)
})

// ── WORKFLOW ANLEGEN ──────────────────────────────────────────────────────────

workflowsRouter.post('/', async (c) => {
  const b = await c.req.json() as any
  const now = new Date().toISOString()
  const id = 'wf-' + crypto.randomUUID().split('-')[0]
  await c.env.DB.prepare(
    `INSERT INTO workflows (id,name,description,active,trigger_type,trigger_config,steps,created_by,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  ).bind(id, b.name, b.description||null, b.active!==false?1:0,
    b.trigger_type, JSON.stringify(b.trigger_config||{}),
    JSON.stringify(b.steps||[]), b.created_by||null, now, now).run()
  return c.json({ id, success: true })
})

// ── WORKFLOW DETAIL ───────────────────────────────────────────────────────────

workflowsRouter.get('/:id', async (c) => {
  const w = await c.env.DB.prepare('SELECT * FROM workflows WHERE id=?').bind(c.req.param('id')).first() as any
  if (!w) return c.json({ error: 'Nicht gefunden' }, 404)
  return c.json({ ...w, trigger_config: JSON.parse(w.trigger_config||'{}'), steps: JSON.parse(w.steps||'[]') })
})

// ── WORKFLOW BEARBEITEN ───────────────────────────────────────────────────────

workflowsRouter.patch('/:id', async (c) => {
  const b = await c.req.json() as any
  const now = new Date().toISOString()
  const allowed = ['name','description','active','trigger_type']
  const filtered: Record<string, any> = Object.fromEntries(Object.entries(b).filter(([k]) => allowed.includes(k)))
  if (b.trigger_config !== undefined) filtered['trigger_config'] = JSON.stringify(b.trigger_config)
  if (b.steps !== undefined) filtered['steps'] = JSON.stringify(b.steps)
  if (!Object.keys(filtered).length) return c.json({ success: true })
  const fields = Object.keys(filtered).map(k => `${k} = ?`).join(', ')
  await c.env.DB.prepare(`UPDATE workflows SET ${fields}, updated_at = ? WHERE id = ?`)
    .bind(...Object.values(filtered), now, c.req.param('id')).run()
  return c.json({ success: true })
})

// ── WORKFLOW LÖSCHEN ──────────────────────────────────────────────────────────

workflowsRouter.delete('/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM workflows WHERE id=?').bind(c.req.param('id')).run()
  return c.json({ success: true })
})

// ── LOG LADEN ─────────────────────────────────────────────────────────────────

workflowsRouter.get('/:id/logs', async (c) => {
  const r = await c.env.DB.prepare(
    'SELECT * FROM workflow_logs WHERE workflow_id=? ORDER BY created_at DESC LIMIT 100'
  ).bind(c.req.param('id')).all()
  return c.json(r.results)
})

// ── MANUELL AUSFÜHREN ─────────────────────────────────────────────────────────

workflowsRouter.post('/:id/run', async (c) => {
  const { entity_ids = [], entity_type = 'contacts' } = await c.req.json() as any
  const wf = await c.env.DB.prepare('SELECT * FROM workflows WHERE id=?').bind(c.req.param('id')).first() as any
  if (!wf) return c.json({ error: 'Workflow nicht gefunden' }, 404)

  const steps = JSON.parse(wf.steps||'[]')
  let succeeded = 0, failed = 0

  for (const entityId of entity_ids) {
    try {
      const stepsDone = await executeSteps(c.env.DB, steps, entity_type, entityId)
      const now = new Date().toISOString()
      await c.env.DB.prepare(
        `INSERT INTO workflow_logs (id,workflow_id,entity_type,entity_id,status,steps_done,created_at)
         VALUES (?,?,?,?,?,?,?)`
      ).bind(crypto.randomUUID(), wf.id, entity_type, entityId, 'success', JSON.stringify(stepsDone), now).run()
      succeeded++
    } catch(e: any) {
      const now = new Date().toISOString()
      await c.env.DB.prepare(
        `INSERT INTO workflow_logs (id,workflow_id,entity_type,entity_id,status,error,created_at)
         VALUES (?,?,?,?,?,?,?)`
      ).bind(crypto.randomUUID(), wf.id, entity_type, entityId, 'failed', e.message, now).run()
      failed++
    }
  }

  // Run count + last_run_at aktualisieren
  await c.env.DB.prepare('UPDATE workflows SET run_count=run_count+?, last_run_at=?, updated_at=? WHERE id=?')
    .bind(succeeded, new Date().toISOString(), new Date().toISOString(), wf.id).run()

  return c.json({ success: true, succeeded, failed })
})

// ── KERN: SCHRITTE AUSFÜHREN ──────────────────────────────────────────────────

async function executeSteps(db: D1Database, steps: any[], entityType: string, entityId: string): Promise<string[]> {
  const done: string[] = []
  const now = new Date().toISOString()

  // Entity laden für Kontext
  let companyId: string | null = null
  let ownerId: string | null = null
  let entityName = entityId

  if (entityType === 'contacts') {
    const ct = await db.prepare('SELECT company_id, first_name, last_name FROM contacts WHERE id=?').bind(entityId).first() as any
    companyId = ct?.company_id || null
    entityName = ct ? `${ct.first_name} ${ct.last_name}` : entityId
  } else if (entityType === 'companies') {
    const co = await db.prepare('SELECT id, name, account_manager_id FROM companies WHERE id=?').bind(entityId).first() as any
    companyId = entityId
    ownerId = co?.account_manager_id || null
    entityName = co?.name || entityId
  } else if (entityType === 'deals') {
    const dl = await db.prepare('SELECT company_id, title, owner_id FROM deals WHERE id=?').bind(entityId).first() as any
    companyId = dl?.company_id || null
    ownerId = dl?.owner_id || null
    entityName = dl?.title || entityId
  }

  for (const step of steps) {
    const { action, config, delay_days = 0 } = step

    // Fälligkeitsdatum berechnen
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + (delay_days || 0) + (config.due_days || 0))
    const dueDateStr = dueDate.toISOString()

    if (action === 'create_activity') {
      const actId = crypto.randomUUID()
      await db.prepare(
        `INSERT INTO activities (id,subject,type,body,status,prio,due_at,company_id,linked_type,linked_id,owner_id,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(
        actId, config.subject || 'Automatische Aufgabe',
        config.type || 'Wiedervorlage',
        (config.body || '') + `\n\n[Automatisch erstellt durch Workflow]`,
        'open', config.prio || 'Mittel',
        dueDateStr, companyId || null,
        entityType === 'contacts' ? 'contact' : entityType === 'deals' ? 'deal' : 'company',
        entityId, ownerId || null, now, now
      ).run()
      done.push(`✓ Aktivität "${config.subject}" angelegt (fällig: ${dueDate.toLocaleDateString('de-DE')})`)

    } else if (action === 'set_deal_stage' && entityType === 'deals') {
      await db.prepare('UPDATE deals SET stage=?, updated_at=? WHERE id=?').bind(config.stage, now, entityId).run()
      done.push(`✓ Deal-Stage → ${config.stage}`)

    } else if (action === 'assign_user') {
      const field = entityType === 'contacts' ? 'account_manager_id' : 'account_manager_id'
      await db.prepare(`UPDATE ${entityType === 'contacts' ? 'contacts' : entityType === 'deals' ? 'deals' : 'companies'} SET ${field}=?, updated_at=? WHERE id=?`)
        .bind(config.user_id, now, entityId).run()
      done.push(`✓ Zuständiger gesetzt: ${config.user_id}`)

    } else if (action === 'add_tag' && entityType === 'contacts') {
      const ct = await db.prepare('SELECT interests FROM contacts WHERE id=?').bind(entityId).first() as any
      const ints = JSON.parse(ct?.interests||'[]')
      if (!ints.includes(config.tag)) ints.push(config.tag)
      await db.prepare('UPDATE contacts SET interests=?, updated_at=? WHERE id=?').bind(JSON.stringify(ints), now, entityId).run()
      done.push(`✓ Tag hinzugefügt: ${config.tag}`)
    }
  }
  return done
}

// ── CRON-CHECK: zeitbasierte Trigger ─────────────────────────────────────────

export async function runWorkflowCron(db: D1Database): Promise<void> {
  const activeWfs = await db.prepare("SELECT * FROM workflows WHERE active=1 AND trigger_type='no_activity_days'").all()

  for (const wf of activeWfs.results as any[]) {
    const config = JSON.parse(wf.trigger_config||'{}')
    const days = config.days || 30
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const cutoffStr = cutoff.toISOString()

    // Firmen finden die seit X Tagen kein Kontakt hatten und noch kein Workflow heute
    const companies = await db.prepare(`
      SELECT DISTINCT co.id, co.name FROM companies co
      WHERE (
        SELECT MAX(a.created_at) FROM activities a WHERE a.company_id = co.id
      ) < ? OR (
        SELECT COUNT(*) FROM activities a WHERE a.company_id = co.id
      ) = 0
      AND NOT EXISTS (
        SELECT 1 FROM workflow_logs l
        WHERE l.workflow_id = ? AND l.entity_id = co.id
        AND l.created_at > date('now', '-1 days')
      )
      LIMIT 50
    `).bind(cutoffStr, wf.id).all()

    const steps = JSON.parse(wf.steps||'[]')
    const now = new Date().toISOString()
    for (const co of companies.results as any[]) {
      try {
        const stepsDone = await executeSteps(db, steps, 'companies', co.id)
        await db.prepare(
          `INSERT INTO workflow_logs (id,workflow_id,entity_type,entity_id,entity_name,status,steps_done,created_at)
           VALUES (?,?,?,?,?,?,?,?)`
        ).bind(crypto.randomUUID(), wf.id, 'companies', co.id, co.name, 'success', JSON.stringify(stepsDone), now).run()
      } catch(_) {}
    }

    if (companies.results.length > 0) {
      await db.prepare('UPDATE workflows SET run_count=run_count+?, last_run_at=?, updated_at=? WHERE id=?')
        .bind(companies.results.length, now, now, wf.id).run()
    }
  }
}

// Deal-Stage Trigger: wird aus deals.ts aufgerufen
export async function triggerDealStageWorkflows(db: D1Database, dealId: string, newStage: string): Promise<void> {
  const wfs = await db.prepare(
    "SELECT * FROM workflows WHERE active=1 AND trigger_type='deal_stage_change'"
  ).all()
  const now = new Date().toISOString()

  for (const wf of wfs.results as any[]) {
    const config = JSON.parse((wf as any).trigger_config||'{}')
    if (config.to_stage && config.to_stage !== newStage) continue
    const steps = JSON.parse((wf as any).steps||'[]')
    try {
      const stepsDone = await executeSteps(db, steps, 'deals', dealId)
      await db.prepare(
        `INSERT INTO workflow_logs (id,workflow_id,entity_type,entity_id,status,steps_done,created_at)
         VALUES (?,?,?,?,?,?,?)`
      ).bind(crypto.randomUUID(), (wf as any).id, 'deals', dealId, 'success', JSON.stringify(stepsDone), now).run()
      await db.prepare('UPDATE workflows SET run_count=run_count+1, last_run_at=?, updated_at=? WHERE id=?')
        .bind(now, now, (wf as any).id).run()
    } catch(_) {}
  }
}

export { workflowsRouter }
