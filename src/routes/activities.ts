import { Hono } from 'hono'

export const activitiesRouter = new Hono<{ Bindings: any }>()

export const ACTIVITY_TYPES = [
  'Angebot','Videocall','Anruf eingehend','Anruf ausgehend','Lead',
  'E-Mail','Brief','Besuch (intern)','Besuch (extern)','Wiedervorlage',
  'Veranstaltung','Notiz','AfterSales','Kongress','HXNWRK Lead',
  'Auslaufende Verträge','Bonitätsanfrage','Auswertung','followup',
]

async function getOutlookToken(env: any, email: string): Promise<string | null> {
  try {
    const row = await env.DB.prepare('SELECT access_token,refresh_token,expires_at FROM ms_tokens WHERE email=?').bind(email).first() as any
    if (!row) return null
    if (new Date(row.expires_at) > new Date(Date.now() + 60000)) return row.access_token
    if (!row.refresh_token) return null
    const res = await fetch(`https://login.microsoftonline.com/${env.MS_TENANT_ID}/oauth2/v2.0/token`,{
      method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({client_id:env.MS_CLIENT_ID,client_secret:env.MS_CLIENT_SECRET,
        refresh_token:row.refresh_token,grant_type:'refresh_token',
        scope:'Calendars.ReadWrite Mail.Send User.Read offline_access'})
    })
    const data = await res.json() as any
    if (!data.access_token) return null
    const exp = new Date(Date.now()+data.expires_in*1000).toISOString()
    await env.DB.prepare('INSERT INTO ms_tokens(email,access_token,refresh_token,expires_at,updated_at)VALUES(?,?,?,?,?)ON CONFLICT(email)DO UPDATE SET access_token=excluded.access_token,refresh_token=excluded.refresh_token,expires_at=excluded.expires_at,updated_at=excluded.updated_at')
      .bind(email,data.access_token,data.refresh_token||row.refresh_token,exp,new Date().toISOString()).run()
    return data.access_token
  } catch { return null }
}

async function createOutlookEvent(env: any, ownerEmail: string, act: any, contact: any): Promise<string|null> {
  const token = await getOutlookToken(env, ownerEmail)
  if (!token) return null
  const startDt = act.due_at || new Date().toISOString()
  const endDt = new Date(new Date(startDt).getTime()+(act.duration_min||60)*60000).toISOString()
  const bodyText = [
    `Firma: ${act.firma_name||'–'} (Kundennr. ${act.firma_kundennr||'–'})`,
    contact?`Ansprechpartner: ${contact.first_name} ${contact.last_name}`:'',
    act.company_street?`Adresse: ${act.company_street}, ${act.company_zip} ${act.company_city}`:'',
    act.body?`\nNotiz: ${act.body}`:'',
  ].filter(Boolean).join('\n')
  try {
    const res = await fetch('https://graph.microsoft.com/v1.0/me/events',{
      method:'POST',headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'},
      body:JSON.stringify({
        subject:`[CRM] ${act.type}: ${act.subject}`,
        body:{contentType:'text',content:bodyText},
        start:{dateTime:startDt.replace('Z',''),timeZone:'Europe/Berlin'},
        end:{dateTime:endDt.replace('Z',''),timeZone:'Europe/Berlin'},
        location:act.company_city?{displayName:act.company_city}:undefined,
        isReminderOn:true,reminderMinutesBeforeStart:15
      })
    })
    if (!res.ok) return null
    const d = await res.json() as any
    return d.id||null
  } catch { return null }
}

