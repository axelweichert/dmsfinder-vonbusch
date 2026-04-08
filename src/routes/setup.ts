import { Hono } from 'hono'
import type { Env } from '../index'

export const setupRouter = new Hono<{ Bindings: Env }>()

// GET /api/setup/init — Schema + Musterdaten, einmaliger Aufruf im Browser
setupRouter.get('/init', async (c) => {
  const db = c.env.DB
  try {
    // Schema — jede Tabelle einzeln
    await db.prepare(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, azure_oid TEXT, display_name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'sales', team TEXT, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT)`).run()
    await db.prepare(`CREATE TABLE IF NOT EXISTS companies (id TEXT PRIMARY KEY, name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'prospect', bereich TEXT, street TEXT, zip TEXT, city TEXT, country TEXT DEFAULT 'DE', phone TEXT, fax TEXT, email TEXT, website TEXT, notes TEXT, account_manager_id TEXT, ai_summary TEXT, ai_summary_at TEXT, erp_id TEXT UNIQUE, created_at TEXT NOT NULL, updated_at TEXT)`).run()
    await db.prepare(`CREATE TABLE IF NOT EXISTS contacts (id TEXT PRIMARY KEY, company_id TEXT NOT NULL, first_name TEXT NOT NULL, last_name TEXT NOT NULL, email TEXT, email_private TEXT, phone TEXT, mobile TEXT, position TEXT, department TEXT, is_decision_maker INTEGER DEFAULT 0, birthday TEXT, street TEXT, zip TEXT, city TEXT, status TEXT NOT NULL DEFAULT 'prospect', account_manager_id TEXT, source TEXT DEFAULT 'manual', notes TEXT, interests TEXT, marketing_email INTEGER DEFAULT 0, marketing_events INTEGER DEFAULT 0, marketing_phone INTEGER DEFAULT 0, marketing_post INTEGER DEFAULT 0, marketing_global_optin INTEGER DEFAULT 0, marketing_optin_date TEXT, marketing_optout_date TEXT, erp_id TEXT UNIQUE, created_at TEXT NOT NULL, updated_at TEXT)`).run()
    await db.prepare(`CREATE TABLE IF NOT EXISTS deals (id TEXT PRIMARY KEY, title TEXT NOT NULL, company_id TEXT NOT NULL, contact_id TEXT, owner_id TEXT NOT NULL, bereich TEXT, stage TEXT NOT NULL DEFAULT 'lead', value REAL DEFAULT 0, probability INTEGER DEFAULT 10, expected_close TEXT, status TEXT NOT NULL DEFAULT 'open', notes TEXT, erp_id TEXT, created_at TEXT NOT NULL, updated_at TEXT)`).run()
    await db.prepare(`CREATE TABLE IF NOT EXISTS activities (id TEXT PRIMARY KEY, type TEXT NOT NULL, subject TEXT NOT NULL, body TEXT, linked_type TEXT, linked_id TEXT, contact_id TEXT, company_id TEXT, deal_id TEXT, owner_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', due_at TEXT, done_at TEXT, created_at TEXT NOT NULL, updated_at TEXT)`).run()
    await db.prepare(`CREATE TABLE IF NOT EXISTS tickets (id TEXT PRIMARY KEY, ticket_number TEXT NOT NULL UNIQUE, subject TEXT NOT NULL, description TEXT, company_id TEXT NOT NULL, contact_id TEXT, assigned_to TEXT, bereich TEXT, priority TEXT NOT NULL DEFAULT 'medium', status TEXT NOT NULL DEFAULT 'open', erp_service_id TEXT, created_at TEXT NOT NULL, updated_at TEXT, resolved_at TEXT)`).run()
    await db.prepare(`CREATE TABLE IF NOT EXISTS contracts (id TEXT PRIMARY KEY, contract_number TEXT NOT NULL UNIQUE, company_id TEXT NOT NULL, product TEXT NOT NULL, bereich TEXT NOT NULL, contract_type TEXT, start_date TEXT NOT NULL, end_date TEXT NOT NULL, auto_renew INTEGER DEFAULT 0, renew_months INTEGER DEFAULT 12, monthly_value REAL NOT NULL DEFAULT 0, sla_type TEXT, sla_status TEXT NOT NULL DEFAULT 'ok', status TEXT NOT NULL DEFAULT 'active', owner_id TEXT, notes TEXT, erp_id TEXT, created_at TEXT NOT NULL, updated_at TEXT)`).run()
    await db.prepare(`CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, r2_key TEXT NOT NULL UNIQUE, name TEXT NOT NULL, mime_type TEXT, size INTEGER, linked_type TEXT, linked_id TEXT, uploaded_by TEXT, created_at TEXT NOT NULL)`).run()
    await db.prepare(`CREATE TABLE IF NOT EXISTS sync_log (id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, erp_id TEXT, crm_id TEXT, direction TEXT NOT NULL DEFAULT 'justin_to_crm', status TEXT NOT NULL DEFAULT 'success', records_processed INTEGER DEFAULT 0, error_message TEXT, started_at TEXT, synced_at TEXT NOT NULL)`).run()

    // Bestehende Daten löschen
    await db.batch([
      db.prepare('DELETE FROM sync_log'),
      db.prepare('DELETE FROM documents'),
      db.prepare('DELETE FROM contracts'),
      db.prepare('DELETE FROM tickets'),
      db.prepare('DELETE FROM activities'),
      db.prepare('DELETE FROM deals'),
      db.prepare('DELETE FROM contacts'),
      db.prepare('DELETE FROM companies'),
      db.prepare('DELETE FROM users'),
    ])

    // Users
    await db.batch([
      db.prepare(`INSERT INTO users (id,email,display_name,role,team,active,created_at) VALUES ('usr-vb','victor.vonbusch@vonbusch.digital','Victor von Busch','admin','Management',1,'2024-01-01T00:00:00Z')`),
      db.prepare(`INSERT INTO users (id,email,display_name,role,team,active,created_at) VALUES ('usr-sf','stefan.vonbusch@vonbusch.digital','Stefan F.W. von Busch','admin','Management',1,'2024-01-01T00:00:00Z')`),
      db.prepare(`INSERT INTO users (id,email,display_name,role,team,active,created_at) VALUES ('usr-zf','ziad.ferjani@vonbusch.digital','Ziad Ferjani','sales_manager','Service',1,'2024-01-01T00:00:00Z')`),
      db.prepare(`INSERT INTO users (id,email,display_name,role,team,active,created_at) VALUES ('usr-mb','michael.burmeister@vonbusch.digital','Michael Burmeister','sales_manager','Einkauf',1,'2024-01-01T00:00:00Z')`),
      db.prepare(`INSERT INTO users (id,email,display_name,role,team,active,created_at) VALUES ('usr-df','dirk.fuhrmann@vonbusch.digital','Dirk Fuhrmann','readonly','Buchhaltung',1,'2024-01-01T00:00:00Z')`),
      db.prepare(`INSERT INTO users (id,email,display_name,role,team,active,created_at) VALUES ('usr-ae','arne.elges@vonbusch.digital','Arne Elges','sales_manager','Administration',1,'2024-01-01T00:00:00Z')`),
      db.prepare(`INSERT INTO users (id,email,display_name,role,team,active,created_at) VALUES ('usr-lk','leif.krahmueeller@vonbusch.digital','Leif Krahmüller','sales_manager','Robotik',1,'2024-01-01T00:00:00Z')`),
      db.prepare(`INSERT INTO users (id,email,display_name,role,team,active,created_at) VALUES ('usr-db2','dennis.berger@vonbusch.digital','Dennis Berger','sales','POM',1,'2024-01-01T00:00:00Z')`),
      db.prepare(`INSERT INTO users (id,email,display_name,role,team,active,created_at) VALUES ('usr-aw','axel.weichert@vonbusch.digital','Axel Weichert','sales_manager','ITS',1,'2024-01-01T00:00:00Z')`),
      db.prepare(`INSERT INTO users (id,email,display_name,role,team,active,created_at) VALUES ('usr-hb2','henri.beckmann@vonbusch.digital','Henri Beckmann','sales','ITS',1,'2024-01-01T00:00:00Z')`),
      db.prepare(`INSERT INTO users (id,email,display_name,role,team,active,created_at) VALUES ('usr-hd','hannah.dehnke@vonbusch.digital','Hannah Dehnke','sales','ITS',1,'2024-01-01T00:00:00Z')`),
      db.prepare(`INSERT INTO users (id,email,display_name,role,team,active,created_at) VALUES ('usr-hbr','henning.brinker@vonbusch.digital','Henning Brinker','sales','AutoID',1,'2024-01-01T00:00:00Z')`),
      db.prepare(`INSERT INTO users (id,email,display_name,role,team,active,created_at) VALUES ('usr-mm','maik.murwig@vonbusch.digital','Maik Murwig','sales','POM',1,'2024-01-01T00:00:00Z')`),
      db.prepare(`INSERT INTO users (id,email,display_name,role,team,active,created_at) VALUES ('usr-kf','katharina.franke@vonbusch.digital','Katharina Franke','sales','Robotik',1,'2024-01-01T00:00:00Z')`),
      db.prepare(`INSERT INTO users (id,email,display_name,role,team,active,created_at) VALUES ('usr-ak2','alexander.kuhl@vonbusch.digital','Alexander Kuhl','sales','ITS',1,'2024-01-01T00:00:00Z')`),
      db.prepare(`INSERT INTO users (id,email,display_name,role,team,active,created_at) VALUES ('usr-cd','claus.dueck@vonbusch.digital','Claus Dueck','sales','LFP',1,'2024-01-01T00:00:00Z')`),
      db.prepare(`INSERT INTO users (id,email,display_name,role,team,active,created_at) VALUES ('usr-ce','claudia.eren@vonbusch.digital','Claudia Eren','sales','KAM',1,'2024-01-01T00:00:00Z')`),
      db.prepare(`INSERT INTO users (id,email,display_name,role,team,active,created_at) VALUES ('usr-rb','ralf.busche@vonbusch.digital','Ralf Busche','sales','Digitaldruckerei',1,'2024-01-01T00:00:00Z')`),
      db.prepare(`INSERT INTO users (id,email,display_name,role,team,active,created_at) VALUES ('usr-pn','peter.niemann@vonbusch.digital','Peter Niemann','support','Dispatching',1,'2024-01-01T00:00:00Z')`),
      db.prepare(`INSERT INTO users (id,email,display_name,role,team,active,created_at) VALUES ('usr-gp','guido.pruessner@vonbusch.digital','Guido Prüßner','support','Dispatching',1,'2024-01-01T00:00:00Z')`),
      db.prepare(`INSERT INTO users (id,email,display_name,role,team,active,created_at) VALUES ('usr-mh','mario.hysa@vonbusch.digital','Mario Hysa','support','ITS',1,'2024-01-01T00:00:00Z')`),
      db.prepare(`INSERT INTO users (id,email,display_name,role,team,active,created_at) VALUES ('usr-ar','anchana.ravi@vonbusch.digital','Anchana Ravi','readonly','HR',1,'2024-01-01T00:00:00Z')`),
      db.prepare(`INSERT INTO users (id,email,display_name,role,team,active,created_at) VALUES ('usr-lw','lilian.weers@vonbusch.digital','Lilian Weers','readonly','Marketing',1,'2024-01-01T00:00:00Z')`),
    ])

    // Companies
    await db.batch([
      db.prepare(`INSERT INTO companies (id,name,status,bereich,street,zip,city,country,phone,email,website,account_manager_id,erp_id,created_at,updated_at) VALUES ('co-01','Logistik Weser KG','customer','AutoID','Industriestr. 12','33334','Gütersloh','DE','+49 5241 884-0','info@logistik-weser.de','https://logistik-weser.de','usr-hbr','ERP-001','2023-03-15T00:00:00Z','2024-03-01T00:00:00Z')`),
      db.prepare(`INSERT INTO companies (id,name,status,bereich,street,zip,city,country,phone,email,website,account_manager_id,erp_id,created_at,updated_at) VALUES ('co-02','Kanzlei Brandt & Partner','prospect','eWLAN','Niederwall 12','33602','Bielefeld','DE','+49 521 9944-0','office@brandt-kanzlei.de','https://brandt-kanzlei.de','usr-hb2','ERP-002','2024-02-01T00:00:00Z','2024-03-15T00:00:00Z')`),
      db.prepare(`INSERT INTO companies (id,name,status,bereich,street,zip,city,country,phone,email,website,account_manager_id,erp_id,created_at,updated_at) VALUES ('co-03','Druckerei Müller AG','customer','POM','Druckweg 5','33335','Gütersloh','DE','+49 5241 7711-0','info@druckerei-mueller.de','https://druckerei-mueller.de','usr-mm','ERP-003','2023-06-01T00:00:00Z','2024-04-01T00:00:00Z')`),
      db.prepare(`INSERT INTO companies (id,name,status,bereich,street,zip,city,country,phone,email,website,account_manager_id,erp_id,created_at,updated_at) VALUES ('co-04','Klinikum OWL gGmbH','prospect','Robotik','Röntgenstr. 18','32756','Detmold','DE','+49 5231 72-0','info@klinikum-owl.de','https://klinikum-owl.de','usr-lk','ERP-004','2024-03-01T00:00:00Z','2024-03-30T00:00:00Z')`),
      db.prepare(`INSERT INTO companies (id,name,status,bereich,street,zip,city,country,phone,email,website,account_manager_id,erp_id,created_at,updated_at) VALUES ('co-05','Stadtwerke Herford AöR','customer','Cloudflare','Am Wasserwerk 3','32052','Herford','DE','+49 5221 188-0','it@stadtwerke-herford.de','https://stadtwerke-herford.de','usr-aw','ERP-005','2023-09-10T00:00:00Z','2024-04-01T00:00:00Z')`),
      db.prepare(`INSERT INTO companies (id,name,status,bereich,street,zip,city,country,phone,email,website,account_manager_id,erp_id,created_at,updated_at) VALUES ('co-06','Hotel Ravensberger Hof','customer','eWLAN','Artur-Ladebeck-Str. 123','33647','Bielefeld','DE','+49 521 5244-0','info@ravensberger.de','https://ravensberger.de','usr-hd','ERP-006','2023-01-15T00:00:00Z','2024-03-28T00:00:00Z')`),
      db.prepare(`INSERT INTO companies (id,name,status,bereich,street,zip,city,country,phone,email,website,account_manager_id,erp_id,created_at,updated_at) VALUES ('co-07','Lager Westfalia GmbH','customer','AutoID','Versmolder Str. 45','33378','Rheda-Wiedenbrück','DE','+49 5242 9900-0','lager@westfalia-gmbh.de','https://westfalia-gmbh.de','usr-hbr','ERP-007','2022-05-01T00:00:00Z','2024-03-30T00:00:00Z')`),
      db.prepare(`INSERT INTO companies (id,name,status,bereich,street,zip,city,country,phone,email,website,account_manager_id,erp_id,created_at,updated_at) VALUES ('co-08','Messe Bielefeld GmbH','customer','LFP','Messeplatz 1','33689','Bielefeld','DE','+49 521 9100-0','info@messe-bielefeld.de','https://messe-bielefeld.de','usr-cd','ERP-008','2022-05-01T00:00:00Z','2024-03-31T00:00:00Z')`),
      db.prepare(`INSERT INTO companies (id,name,status,bereich,street,zip,city,country,phone,email,website,account_manager_id,erp_id,created_at,updated_at) VALUES ('co-09','Autohaus Kemper GmbH','customer','POM','Paderborner Str. 88','33100','Paderborn','DE','+49 5251 8870-0','info@autohaus-kemper.de','https://autohaus-kemper.de','usr-db2','ERP-009','2023-01-10T00:00:00Z','2024-02-20T00:00:00Z')`),
      db.prepare(`INSERT INTO companies (id,name,status,bereich,street,zip,city,country,phone,email,website,account_manager_id,erp_id,created_at,updated_at) VALUES ('co-10','Schulzentrum Enger','customer','POM','Schulstr. 22','32130','Enger','DE','+49 5224 9710-0','verwaltung@sz-enger.de',NULL,'usr-mm','ERP-010','2023-04-01T00:00:00Z','2024-01-15T00:00:00Z')`),
      db.prepare(`INSERT INTO companies (id,name,status,bereich,street,zip,city,country,phone,email,website,account_manager_id,erp_id,created_at,updated_at) VALUES ('co-11','Fleischerei Dörner GmbH','customer','Digitaldruckerei','Fleischmarkt 3','32105','Bad Salzuflen','DE','+49 5222 7800-0','info@doerner-fleisch.de',NULL,'usr-rb','ERP-011','2023-07-01T00:00:00Z','2024-02-10T00:00:00Z')`),
      db.prepare(`INSERT INTO companies (id,name,status,bereich,street,zip,city,country,phone,email,website,account_manager_id,erp_id,created_at,updated_at) VALUES ('co-12','EWG Energieversorgung AG','prospect','Cloudflare','Energiestr. 1','32423','Minden','DE','+49 571 8350-0','it@ewg-minden.de','https://ewg-minden.de','usr-aw','ERP-012','2024-01-15T00:00:00Z','2024-04-01T00:00:00Z')`),
      db.prepare(`INSERT INTO companies (id,name,status,bereich,street,zip,city,country,phone,email,website,account_manager_id,erp_id,created_at,updated_at) VALUES ('co-13','Weser Kurier Verlag','customer','LFP','Annaplatz 2','32312','Lübbecke','DE','+49 5741 3300-0','druck@weser-kurier.de','https://weser-kurier.de','usr-cd','ERP-013','2022-11-01T00:00:00Z','2024-03-20T00:00:00Z')`),
      db.prepare(`INSERT INTO companies (id,name,status,bereich,street,zip,city,country,phone,email,website,account_manager_id,erp_id,created_at,updated_at) VALUES ('co-14','Reinigungsservice Blitz','customer','Robotik','Gewerbepark 7','33647','Bielefeld','DE','+49 521 4440-0','info@blitz-reinigung.de',NULL,'usr-lk','ERP-014','2023-08-15T00:00:00Z','2024-04-02T00:00:00Z')`),
      db.prepare(`INSERT INTO companies (id,name,status,bereich,street,zip,city,country,phone,email,website,account_manager_id,erp_id,created_at,updated_at) VALUES ('co-15','IT-Haus Paderborn GmbH','prospect','Proxmox','Technologiepark 12','33100','Paderborn','DE','+49 5251 6610-0','info@it-haus-pb.de','https://it-haus-pb.de','usr-ak2','ERP-015','2024-02-10T00:00:00Z','2024-04-01T00:00:00Z')`),
      db.prepare(`INSERT INTO companies (id,name,status,bereich,street,zip,city,country,phone,email,website,account_manager_id,erp_id,created_at,updated_at) VALUES ('co-16','Sportpark Brackwede GmbH','customer','eWLAN','Sportparkstr. 1','33647','Bielefeld','DE','+49 521 9200-0','info@sportpark-bw.de',NULL,'usr-hd','ERP-016','2023-05-01T00:00:00Z','2024-02-28T00:00:00Z')`),
      db.prepare(`INSERT INTO companies (id,name,status,bereich,street,zip,city,country,phone,email,website,account_manager_id,erp_id,created_at,updated_at) VALUES ('co-17','Lippstädter Metall GmbH','customer','AutoID','Stahlweg 18','59555','Lippstadt','DE','+49 2941 9080-0','info@lippstaedter-metall.de',NULL,'usr-hbr','ERP-017','2023-02-01T00:00:00Z','2024-03-15T00:00:00Z')`),
      db.prepare(`INSERT INTO companies (id,name,status,bereich,street,zip,city,country,phone,email,website,account_manager_id,erp_id,created_at,updated_at) VALUES ('co-18','Kreishandwerkerschaft OWL','prospect','POM','Handwerkerstr. 5','32756','Detmold','DE','+49 5231 9620-0','info@khs-owl.de','https://khs-owl.de','usr-db2','ERP-018','2024-01-20T00:00:00Z','2024-03-28T00:00:00Z')`),
      db.prepare(`INSERT INTO companies (id,name,status,bereich,street,zip,city,country,phone,email,website,account_manager_id,erp_id,created_at,updated_at) VALUES ('co-19','Fachklinik Senne','customer','Proxmox','Klinikweg 12','33689','Bielefeld','DE','+49 521 4480-0','it@fachklinik-senne.de',NULL,'usr-ak2','ERP-019','2023-06-15T00:00:00Z','2024-03-10T00:00:00Z')`),
      db.prepare(`INSERT INTO companies (id,name,status,bereich,street,zip,city,country,phone,email,website,account_manager_id,erp_id,created_at,updated_at) VALUES ('co-20','Werbewerkstatt Bielefeld','customer','Digitaldruckerei','Kreativstr. 8','33602','Bielefeld','DE','+49 521 5500-0','info@werbewerkstatt-bi.de','https://werbewerkstatt-bi.de','usr-rb','ERP-020','2023-03-01T00:00:00Z','2024-04-01T00:00:00Z')`),
    ])

    const u = await db.prepare('SELECT COUNT(*) as n FROM users').first<{n:number}>()
    const co = await db.prepare('SELECT COUNT(*) as n FROM companies').first<{n:number}>()
    return c.json({ success: true, users: u?.n ?? 0, companies: co?.n ?? 0 })
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500)
  }
})

// GET /api/setup/status
setupRouter.get('/status', async (c) => {
  try {
    const u = await c.env.DB.prepare('SELECT COUNT(*) as n FROM users').first<{n:number}>()
    const co = await c.env.DB.prepare('SELECT COUNT(*) as n FROM companies').first<{n:number}>()
    return c.json({ users: u?.n ?? 0, companies: co?.n ?? 0 })
  } catch {
    return c.json({ users: 0, companies: 0 })
  }
})
