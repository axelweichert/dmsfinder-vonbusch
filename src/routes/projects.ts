import { Hono } from 'hono'
import type { Env } from '../index'
import { createNotification } from './notifications'

export const projectsRouter = new Hono<{ Bindings: Env }>()

const COLS = ['open','in_progress','review','done']

// ── Alle Projekte ─────────────────────────────────────────────────────────────
projectsRouter.get('/count', async (c) => {
  const r = await c.env.DB.prepare("SELECT COUNT(*) as cnt FROM projects WHERE status!='deleted'").first<{cnt:number}>()
  return c.json({ count: r?.cnt || 0 })
})

projectsRouter.get('/', async (c) => {
  const companyId = c.req.query('company_id')
  const baseWhere = companyId ? `AND p.company_id = '${companyId}'` : ''
  const rows = await c.env.DB.prepare(`
    SELECT p.*, 
      co.name as company_name, 
      u.display_name as owner_name,
      (SELECT COUNT(*) FROM project_tasks WHERE project_id=p.id) as task_count,
      (SELECT COUNT(*) FROM project_tasks WHERE project_id=p.id AND column_id='done') as done_count
    FROM projects p
    LEFT JOIN companies co ON co.id=p.company_id
    LEFT JOIN users u ON u.id=p.owner_id
    WHERE p.status != 'deleted' ${baseWhere}
    ORDER BY p.created_at DESC
  `).all()
  return c.json({ projects: rows.results })
})

// ── Projekt erstellen ─────────────────────────────────────────────────────────
projectsRouter.post('/', async (c) => {
  const email = c.req.header('Cf-Access-Authenticated-User-Email') || ''
  const me = await c.env.DB.prepare('SELECT id FROM users WHERE LOWER(email)=?')
    .bind(email.toLowerCase()).first<{id:string}>()
  const b = await c.req.json() as any
  const id = 'prj-' + crypto.randomUUID().replace(/-/g,'').substring(0,12)
  const now = new Date().toISOString()
  await c.env.DB.prepare(`
    INSERT INTO projects (id,title,description,status,company_id,deal_id,owner_id,due_date,color,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `).bind(id, b.title, b.description||null, 'active', b.company_id||null, b.deal_id||null,
    me?.id||'', b.due_date||null, b.color||'#00C2FF', now, now).run()
  return c.json({ id, success: true })
})

// ── Einzelnes Projekt ─────────────────────────────────────────────────────────
projectsRouter.get('/:id', async (c) => {
  const proj = await c.env.DB.prepare(`
    SELECT p.*, co.name as company_name, u.display_name as owner_name
    FROM projects p
    LEFT JOIN companies co ON co.id=p.company_id
    LEFT JOIN users u ON u.id=p.owner_id
    WHERE p.id=?
  `).bind(c.req.param('id')).first()
  if (!proj) return c.json({error:'Nicht gefunden'}, 404)
  const tasks = await c.env.DB.prepare(`
    SELECT t.*, u.display_name as assignee_name
    FROM project_tasks t
    LEFT JOIN users u ON u.id=t.assigned_to
    WHERE t.project_id=?
    ORDER BY t.sort_order ASC, t.created_at ASC
  `).bind(c.req.param('id')).all()
  return c.json({ project: proj, tasks: tasks.results })
})

// ── Projekt aktualisieren ─────────────────────────────────────────────────────
projectsRouter.put('/:id', async (c) => {
  const b = await c.req.json() as any
  const now = new Date().toISOString()
  await c.env.DB.prepare(`
    UPDATE projects SET title=?,description=?,company_id=?,deal_id=?,due_date=?,color=?,status=?,updated_at=? WHERE id=?
  `).bind(b.title, b.description||null, b.company_id||null, b.deal_id||null,
    b.due_date||null, b.color||'#00C2FF', b.status||'active', now, c.req.param('id')).run()
  return c.json({ success: true })
})

// ── Projekt löschen ───────────────────────────────────────────────────────────
projectsRouter.delete('/:id', async (c) => {
  await c.env.DB.prepare(`UPDATE projects SET status='deleted' WHERE id=?`)
    .bind(c.req.param('id')).run()
  return c.json({ success: true })
})