async function sendAttendeeEmail(env: any, ownerEmail: string, act: any, toEmail: string, toName: string) {
  const token = await getOutlookToken(env, ownerEmail)
  if (!token) return
  const dt = act.due_at ? new Date(act.due_at).toLocaleString('de-DE') : 'Noch nicht festgelegt'
  const body = `Hallo ${toName},\n\ndu wurdest zu einer CRM-Aktivität eingeladen:\n\nTyp: ${act.type}\nThema: ${act.subject}\nFirma: ${act.firma_name||'–'}\nDatum: ${dt}\n${act.body?'\nNotiz: '+act.body:''}\n\nDie Aktivität ist jetzt in deinen CRM-Aktivitäten sichtbar.\n\nvon Busch CRM`
  try {
    await fetch('https://graph.microsoft.com/v1.0/me/sendMail',{
      method:'POST',headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'},
      body:JSON.stringify({message:{
        subject:`[CRM] Einladung: ${act.type} – ${act.subject}`,
        body:{contentType:'text',content:body},
        toRecipients:[{emailAddress:{address:toEmail,name:toName}}]
      }})
    })
  } catch { /* ignorieren */ }
}

async function createFollowup(env: any, orig: any, now: string) {
  if (!orig?.followup_required) return
  await env.DB.prepare(
    `INSERT INTO activities(id,type,subject,body,contact_id,company_id,deal_id,contract_id,owner_id,status,prio,followup_required,due_at,created_at,updated_at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,0,null,?,?)`
  ).bind(
    crypto.randomUUID(), orig.type,
    'Folgeaktivität: '+orig.subject, '',
    orig.contact_id,orig.company_id,orig.deal_id,orig.contract_id,
    orig.owner_id,'open',orig.prio,now,now
  ).run()
}

// GET /
activitiesRouter.get('/', async (c) => {
  const {type,linked_type,linked_id,contact_id,company_id,owner_id,status,outlook_event_id,limit='100'} = c.req.query()
  let q = `SELECT a.*,u.display_name as owner_name,u.employee_number as owner_emp_nr,co.name as firma_name,co.erp_id as firma_kundennr
    FROM activities a LEFT JOIN users u ON a.owner_id=u.id LEFT JOIN companies co ON a.company_id=co.id WHERE 1=1`
  const p: any[] = []
  if (type)       { q+=' AND a.type=?';       p.push(type) }
  if (status)     { q+=' AND a.status=?';     p.push(status) }
  if (owner_id)   { q+=' AND a.owner_id=?';   p.push(owner_id) }
  if (contact_id) { q+=' AND a.contact_id=?'; p.push(contact_id) }
  if (company_id) { q+=' AND a.company_id=?'; p.push(company_id) }
  if (linked_type&&linked_id) { q+=' AND a.linked_type=? AND a.linked_id=?'; p.push(linked_type,linked_id) }
  if (outlook_event_id) { q+=' AND a.outlook_event_id=?'; p.push(outlook_event_id) }
  q+=' ORDER BY a.created_at DESC LIMIT ?'; p.push(parseInt(limit))
  const {results} = await c.env.DB.prepare(q).bind(...p).all()
  return c.json({data:results})
})

activitiesRouter.get('/types', (c) => c.json({types:ACTIVITY_TYPES}))

