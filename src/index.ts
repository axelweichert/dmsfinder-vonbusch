import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { companiesRouter } from './routes/companies'
import { contactsRouter } from './routes/contacts'
import { dealsRouter } from './routes/deals'
import { activitiesRouter } from './routes/activities'
import { ticketsRouter } from './routes/tickets'
import { contractsRouter } from './routes/contracts'
import { documentsRouter } from './routes/documents'
import { syncRouter } from './routes/sync'
import { usersRouter } from './routes/users'
import { setupRouter } from './routes/setup'
import { salesviewerRouter } from './routes/salesviewer'
import { calendarRouter } from './routes/calendar'
import { mailRouter } from './routes/mail'
import { searchRouter } from './routes/search'
import { marketingRouter } from './routes/marketing'
import { webinarsRouter } from './routes/webinars'
import { eventsRouter } from './routes/events'
import { selectionsRouter } from './routes/selections'
import { proposalsRouter } from './routes/proposals'
import { productsRouter }  from './routes/products'
import { workflowsRouter, runWorkflowCron, triggerDealStageWorkflows } from './routes/workflows'
import { reportsRouter } from './routes/reports'
import { sossRouter }    from './routes/soss'
import { tasksRouter }   from './routes/tasks'
import { erpRouter }     from './routes/erp'
import { quotasRouter }    from './routes/quotas'
import { templatesRouter } from './routes/templates'
import relationshipsRouter from './routes/relationships'
import customFieldsRouter from './routes/custom_fields'
import competitiveRouter from './routes/competitive'
import { projectsRouter } from './routes/projects'
import { notificationsRouter } from './routes/notifications'
import { justinQueueRouter } from './routes/justin_queue'
import { timeEntriesRouter } from './routes/time_entries'
import { emailHandler } from './email-handler'

export type Env = {
  DB: D1Database
  DB_STAGING: D1Database
  DB_TEST: D1Database
  ANTHROPIC_API_KEY: string
  OPENAI_API_KEY: string
  STORAGE: R2Bucket
  ARCHIVE: R2Bucket
  ASSETS: Fetcher
  APP_URL: string
  MS_CLIENT_ID: string
  MS_TENANT_ID: string
  MS_CLIENT_SECRET: string
  MS_CLIENT_SECRET_2: string
  CF_ACCOUNT_ID: string
  CF_BR_TOKEN: string
  WEBHOOK_SECRET: string
  CF_API_TOKEN: string
}