// ── Task erstellen ────────────────────────────────────────────────────────────
projectsRouter.post('/:id/tasks', async (c) => {
  const email = c.req.header('Cf-Access-Authenticated-User-Email') || ''
  const me = await c.env.DB.prepare('SELECT id FROM users WHERE LOWER(email)=?')
    .bind(email.toLowerCase()).first<{id:string}>()
  const b = await c.req.json() as any
  const id = 'ptsk-' + crypto.randomUUID().replace(/-/g,'').substring(0,10)
  const now = new Date().toISOString()
  const col = COLS.includes(b.column_id) ? b.column_id : 'open'
  await c.env.DB.prepare(`
    INSERT INTO project_tasks (id,project_id,title,description,column_id,assigned_to,priority,due_date,sort_order,created_by,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(id, c.req.param('id'), b.title, b.description||null, col,
    b.assigned_to||null, b.priority||'normal', b.due_date||null, b.sort_order||0,
    me?.id||null, now, now).run()
  // Projektmitglieder benachrichtigen (ausser Ersteller)
  try {
    const projRow = await c.env.DB.prepare('SELECT title FROM projects WHERE id=?').bind(c.req.param('id')).first<{title:string}>()
    const members = await c.env.DB.prepare('SELECT user_id FROM project_members WHERE project_id=?').bind(c.req.param('id')).all()
    for (const m of (members.results as any[])) {
      if (m.user_id !== me?.id) {
        await createNotification(c.env.DB, m.user_id,
          '📌 Neue Aufgabe: ' + b.title,
          'Im Projekt "' + (projRow?.title||'') + '"',
          'project', c.req.param('id'), 'proj-detail:' + c.req.param('id'))
      }
    }
  } catch {}
  return c.json({ id, success: true })
})

// ── Task aktualisieren (inkl. Spalte) ─────────────────────────────────────────
projectsRouter.put('/:id/tasks/:tid', async (c) => {
  const b = await c.req.json() as any
  const now = new Date().toISOString()
  const col = COLS.includes(b.column_id) ? b.column_id : 'open'
  const oldTask = await c.env.DB.prepare('SELECT column_id FROM project_tasks WHERE id=?').bind(c.req.param('tid')).first<{column_id:string}>().catch(()=>null)
  await c.env.DB.prepare(`
    UPDATE project_tasks SET title=?,description=?,column_id=?,assigned_to=?,priority=?,due_date=?,sort_order=?,updated_at=?
    WHERE id=? AND project_id=?
  `).bind(b.title, b.description||null, col, b.assigned_to||null,
    b.priority||'normal', b.due_date||null, b.sort_order||0, now,
    c.req.param('tid'), c.req.param('id')).run()
  // Wenn Task auf "done" gesetzt: Projekt-Owner benachrichtigen
  if (col === 'done' && oldTask?.column_id !== 'done') {
    try {
      const proj = await c.env.DB.prepare('SELECT title, owner_id FROM projects WHERE id=?').bind(c.req.param('id')).first<{title:string,owner_id:string}>()
      if (proj?.owner_id) {
        await createNotification(c.env.DB, proj.owner_id,
          '✅ Aufgabe erledigt: ' + b.title,
          'Im Projekt "' + proj.title + '"',
          'project', c.req.param('id'), 'proj-detail:' + c.req.param('id'))
      }
    } catch {}
  }
  return c.json({ success: true })
})

// ── Task löschen ─────────────────────────────────────────────────────────────
projectsRouter.delete('/:id/tasks/:tid', async (c) => {
  await c.env.DB.prepare(`DELETE FROM project_tasks WHERE id=? AND project_id=?`)
    .bind(c.req.param('tid'), c.req.param('id')).run()
  return c.json({ success: true })
})

// ── Mitglieder ────────────────────────────────────────────────────────────────
projectsRouter.get('/:id/members', async (c) => {
  const rows = await c.env.DB.prepare(`
    SELECT pm.*, u.display_name, u.email, u.role as user_role
    FROM project_members pm
    JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = ?
    ORDER BY pm.role DESC, u.display_name ASC
  `).bind(c.req.param('id')).all()
  return c.json({ members: rows.results })
})

projectsRouter.post('/:id/members', async (c) => {
  const { user_id, role = 'member' } = await c.req.json() as any
  const id = 'pmem-' + crypto.randomUUID().replace(/-/g,'').substring(0,10)
  await c.env.DB.prepare(
    'INSERT OR IGNORE INTO project_members (id,project_id,user_id,role,created_at) VALUES (?,?,?,?,?)'
  ).bind(id, c.req.param('id'), user_id, role, new Date().toISOString()).run()
  // Neues Mitglied benachrichtigen
  try {
    const proj = await c.env.DB.prepare('SELECT title FROM projects WHERE id=?').bind(c.req.param('id')).first<{title:string}>()
    await createNotification(c.env.DB, user_id,
      '👥 Du wurdest zu einem Projekt eingeladen',
      'Projekt: "' + (proj?.title||'') + '"',
      'project', c.req.param('id'), 'proj-detail:' + c.req.param('id'))
  } catch {}
  return c.json({ success: true })
})

projectsRouter.delete('/:id/members/:uid', async (c) => {
  await c.env.DB.prepare(
    'DELETE FROM project_members WHERE project_id=? AND user_id=?'
  ).bind(c.req.param('id'), c.req.param('uid')).run()
  return c.json({ success: true })
})