activitiesRouter.get('/kanban', async (c) => {
  const db = c.env.DB
  const email = c.req.header('Cf-Access-Authenticated-User-Email')||''
  const me = await db.prepare('SELECT id,role,team FROM users WHERE email=?').bind(email).first() as any
  if (!me) return c.json({error:'User nicht gefunden'},401)
  const TEAMS: Record<string,string[]> = {
    'ITS':['usr-aw','usr-hbr','usr-hb2','usr-hd','usr-so'],
    'POM':['usr-kf','usr-mm','usr-ak2','usr-db2','usr-cd'],
    'Robotik':['usr-lk'],'Digitaldruckerei':['usr-rb']
  }
  const LEADS: Record<string,string> = {
    'usr-aw':'ITS','usr-kf':'POM','usr-lk':'Robotik','usr-rb':'Digitaldruckerei'
  }
  let ownerFilter = `owner_id='${me.id}'`
  let teamMembers: string[] = []
  if (me.role==='admin') ownerFilter='1=1'
  else if (LEADS[me.id]) { teamMembers=TEAMS[LEADS[me.id]]||[]; ownerFilter=`owner_id IN (${teamMembers.map(x=>`'${x}'`).join(',')})` }
  const now2=new Date(), monday=new Date(now2)
  monday.setDate(now2.getDate()-(now2.getDay()+6)%7); monday.setHours(0,0,0,0)
  const sunday=new Date(monday); sunday.setDate(monday.getDate()+6); sunday.setHours(23,59,59,999)
  const ws=monday.toISOString(), we=sunday.toISOString()
  const base=`SELECT a.*,u.display_name as owner_name,u.employee_number as owner_emp_nr,c.name as company_name,c.erp_id as firma_kundennr FROM activities a LEFT JOIN users u ON a.owner_id=u.id LEFT JOIN companies c ON a.company_id=c.id`
  const [tw,ip,wf,dn] = await Promise.all([
    db.prepare(`${base} WHERE ${ownerFilter} AND a.status IN('open','wiedervorlage') AND a.due_at>=? AND a.due_at<=? ORDER BY a.due_at ASC LIMIT 200`).bind(ws,we).all(),
    db.prepare(`${base} WHERE ${ownerFilter} AND a.status='in_progress' ORDER BY a.due_at ASC LIMIT 200`).all(),
    db.prepare(`${base} WHERE ${ownerFilter} AND a.status='waiting_feedback' ORDER BY a.due_at ASC LIMIT 200`).all(),
    db.prepare(`${base} WHERE ${ownerFilter} AND a.status='done' AND a.done_at>=? ORDER BY a.done_at DESC LIMIT 200`).bind(ws).all(),
  ])
  let memberBreakdown: Record<string,any> = {}
  if (LEADS[me.id]&&teamMembers.length) {
    for (const mid of teamMembers) {
      const mu=await db.prepare('SELECT display_name FROM users WHERE id=?').bind(mid).first() as any
      const [mw,mi2,mwf,md]=await Promise.all([
        db.prepare(`SELECT COUNT(*)as cnt FROM activities WHERE owner_id=? AND status IN('open','wiedervorlage') AND due_at>=? AND due_at<=?`).bind(mid,ws,we).first() as any,
        db.prepare(`SELECT COUNT(*)as cnt FROM activities WHERE owner_id=? AND status='in_progress'`).bind(mid).first() as any,
        db.prepare(`SELECT COUNT(*)as cnt FROM activities WHERE owner_id=? AND status='waiting_feedback'`).bind(mid).first() as any,
        db.prepare(`SELECT COUNT(*)as cnt FROM activities WHERE owner_id=? AND status='done' AND done_at>=?`).bind(mid,ws).first() as any,
      ])
      memberBreakdown[mid]={name:mu?.display_name||mid,thisWeek:mw?.cnt||0,inProgress:mi2?.cnt||0,waitingFeedback:mwf?.cnt||0,done:md?.cnt||0}
    }
  }
  return c.json({
    thisWeek:{count:tw.results.length,items:tw.results},
    inProgress:{count:ip.results.length,items:ip.results},
    waitingFeedback:{count:wf.results.length,items:wf.results},
    done:{count:dn.results.length,items:dn.results},
    memberBreakdown,weekStart:ws,weekEnd:we,role:me.role,isLead:!!LEADS[me.id],teamName:LEADS[me.id]||me.team
  })
})

activitiesRouter.get('/:id', async (c) => {
  const id = c.req.param('id')
  const act = await c.env.DB.prepare(
    `SELECT a.*,u.display_name as owner_name,u.employee_number as owner_emp_nr,
     co.name as firma_name,co.erp_id as firma_kundennr,
     co.street as company_street,co.zip as company_zip,co.city as company_city,
     ct.first_name as contact_first,ct.last_name as contact_last
     FROM activities a LEFT JOIN users u ON a.owner_id=u.id
     LEFT JOIN companies co ON a.company_id=co.id
     LEFT JOIN contacts ct ON a.contact_id=ct.id WHERE a.id=?`
  ).bind(id).first()
  if (!act) return c.json({error:'Not found'},404)
  const {results:attendees} = await c.env.DB.prepare(
    `SELECT aa.user_id,u.display_name,u.email,u.employee_number FROM activity_attendees aa JOIN users u ON aa.user_id=u.id WHERE aa.activity_id=?`
  ).bind(id).all()
  return c.json({...act,attendees:attendees||[]})
})