// ── Multi-Environment DB ─────────────────────────────────────────────────────
const SCHEMA_SQL: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  azure_oid TEXT,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'sales',
  team TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT
)`,
  `CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'prospect',
  bereich TEXT,
  street TEXT, zip TEXT, city TEXT, country TEXT DEFAULT 'DE',
  phone TEXT, email TEXT, website TEXT, notes TEXT,
  account_manager_id TEXT REFERENCES users(id),
  erp_id TEXT UNIQUE,
  ai_summary TEXT,
  ai_summary_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
)`,
  `CREATE INDEX IF NOT EXISTS idx_co_status  ON companies(status)`,
  `CREATE INDEX IF NOT EXISTS idx_co_bereich ON companies(bereich)`,
  `CREATE INDEX IF NOT EXISTS idx_co_erp     ON companies(erp_id)`,
  `CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT, email_private TEXT,
  phone TEXT, mobile TEXT,
  position TEXT, department TEXT,
  is_decision_maker INTEGER DEFAULT 0,
  birthday TEXT,
  street TEXT, zip TEXT, city TEXT,
  status TEXT NOT NULL DEFAULT 'prospect',
  account_manager_id TEXT REFERENCES users(id),
  source TEXT DEFAULT 'manual',
  notes TEXT,
  interests TEXT,
  marketing_email INTEGER DEFAULT 0,
  marketing_events INTEGER DEFAULT 0,
  marketing_phone INTEGER DEFAULT 0,
  marketing_post INTEGER DEFAULT 0,
  marketing_global_optin INTEGER DEFAULT 0,
  marketing_optin_date TEXT,
  marketing_optout_date TEXT,
  erp_id TEXT UNIQUE,
  ai_summary TEXT,
  ai_summary_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
)`,
  `CREATE INDEX IF NOT EXISTS idx_ct_company ON contacts(company_id)`,
  `CREATE INDEX IF NOT EXISTS idx_ct_status  ON contacts(status)`,
  `CREATE INDEX IF NOT EXISTS idx_ct_optin   ON contacts(marketing_global_optin)`,
  `CREATE INDEX IF NOT EXISTS idx_ct_erp     ON contacts(erp_id)`,
  `CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  company_id TEXT NOT NULL REFERENCES companies(id),
  contact_id TEXT REFERENCES contacts(id),
  owner_id TEXT NOT NULL REFERENCES users(id),
  bereich TEXT,
  stage TEXT NOT NULL DEFAULT 'lead',
  value REAL DEFAULT 0,
  probability INTEGER DEFAULT 10,
  expected_close TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  notes TEXT,
  erp_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
)`,
  `CREATE INDEX IF NOT EXISTS idx_dl_stage   ON deals(stage)`,
  `CREATE INDEX IF NOT EXISTS idx_dl_company ON deals(company_id)`,
  `CREATE INDEX IF NOT EXISTS idx_dl_owner   ON deals(owner_id)`,
  `CREATE INDEX IF NOT EXISTS idx_dl_status  ON deals(status)`,
  `CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT,
  linked_type TEXT,
  linked_id TEXT,
  contact_id TEXT REFERENCES contacts(id),
  company_id TEXT REFERENCES companies(id),
  deal_id TEXT REFERENCES deals(id),
  owner_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'open',
  due_at TEXT,
  done_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
)`,
  `CREATE INDEX IF NOT EXISTS idx_ak_linked ON activities(linked_type, linked_id)`,
  `CREATE INDEX IF NOT EXISTS idx_ak_owner  ON activities(owner_id)`,
  `CREATE INDEX IF NOT EXISTS idx_ak_status ON activities(status)`,
  `CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  description TEXT,
  company_id TEXT NOT NULL REFERENCES companies(id),
  contact_id TEXT REFERENCES contacts(id),
  assigned_to TEXT REFERENCES users(id),
  bereich TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  erp_service_id TEXT UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  resolved_at TEXT
)`,
  `CREATE INDEX IF NOT EXISTS idx_tk_status   ON tickets(status)`,
  `CREATE INDEX IF NOT EXISTS idx_tk_priority ON tickets(priority)`,
  `CREATE INDEX IF NOT EXISTS idx_tk_company  ON tickets(company_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tk_erp      ON tickets(erp_service_id)`,
  `CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  contract_number TEXT NOT NULL UNIQUE,
  company_id TEXT NOT NULL REFERENCES companies(id),
  product TEXT NOT NULL,
  bereich TEXT NOT NULL,
  contract_type TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  auto_renew INTEGER DEFAULT 0,
  renew_months INTEGER DEFAULT 12,
  monthly_value REAL NOT NULL DEFAULT 0,
  sla_type TEXT,
  sla_status TEXT NOT NULL DEFAULT 'ok',
  status TEXT NOT NULL DEFAULT 'active',
  owner_id TEXT REFERENCES users(id),
  notes TEXT,
  erp_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
)`,
  `CREATE INDEX IF NOT EXISTS idx_sv_company  ON contracts(company_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sv_status   ON contracts(status)`,
  `CREATE INDEX IF NOT EXISTS idx_sv_bereich  ON contracts(bereich)`,
  `CREATE INDEX IF NOT EXISTS idx_sv_end_date ON contracts(end_date)`,
  `CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  r2_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  mime_type TEXT,
  size INTEGER,
  linked_type TEXT,
  linked_id TEXT,
  uploaded_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL
)`,
  `CREATE INDEX IF NOT EXISTS idx_doc_linked ON documents(linked_type, linked_id)`,
  `CREATE TABLE IF NOT EXISTS sync_log (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  erp_id TEXT,
  crm_id TEXT,
  direction TEXT NOT NULL DEFAULT 'justin_to_crm',
  status TEXT NOT NULL DEFAULT 'success',
  records_processed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TEXT,
  synced_at TEXT NOT NULL
)`,
  `CREATE INDEX IF NOT EXISTS idx_sync_entity ON sync_log(entity_type)`,
  `CREATE INDEX IF NOT EXISTS idx_sync_synced ON sync_log(synced_at)`,
  `CREATE TABLE IF NOT EXISTS ms_tokens (
  email TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS mail_subscriptions (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  subscription_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS documents (
  
  id            TEXT PRIMARY KEY,
  version       INTEGER NOT NULL DEFAULT 1,
  parent_id     TEXT REFERENCES documents(id),  

  
  r2_key        TEXT NOT NULL UNIQUE,
  r2_key_text   TEXT,                           
  name          TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type     TEXT,
  size          INTEGER,
  checksum      TEXT,                           

  
  doc_type      TEXT,    
  doc_date      TEXT,    
  subject       TEXT,    
  summary       TEXT,    
  fulltext_idx  TEXT,    
  tags          TEXT,    
  language      TEXT DEFAULT 'de',

  
  company_id    TEXT REFERENCES companies(id),
  contact_id    TEXT REFERENCES contacts(id),
  deal_id       TEXT REFERENCES deals(id),
  linked_type   TEXT,
  linked_id     TEXT,

  
  uploaded_by   TEXT REFERENCES users(id),
  is_archived   INTEGER NOT NULL DEFAULT 0,
  archived_at   TEXT,
  archived_by   TEXT REFERENCES users(id),
  archive_reason TEXT,

  
  created_at    TEXT NOT NULL,
  updated_at    TEXT
)`,
  `CREATE INDEX IF NOT EXISTS idx_doc_company    ON documents(company_id)`,
  `CREATE INDEX IF NOT EXISTS idx_doc_type       ON documents(doc_type)`,
  `CREATE INDEX IF NOT EXISTS idx_doc_date       ON documents(doc_date)`,
  `CREATE INDEX IF NOT EXISTS idx_doc_parent     ON documents(parent_id)`,
  `CREATE INDEX IF NOT EXISTS idx_doc_archived   ON documents(is_archived)`,
  `CREATE INDEX IF NOT EXISTS idx_doc_linked     ON documents(linked_type, linked_id)`,
  `CREATE TABLE IF NOT EXISTS activity_attendees (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notified_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(activity_id, user_id)
)`,
  `CREATE INDEX IF NOT EXISTS idx_att_activity ON activity_attendees(activity_id)`,
  `CREATE INDEX IF NOT EXISTS idx_att_user     ON activity_attendees(user_id)`,
  `CREATE TABLE IF NOT EXISTS targets (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'team',        
  ref_id TEXT NOT NULL,                      
  period_type TEXT NOT NULL DEFAULT 'year',  
  period_year INTEGER NOT NULL,
  period_quarter INTEGER,                    
  revenue_target REAL DEFAULT 0,             
  margin_target REAL DEFAULT 0,              
  margin_percent_target REAL DEFAULT 0,      
  created_at TEXT NOT NULL,
  updated_at TEXT
)`,
  `CREATE INDEX IF NOT EXISTS idx_targets_ref ON targets(type, ref_id)`,
  `CREATE INDEX IF NOT EXISTS idx_targets_period ON targets(period_year, period_quarter)`,
  `CREATE TABLE IF NOT EXISTS contact_marketing_tags (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  action TEXT NOT NULL,
  year INTEGER,
  status TEXT NOT NULL DEFAULT 'opted_in',
  sent_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`,
  `CREATE INDEX IF NOT EXISTS idx_mkt_contact ON contact_marketing_tags(contact_id)`,
  `CREATE INDEX IF NOT EXISTS idx_mkt_action ON contact_marketing_tags(action, year)`,
  `CREATE TABLE IF NOT EXISTS webinars (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  topic TEXT,
  teaser TEXT,
  description TEXT,
  scheduled_at TEXT,
  duration_min INTEGER DEFAULT 60,
  status TEXT DEFAULT 'planned',
  host_user_id TEXT,
  registration_url TEXT,
  recording_url TEXT,
  gotowebinar_id TEXT,
  max_participants INTEGER,
  email_subject TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS webinar_contacts (
  id TEXT PRIMARY KEY,
  webinar_id TEXT NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
  contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  company_id TEXT,
  status TEXT DEFAULT 'invited',
  invited_at TEXT,
  registered_at TEXT,
  attended_at TEXT,
  email TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(webinar_id, contact_id)
)`,
  `CREATE TABLE IF NOT EXISTS selections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  entity_type TEXT NOT NULL DEFAULT 'contacts',
  filters TEXT NOT NULL DEFAULT '[]',
  result_count INTEGER DEFAULT 0,
  last_run_at TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  active INTEGER DEFAULT 1,
  trigger_type TEXT NOT NULL,
  trigger_config TEXT DEFAULT '{}',
  steps TEXT NOT NULL DEFAULT '[]',
  run_count INTEGER DEFAULT 0,
  last_run_at TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS workflow_logs (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  entity_type TEXT,
  entity_id TEXT,
  entity_name TEXT,
  status TEXT DEFAULT 'success',
  steps_done TEXT DEFAULT '[]',
  error TEXT,
  created_at TEXT NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS products (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT NOT NULL DEFAULT 'Sonstiges',
  unit        TEXT NOT NULL DEFAULT 'pauschal',
  price       REAL NOT NULL DEFAULT 0,
  vat_rate    INTEGER NOT NULL DEFAULT 19,
  is_active   INTEGER NOT NULL DEFAULT 1,
  sku         TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS tasks (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT,          
  created_by  TEXT,          
  related_type TEXT,         
  related_id  TEXT,
  related_name TEXT,         
  priority    TEXT DEFAULT 'normal',  
  status      TEXT DEFAULT 'open',    
  due_date    TEXT,
  created_at  TEXT,
  updated_at  TEXT
)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_status   ON tasks(status)`,
  `CREATE TABLE IF NOT EXISTS erp_config (
  id          TEXT PRIMARY KEY DEFAULT 'default',
  tunnel_url  TEXT,              
  sql_server  TEXT,              
  sql_port    INTEGER DEFAULT 1433,
  sql_db      TEXT,              
  sql_user    TEXT,
  sql_pass    TEXT,              
  sync_customers  INTEGER DEFAULT 1,
  sync_contacts   INTEGER DEFAULT 1,
  sync_employees  INTEGER DEFAULT 1,
  sync_orders     INTEGER DEFAULT 1,
  sync_products   INTEGER DEFAULT 0,
  last_sync   TEXT,
  last_sync_status TEXT,
  created_at  TEXT,
  updated_at  TEXT
)`,
  `CREATE INDEX IF NOT EXISTS idx_deals_won_at ON deals(stage, won_at)`,
  `CREATE INDEX IF NOT EXISTS idx_deals_owner_stage ON deals(owner_id, stage)`,
  `CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'allgemein',  
  subject TEXT,
  body TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
)`,
  `CREATE INDEX IF NOT EXISTS idx_templates_type ON templates(type)`,
  `CREATE TABLE IF NOT EXISTS relationships (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  rel_type TEXT NOT NULL DEFAULT 'knows',
  note TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT
)`,
  `CREATE INDEX IF NOT EXISTS idx_rel_source ON relationships(source_type, source_id)`,
  `CREATE INDEX IF NOT EXISTS idx_rel_target ON relationships(target_type, target_id)`,
  `CREATE TABLE IF NOT EXISTS competitors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  segment TEXT,
  website TEXT,
  notes TEXT,
  created_at TEXT NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS deal_competitors (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL,
  competitor_id TEXT NOT NULL,
  outcome TEXT DEFAULT 'unknown',
  notes TEXT,
  created_at TEXT NOT NULL
)`,
  `CREATE INDEX IF NOT EXISTS idx_dc_deal ON deal_competitors(deal_id)`,
  `CREATE INDEX IF NOT EXISTS idx_dc_comp ON deal_competitors(competitor_id)`,
  `CREATE TABLE IF NOT EXISTS custom_field_defs (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_key TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  options TEXT,
  required INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS custom_field_values (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  field_id TEXT NOT NULL,
  value TEXT,
  updated_at TEXT NOT NULL
)`,
  `CREATE INDEX IF NOT EXISTS idx_cfv_entity ON custom_field_values(entity_type, entity_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_cfv_unique ON custom_field_values(entity_id, field_id)`,
]

function getDB(c: any): D1Database {
  const env = c.req.header('X-CRM-Env') || 'production'
  if (env === 'staging' && c.env.DB_STAGING) return c.env.DB_STAGING
  if (env === 'test' && c.env.DB_TEST) return c.env.DB_TEST
  return c.env.DB
}

const app = new Hono<{ Bindings: Env }>()

app.use('*', logger())

app.use('/api/*', async (c, next) => {
  const userEmail =
    c.req.header('Cf-Access-Authenticated-User-Email') ||
    c.req.header('X-Dev-Email') ||
    'anonymous@vonbusch.digital'
  c.set('userEmail' as any, userEmail)
  return next()
})

// ── Environment DB Middleware ─────────────────────────────────────────────────
app.use('/api/*', async (c, next) => {
  const envHeader = c.req.header('X-CRM-Env')
  if (envHeader && envHeader !== 'production') {
    const email = c.req.header('Cf-Access-Authenticated-User-Email') || ''
    const db = c.env.DB
    const user = await db.prepare('SELECT role FROM users WHERE LOWER(email)=? LIMIT 1')
      .bind(email.toLowerCase()).first<{role:string}>().catch(()=>null)
    const isAdmin = user?.role === 'admin' || user?.role === 'gf'
    if (isAdmin) {
      if (envHeader === 'staging' && c.env.DB_STAGING) (c.env as any).DB = c.env.DB_STAGING
      else if (envHeader === 'test' && c.env.DB_TEST) (c.env as any).DB = c.env.DB_TEST
    }
  }
  return next()
})


// ─── Auto-Setup: Schema anlegen falls Tabellen fehlen ───
app.use('/api/*', async (c, next) => {
  try {
    // Prüfe ob users Tabelle existiert
    await c.env.DB.prepare('SELECT COUNT(*) FROM users').first()
  } catch {
    // Tabelle fehlt → Schema anlegen
    await c.env.DB.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, azure_oid TEXT,
        display_name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'sales',
        team TEXT, active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL, updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'prospect',
        bereich TEXT, street TEXT, zip TEXT, city TEXT, country TEXT DEFAULT 'DE',
        phone TEXT, email TEXT, website TEXT, notes TEXT,
        account_manager_id TEXT REFERENCES users(id),
        ai_summary TEXT, ai_summary_at TEXT,
        erp_id TEXT UNIQUE, created_at TEXT NOT NULL, updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        first_name TEXT NOT NULL, last_name TEXT NOT NULL,
        email TEXT, email_private TEXT, phone TEXT, mobile TEXT,
        position TEXT, department TEXT, is_decision_maker INTEGER DEFAULT 0,
        birthday TEXT, street TEXT, zip TEXT, city TEXT,
        status TEXT NOT NULL DEFAULT 'prospect',
        account_manager_id TEXT REFERENCES users(id),
        source TEXT DEFAULT 'manual', notes TEXT, interests TEXT,
        marketing_email INTEGER DEFAULT 0, marketing_events INTEGER DEFAULT 0,
        marketing_phone INTEGER DEFAULT 0, marketing_post INTEGER DEFAULT 0,
        marketing_global_optin INTEGER DEFAULT 0,
        marketing_optin_date TEXT, marketing_optout_date TEXT,
        erp_id TEXT UNIQUE, created_at TEXT NOT NULL, updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS deals (
        id TEXT PRIMARY KEY, title TEXT NOT NULL,
        company_id TEXT NOT NULL REFERENCES companies(id),
        contact_id TEXT REFERENCES contacts(id),
        owner_id TEXT NOT NULL REFERENCES users(id),
        bereich TEXT, stage TEXT NOT NULL DEFAULT 'lead',
        value REAL DEFAULT 0, probability INTEGER DEFAULT 10,
        expected_close TEXT, status TEXT NOT NULL DEFAULT 'open',
        notes TEXT, erp_id TEXT, created_at TEXT NOT NULL, updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY, type TEXT NOT NULL, subject TEXT NOT NULL, body TEXT,
        linked_type TEXT, linked_id TEXT,
        contact_id TEXT REFERENCES contacts(id),
        company_id TEXT REFERENCES companies(id),
        deal_id TEXT REFERENCES deals(id),
        owner_id TEXT NOT NULL REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'open',
        due_at TEXT, done_at TEXT, created_at TEXT NOT NULL, updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY, ticket_number TEXT NOT NULL UNIQUE,
        subject TEXT NOT NULL, description TEXT,
        company_id TEXT NOT NULL REFERENCES companies(id),
        contact_id TEXT REFERENCES contacts(id),
        assigned_to TEXT REFERENCES users(id),
        bereich TEXT, priority TEXT NOT NULL DEFAULT 'medium',
        status TEXT NOT NULL DEFAULT 'open',
        erp_service_id TEXT UNIQUE, created_at TEXT NOT NULL,
        updated_at TEXT, resolved_at TEXT
      );
      CREATE TABLE IF NOT EXISTS contracts (
        id TEXT PRIMARY KEY, contract_number TEXT NOT NULL UNIQUE,
        company_id TEXT NOT NULL REFERENCES companies(id),
        product TEXT NOT NULL, bereich TEXT NOT NULL,
        contract_type TEXT, start_date TEXT NOT NULL, end_date TEXT NOT NULL,
        auto_renew INTEGER DEFAULT 0, renew_months INTEGER DEFAULT 12,
        monthly_value REAL NOT NULL DEFAULT 0,
        sla_type TEXT, sla_status TEXT NOT NULL DEFAULT 'ok',
        status TEXT NOT NULL DEFAULT 'active',
        owner_id TEXT REFERENCES users(id), notes TEXT, erp_id TEXT,
        created_at TEXT NOT NULL, updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY, r2_key TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL, mime_type TEXT, size INTEGER,
        linked_type TEXT, linked_id TEXT,
        uploaded_by TEXT REFERENCES users(id), created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS mail_subscriptions (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, subscription_id TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS ms_tokens (
  email TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
      CREATE TABLE IF NOT EXISTS sync_log (
        id TEXT PRIMARY KEY, entity_type TEXT NOT NULL,
        erp_id TEXT, crm_id TEXT,
        direction TEXT NOT NULL DEFAULT 'justin_to_crm',
        status TEXT NOT NULL DEFAULT 'success',
        records_processed INTEGER DEFAULT 0, error_message TEXT,
        started_at TEXT, synced_at TEXT NOT NULL
      );
    `)
  }
  return next()
})

// ─── API routes ───
app.route('/api/companies',   companiesRouter)
app.route('/api/contacts',    contactsRouter)
app.route('/api/deals',       dealsRouter)
app.route('/api/activities',  activitiesRouter)
app.route('/api/tickets',     ticketsRouter)
app.route('/api/contracts',   contractsRouter)
app.route('/api/documents',   documentsRouter)
app.route('/api/sync',        syncRouter)
app.route('/api/users',       usersRouter)
app.route('/api/setup',       setupRouter)
app.route('/api/salesviewer',  salesviewerRouter)
app.route('/api/calendar',     calendarRouter)
app.route('/api/mail',         mailRouter)
app.route('/api/search',       searchRouter)
app.route('/api/marketing',    marketingRouter)
app.route('/api/webinars',     webinarsRouter)
app.route('/api/events',       eventsRouter)
app.route('/api/selections',   selectionsRouter)
app.route('/api/proposals',    proposalsRouter)
app.route('/api/products',     productsRouter)
app.route('/api/workflows',    workflowsRouter)
app.route('/api/reports',      reportsRouter)
app.route('/api/soss',         sossRouter)
app.route('/api/tasks',        tasksRouter)
app.route('/api/erp',          erpRouter)
app.route('/api/quotas',       quotasRouter)
app.route('/api/templates',    templatesRouter)
app.route('/api/relationships', relationshipsRouter)
app.route('/api/custom-fields', customFieldsRouter)
app.route('/api/competitive',   competitiveRouter)

app.get('/api/health', (c) => c.json({ status: 'ok', ts: new Date().toISOString() }))

// ─── Frontend ───

// ── D1 Datenbank-IDs für Export API ─────────────────────────────────────────
const D1_DB_IDS: Record<string, string> = {
  production: 'da1d7413-7552-41c2-986d-e1ab43de972d',
  staging:    '6f637732-a73a-4f8f-a536-b1c1a7a81714',
  test:       'afd28b62-7153-49a4-8afb-ddc5f6d29dbf'
}

// ── Admin: Backup via D1 Export REST API ────────────────────────────────────
app.post('/api/admin/backup', async (c) => {
  const email = c.req.header('Cf-Access-Authenticated-User-Email') || ''
  const user = await c.env.DB.prepare('SELECT role FROM users WHERE LOWER(email)=? LIMIT 1')
    .bind(email.toLowerCase()).first<{role:string}>().catch(()=>null)
  if (user?.role !== 'admin' && user?.role !== 'gf') return c.json({error:'Nur Admins'}, 403)

  const { dbEnv = 'production' } = await c.req.json().catch(() => ({})) as {dbEnv?: string}
  const dbId = D1_DB_IDS[dbEnv]
  if (!dbId) return c.json({error:'Ungültige Umgebung'}, 400)

  const apiToken = c.env.CF_API_TOKEN
  if (!apiToken) return c.json({error:'CF_API_TOKEN Secret fehlt – bitte in Cloudflare Worker Settings hinterlegen'}, 500)

  const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${c.env.CF_ACCOUNT_ID}/d1/database/${dbId}/export`
  const headers = { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' }

  // Export starten
  const startRes = await fetch(cfUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ output_format: 'polling' })
  })
  if (!startRes.ok) {
    const err = await startRes.text()
    return c.json({error:'Export konnte nicht gestartet werden: '+err.substring(0,200)}, 500)
  }
  const startData = await startRes.json() as any
  let bookmark = startData?.result?.at_bookmark

  // Polling bis fertig (max 25s)
  const deadline = Date.now() + 25000
  let downloadUrl = ''
  while (Date.now() < deadline) {
    const pollRes = await fetch(`${cfUrl}?bookmark=${bookmark}`, { headers })
    const pollData = await pollRes.json() as any
    const result = pollData?.result
    if (result?.status === 'complete' && result?.signed_url) {
      downloadUrl = result.signed_url
      break
    }
    if (result?.error) return c.json({error:'Export-Fehler: '+result.error}, 500)
    // 1s warten
    await new Promise(r => setTimeout(r, 1000))
  }

  if (!downloadUrl) return c.json({error:'Export-Timeout – bitte erneut versuchen'}, 504)

  // SQL-Dump herunterladen und als Datei zurückgeben
  const sqlRes = await fetch(downloadUrl)
  const sqlBlob = await sqlRes.blob()
  const date = new Date().toISOString().slice(0,10)

  // Auch in R2 speichern
  c.executionCtx.waitUntil(
    c.env.STORAGE.put(`backups/${dbEnv}/crm-backup-${date}.sql`, sqlBlob.stream(), {
      httpMetadata: { contentType: 'application/sql' }
    })
  )

  return new Response(sqlBlob.stream(), {
    headers: {
      'Content-Type': 'application/sql',
      'Content-Disposition': `attachment; filename="vonbusch-crm-backup-${dbEnv}-${date}.sql"`
    }
  })
})

// ── Admin: Backup in R2 speichern (auch via Cron) ───────────────────────────
async function runBackupToR2(env: Env, dbEnv = 'production') {
  const db = dbEnv === 'staging' ? env.DB_STAGING : dbEnv === 'test' ? env.DB_TEST : env.DB
  if (!db) return
  const backup: Record<string, any[]> = {}
  for (const tbl of BACKUP_TABLES) {
    try {
      const bigTbls = ['products','documents','activities','sync_log']
      const lim = bigTbls.includes(tbl) ? 10000 : 2000
      const rows = await db.prepare(`SELECT * FROM ${tbl} LIMIT ${lim}`).all()
      backup[tbl] = rows.results || []
    } catch { backup[tbl] = [] }
  }
  const meta = { version: '1.0', env: dbEnv, created_at: new Date().toISOString() }
  const key = `backups/${dbEnv}/crm-backup-${new Date().toISOString().slice(0,10)}.json`
  await env.STORAGE.put(key, JSON.stringify({meta, data: backup}), {
    httpMetadata: { contentType: 'application/json' }
  })
}

// ── Admin: Umgebung initialisieren ───────────────────────────────────────────
app.post('/api/admin/setup-env', async (c) => {
  const email = c.req.header('Cf-Access-Authenticated-User-Email') || ''
  const user = await c.env.DB.prepare('SELECT role FROM users WHERE LOWER(email)=? LIMIT 1')
    .bind(email.toLowerCase()).first<{role:string}>().catch(()=>null)
  if (user?.role !== 'admin' && user?.role !== 'gf') return c.json({error:'Nur Admins'}, 403)
  const { target } = await c.req.json() as {target: string}
  const targetDB = target === 'staging' ? c.env.DB_STAGING : target === 'test' ? c.env.DB_TEST : null
  if (!targetDB) return c.json({error:'Ungültige Umgebung'}, 400)
  let ok = 0, failed: string[] = []
  for (const sql of SCHEMA_SQL) {
    try { await targetDB.prepare(sql).run(); ok++ }
    catch(e: any) { if (!e.message?.includes('already exists')) failed.push(e.message) }
  }
  return c.json({success:true, executed:ok, errors:failed.length, details:failed.slice(0,5)})
})

// ── Admin: Production → Umgebung kopieren ────────────────────────────────────
app.post('/api/admin/copy-to-env', async (c) => {
  const email = c.req.header('Cf-Access-Authenticated-User-Email') || ''
  const user = await c.env.DB.prepare('SELECT role FROM users WHERE LOWER(email)=? LIMIT 1')
    .bind(email.toLowerCase()).first<{role:string}>().catch(()=>null)
  if (user?.role !== 'admin' && user?.role !== 'gf') return c.json({error:'Nur Admins'}, 403)
  const { target } = await c.req.json() as {target: string}
  const targetDB = target === 'staging' ? c.env.DB_STAGING : target === 'test' ? c.env.DB_TEST : null
  if (!targetDB) return c.json({error:'Ungültige Umgebung'}, 400)
  const tables = ['users','companies','contacts','deals','activities','products','templates','targets','contracts','tickets','custom_field_defs']
  let copied = 0
  for (const tbl of tables) {
    try {
      const rows = await c.env.DB.prepare(`SELECT * FROM ${tbl} LIMIT 1000`).all()
      if (!rows.results.length) continue
      await targetDB.prepare(`DELETE FROM ${tbl}`).run().catch(()=>{})
      for (const row of rows.results) {
        const cols = Object.keys(row as object).join(',')
        const vals = Object.values(row as object).map(()=>'?').join(',')
        await targetDB.prepare(`INSERT OR IGNORE INTO ${tbl} (${cols}) VALUES (${vals})`)
          .bind(...Object.values(row as object)).run().catch(()=>{})
        copied++
      }
    } catch(e) {}
  }
  return c.json({success:true, copied})
})


app.route('/api/projects', projectsRouter)
app.route('/api/notifications', notificationsRouter)
app.route('/api/justin-queue', justinQueueRouter)
app.route('/api/time-entries', timeEntriesRouter)

app.all('*', async (c) => {
  return c.env.ASSETS.fetch(c.req.raw)
})



// ── Admin: Backup-Liste aus R2 ────────────────────────────────────────────────
app.get('/api/admin/backups', async (c) => {
  const email = c.req.header('Cf-Access-Authenticated-User-Email') || ''
  const user = await c.env.DB.prepare('SELECT role FROM users WHERE LOWER(email)=? LIMIT 1')
    .bind(email.toLowerCase()).first<{role:string}>().catch(()=>null)
  if (user?.role !== 'admin' && user?.role !== 'gf') return c.json({error:'Nur Admins'}, 403)

  const dbEnv = c.req.query('env') || 'production'
  const prefix = `backups/${dbEnv}/`
  const list = await c.env.STORAGE.list({ prefix, limit: 20 })
  const files = (list.objects || [])
    .sort((a: any, b: any) => b.uploaded > a.uploaded ? 1 : -1)
    .map((obj: any) => ({
      key: obj.key,
      name: obj.key.replace(prefix, ''),
      size: obj.size,
      uploaded: obj.uploaded
    }))
  return c.json({ backups: files })
})

// ── Admin: Restore via D1 Import API ─────────────────────────────────────────
app.post('/api/admin/restore', async (c) => {
  const email = c.req.header('Cf-Access-Authenticated-User-Email') || ''
  const user = await c.env.DB.prepare('SELECT role FROM users WHERE LOWER(email)=? LIMIT 1')
    .bind(email.toLowerCase()).first<{role:string}>().catch(()=>null)
  if (user?.role !== 'admin' && user?.role !== 'gf') return c.json({error:'Nur Admins'}, 403)

  const { key, dbEnv = 'production' } = await c.req.json().catch(() => ({})) as {key: string, dbEnv: string}
  if (!key) return c.json({error:'Kein Backup-Key angegeben'}, 400)

  const apiToken = c.env.CF_API_TOKEN
  const dbId = D1_DB_IDS[dbEnv]
  if (!apiToken || !dbId) return c.json({error:'Konfiguration fehlt (CF_API_TOKEN oder ungültige Umgebung)'}, 500)

  // 1. SQL-Datei aus R2 laden
  const r2Obj = await c.env.STORAGE.get(key)
  if (!r2Obj) return c.json({error:'Backup-Datei nicht in R2 gefunden'}, 404)
  const sqlText = await r2Obj.text()
  if (!sqlText) return c.json({error:'Backup-Datei ist leer'}, 400)

  const importUrl = `https://api.cloudflare.com/client/v4/accounts/${c.env.CF_ACCOUNT_ID}/d1/database/${dbId}/import`
  const headers = { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' }

  // 2. Init: Upload-URL von CF anfordern
  const encoder = new TextEncoder()
  const sqlBytes = encoder.encode(sqlText)
  const hashBuffer = await crypto.subtle.digest('SHA-256', sqlBytes)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const etag = hashArray.map(b => b.toString(16).padStart(2,'0')).join('')

  const initRes = await fetch(importUrl, {
    method: 'POST', headers,
    body: JSON.stringify({ action: 'init', etag })
  })
  if (!initRes.ok) {
    const err = await initRes.text()
    return c.json({error:'Import Init fehlgeschlagen: '+err.substring(0,200)}, 500)
  }
  const initData = await initRes.json() as any
  const uploadUrl = initData?.result?.upload_url

  if (!uploadUrl) {
    // Datei bereits hochgeladen (gleicher etag)
    // Direkt Ingest starten
  } else {
    // 3. SQL hochladen
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      body: sqlBytes,
      headers: { 'Content-Type': 'application/octet-stream' }
    })
    if (!uploadRes.ok) return c.json({error:'SQL-Upload fehlgeschlagen'}, 500)
  }

  // 4. Ingest starten
  const ingestRes = await fetch(importUrl, {
    method: 'POST', headers,
    body: JSON.stringify({ action: 'ingest', etag })
  })
  if (!ingestRes.ok) {
    const err = await ingestRes.text()
    return c.json({error:'Ingest fehlgeschlagen: '+err.substring(0,200)}, 500)
  }
  const ingestData = await ingestRes.json() as any
  let bookmark = ingestData?.result?.at_bookmark || ingestData?.result?.current_bookmark

  // 5. Polling bis fertig (max 30s)
  const deadline = Date.now() + 30000
  let success = false
  let finalMsg = ''
  while (Date.now() < deadline) {
    const pollRes = await fetch(importUrl, {
      method: 'POST', headers,
      body: JSON.stringify({ action: 'poll', current_bookmark: bookmark })
    })
    const pollData = await pollRes.json() as any
    const result = pollData?.result
    if (result?.success || result?.status === 'complete') {
      success = true
      finalMsg = `Restore abgeschlossen. ${result?.num_queries||0} Statements ausgeführt.`
      break
    }
    if (result?.error && !result.error.includes('currently importing')) {
      return c.json({error:'Restore-Fehler: '+result.error}, 500)
    }
    bookmark = result?.at_bookmark || bookmark
    await new Promise(r => setTimeout(r, 1500))
  }

  if (!success) return c.json({error:'Restore-Timeout – Datenbank wird möglicherweise noch importiert'}, 504)
  return c.json({ success: true, message: finalMsg })
})


// ── JustIn Queue Prozessor ───────────────────────────────────────────────────
async function processJustInQueue(env: Env) {
  const cfg = await env.DB.prepare(
    "SELECT tunnel_url FROM erp_config WHERE id='default'"
  ).first<{tunnel_url:string}>().catch(() => null)
  
  if (!cfg?.tunnel_url) return // Kein ERP-Link konfiguriert
  
  const baseUrl = cfg.tunnel_url.replace(/\/$/, '')
  const authHdr = { 'X-CRM-Auth': 'vonbusch-erp-bridge', 'Content-Type': 'application/json' }
  
  // Ausstehende Einträge laden (max 20 pro Lauf)
  const rows = await env.DB.prepare(
    "SELECT * FROM justin_queue WHERE status='pending' ORDER BY created_at ASC LIMIT 20"
  ).all().catch(() => ({results:[]}))
  
  for (const entry of (rows.results as any[])) {
    let payload: any = {}
    try { payload = JSON.parse(entry.payload) } catch {}
    
    let endpoint = ''
    let method = 'POST'
    
    // Endpoint je nach Entitätstyp
    if (entry.entity_type === 'company') {
      endpoint = entry.action === 'update' && payload.erp_id
        ? `/customers/${payload.erp_id}`
        : '/customers'
      method = entry.action === 'update' && payload.erp_id ? 'PUT' : 'POST'
    } else if (entry.entity_type === 'contact') {
      endpoint = '/contacts'
    } else {
      // Unbekannter Typ → überspringen
      await env.DB.prepare(
        "UPDATE justin_queue SET status='skipped',updated_at=? WHERE id=?"
      ).bind(new Date().toISOString(), entry.id).run()
      continue
    }
    
    try {
      const res = await fetch(baseUrl + endpoint, {
        method,
        headers: authHdr,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000)
      })
      
      if (res.ok) {
        const data = await res.json() as any
        // Bei neuem Kunden: KundenNr zurück in CRM schreiben
        if (entry.entity_type === 'company' && data.customer_number) {
          await env.DB.prepare(
            "UPDATE companies SET erp_id=? WHERE id=?"
          ).bind(String(data.customer_number), entry.entity_id).run().catch(() => {})
        }
        await env.DB.prepare(
          "UPDATE justin_queue SET status='sent',sent_at=?,updated_at=? WHERE id=?"
        ).bind(new Date().toISOString(), new Date().toISOString(), entry.id).run()
      } else {
        const errText = await res.text().catch(() => String(res.status))
        const attempts = (entry.attempts || 0) + 1
        await env.DB.prepare(
          "UPDATE justin_queue SET status=?,last_error=?,attempts=?,updated_at=? WHERE id=?"
        ).bind(attempts >= 3 ? 'error' : 'pending',
          errText.substring(0, 200), attempts, new Date().toISOString(), entry.id).run()
      }
    } catch (e: any) {
      const attempts = (entry.attempts || 0) + 1
      await env.DB.prepare(
        "UPDATE justin_queue SET status=?,last_error=?,attempts=?,updated_at=? WHERE id=?"
      ).bind(attempts >= 3 ? 'error' : 'pending',
        e.message?.substring(0, 200) || 'Fehler', attempts,
        new Date().toISOString(), entry.id).run()
    }
  }
}

// ── Admin: Queue manuell verarbeiten ─────────────────────────────────────────
app.post('/api/admin/process-queue', async (c) => {
  const email = c.req.header('Cf-Access-Authenticated-User-Email') || ''
  const user = await c.env.DB.prepare('SELECT role FROM users WHERE LOWER(email)=? LIMIT 1')
    .bind(email.toLowerCase()).first<{role:string}>().catch(()=>null)
  if (user?.role !== 'admin' && user?.role !== 'gf') return c.json({error:'Nur Admins'}, 403)
  await processJustInQueue(c.env)
  return c.json({ success: true, message: 'Queue-Verarbeitung gestartet' })
})


export default {
  fetch: app.fetch,
  email: emailHandler,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // JustIn Queue alle 15 Minuten verarbeiten
    if (event.cron === '*/15 * * * *') {
      ctx.waitUntil(processJustInQueue(env))
    }
    if (event.cron === '0 2 * * *') {
      ctx.waitUntil(runBackupToR2(env, 'production'))
      return
    }
    const now = new Date().toISOString()
    await env.DB.prepare(
      `INSERT INTO sync_log (id,entity_type,direction,status,records_processed,started_at,synced_at) VALUES (?,?,?,?,?,?,?)`
    ).bind(crypto.randomUUID(), 'cron_sync', 'justin_to_crm', 'triggered', 0, now, now).run()

    // Dokumente automatisch archivieren nach 3 Tagen
    try {
      await env.DB.prepare(
        `UPDATE documents SET is_archived=1, archived_at=datetime('now'), archive_reason='auto_3days'
         WHERE is_archived=0 AND created_at < datetime('now', '-3 days')`
      ).run()
    } catch(e) {}

    // Mail-Subscriptions erneuern wenn sie in weniger als 24h ablaufen
    try {
      const expiringSoon = await env.DB.prepare(
        `SELECT email FROM mail_subscriptions WHERE expires_at < datetime('now', '+24 hours')`
      ).all()
      for (const sub of expiringSoon.results as any[]) {
        await fetch(`https://crm.vonbusch.app/api/mail/renew`, {
          method: 'POST',
          headers: { 'Cf-Access-Authenticated-User-Email': sub.email }
        }).catch(() => {})
      }
    } catch(e) {}

    // Workflow-Automatisierungen: zeitbasierte Trigger
    try {
      await runWorkflowCron(env.DB)
    } catch(e) {}
  }
}