activitiesRouter.post('/', async (c) => {
  const b = await c.req.json() as any
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const email = c.req.header('Cf-Access-Authenticated-User-Email')||''
  await c.env.DB.prepare(
    `INSERT INTO activities(id,type,subject,body,linked_type,linked_id,contact_id,company_id,deal_id,contract_id,owner_id,status,prio,duration_min,followup_required,due_at,created_at,updated_at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(id,b.type,b.subject,b.body||'',b.linked_type||null,b.linked_id||null,
    b.contact_id||null,b.company_id||null,b.deal_id||null,b.contract_id||null,
    b.owner_id,b.status||'open',b.prio||null,b.duration_min||0,
    b.followup_required?1:0,b.due_at||null,now,now).run()

  if (b.attendee_ids?.length) {
    for (const uid of b.attendee_ids) {
      await c.env.DB.prepare('INSERT OR IGNORE INTO activity_attendees(id,activity_id,user_id,created_at)VALUES(?,?,?,?)')
        .bind(crypto.randomUUID(),id,uid,now).run()
    }
    if (email) {
      const act = await c.env.DB.prepare('SELECT a.*,co.name as firma_name,co.erp_id as firma_kundennr FROM activities a LEFT JOIN companies co ON a.company_id=co.id WHERE a.id=?').bind(id).first() as any
      for (const uid of b.attendee_ids) {
        const usr = await c.env.DB.prepare('SELECT email,display_name FROM users WHERE id=?').bind(uid).first() as any
        if (usr?.email) sendAttendeeEmail(c.env,email,act,usr.email,usr.display_name).catch(()=>{})
      }
    }
  }

  if (b.due_at&&email) {
    const act = await c.env.DB.prepare('SELECT a.*,co.name as firma_name,co.erp_id as firma_kundennr,co.street as company_street,co.zip as company_zip,co.city as company_city FROM activities a LEFT JOIN companies co ON a.company_id=co.id WHERE a.id=?').bind(id).first() as any
    const contact = b.contact_id ? await c.env.DB.prepare('SELECT first_name,last_name FROM contacts WHERE id=?').bind(b.contact_id).first() : null
    const outlookId = await createOutlookEvent(c.env,email,act,contact)
    if (outlookId) await c.env.DB.prepare('UPDATE activities SET outlook_event_id=? WHERE id=?').bind(outlookId,id).run()
  }

  return c.json({id},201)
})

activitiesRouter.patch('/:id', async (c) => {
  const b = await c.req.json() as any
  const now = new Date().toISOString()
  const id = c.req.param('id')
  const allowed = ['type','subject','body','contact_id','company_id','deal_id','contract_id',
                   'owner_id','status','prio','duration_min','followup_required','due_at','done_at']
  const safe: Record<string,any> = {}
  for (const [k,v] of Object.entries(b)) if (allowed.includes(k)) safe[k]=v
  if (!Object.keys(safe).length) return c.json({success:true})
  if (safe.status==='done'&&!safe.done_at) safe.done_at=now
  const fields = Object.keys(safe).map(k=>`${k}=?`).join(',')
  await c.env.DB.prepare(`UPDATE activities SET ${fields},updated_at=? WHERE id=?`).bind(...Object.values(safe),now,id).run()
  if (safe.status==='done') {
    const orig = await c.env.DB.prepare('SELECT * FROM activities WHERE id=?').bind(id).first() as any
    await createFollowup(c.env,orig,now)
  }
  return c.json({success:true})
})

activitiesRouter.patch('/:id/status', async (c) => {
  const id = c.req.param('id')
  const {status} = await c.req.json() as any
  const valid = ['open','in_progress','waiting_feedback','done','wiedervorlage']
  if (!valid.includes(status)) return c.json({error:'Ungültiger Status'},400)
  const now = new Date().toISOString()
  const doneAt = status==='done'?now:null
  await c.env.DB.prepare('UPDATE activities SET status=?,done_at=?,updated_at=? WHERE id=?').bind(status,doneAt,now,id).run()
  if (status==='done') {
    const orig = await c.env.DB.prepare('SELECT * FROM activities WHERE id=?').bind(id).first() as any
    await createFollowup(c.env,orig,now)
  }
  return c.json({success:true})
})

activitiesRouter.post('/:id/attendees', async (c) => {
  const activityId = c.req.param('id')
  const {user_id} = await c.req.json() as any
  const email = c.req.header('Cf-Access-Authenticated-User-Email')||''
  const now = new Date().toISOString()
  await c.env.DB.prepare('INSERT OR IGNORE INTO activity_attendees(id,activity_id,user_id,created_at)VALUES(?,?,?,?)')
    .bind(crypto.randomUUID(),activityId,user_id,now).run()
  if (email) {
    const act = await c.env.DB.prepare('SELECT a.*,co.name as firma_name,co.erp_id as firma_kundennr FROM activities a LEFT JOIN companies co ON a.company_id=co.id WHERE a.id=?').bind(activityId).first() as any
    const usr = await c.env.DB.prepare('SELECT email,display_name FROM users WHERE id=?').bind(user_id).first() as any
    if (usr?.email&&act) sendAttendeeEmail(c.env,email,act,usr.email,usr.display_name).catch(()=>{})
  }
  return c.json({success:true})
})

activitiesRouter.delete('/:id/attendees/:userId', async (c) => {
  await c.env.DB.prepare('DELETE FROM activity_attendees WHERE activity_id=? AND user_id=?')
    .bind(c.req.param('id'),c.req.param('userId')).run()
  return c.json({success:true})
})
// ── KI SMART-PROTOKOLL ───────────────────────────────────────────────────────

activitiesRouter.post('/smart-protokoll', async (c) => {
  const { text, typ, firma } = await c.req.json() as any
  if (!text) return c.json({ error: 'Kein Text übergeben' }, 400)

  const apiKey = c.env.ANTHROPIC_API_KEY
  if (!apiKey) return c.json({ error: 'API-Key nicht konfiguriert' }, 503)

  const heute = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  const typLabel = typ ? ' (Typ: ' + typ + ')' : ''
  const firmaLabel = firma && firma !== 'Bitte wählen' ? ' bei ' + firma : ''

  const prompt = `Du bist ein Assistent der von Busch GmbH, einem IT-Systemhaus. 
Ein Sales Manager hat nach einem Kundentermin${firmaLabel} folgende Stichpunkte oder Rohtext diktiert${typLabel}:

---
${text}
---

Erstelle daraus ein sauberes, professionelles Gesprächsprotokoll auf Deutsch.
Heute ist ${heute}.

Format (verwende genau diese Struktur, nur relevante Abschnitte):
**Termin:** [Datum/Anlass wenn erkennbar, sonst ${heute}]
**Teilnehmer:** [wenn erkennbar]

**Besprochene Themen:**
- [Thema 1]
- [Thema 2]

**Ergebnisse / Vereinbarungen:**
- [Ergebnis 1]
- [Ergebnis 2]

**Nächste Schritte:**
- [Aufgabe mit ggf. Termin]

**Notizen:**
[Sonstige relevante Informationen]

Wichtig: Nur vorhandene Informationen verwenden, nichts erfinden. Fehlende Abschnitte weglassen. Professionell und präzise formulieren. Fachbegriffe aus der IT-Branche korrekt verwenden.`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    const data = await res.json() as any
    const protokoll = data?.content?.[0]?.text
    if (!protokoll) return c.json({ error: 'KI-Antwort leer' }, 500)
    return c.json({ protokoll })
  } catch(e: any) {
    return c.json({ error: e.message || 'API-Fehler' }, 500)
  }
})


