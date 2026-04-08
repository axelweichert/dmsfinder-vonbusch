#!/usr/bin/env node
'use strict'

const express = require('express')
const sql     = require('mssql')
const fs      = require('fs')
const path    = require('path')

// ── Konfiguration laden ───────────────────────────────────────────────────────
const cfgPath = path.join(process.execPath ? path.dirname(process.execPath) : __dirname, 'config.json')
let cfg
try {
  cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
} catch (e) {
  console.error('[vonBusch ERP Bridge] config.json nicht gefunden:', cfgPath)
  console.error('Bitte config.json neben der EXE ablegen. Vorlage:')
  console.error(JSON.stringify({
    sql: { server: 'sql01', port: 1433, database: 'justin', user: 'crm_reader', password: 'PASSWORT' },
    http: { port: 3001 },
    auth: { token: 'vonbusch-erp-bridge' }
  }, null, 2))
  process.exit(1)
}

const SQL_CFG = {
  server:   cfg.sql.server,
  port:     cfg.sql.port     || 1433,
  database: cfg.sql.database || 'justin',
  user:     cfg.sql.user,
  password: cfg.sql.password,
  options:  { encrypt: false, trustServerCertificate: true, enableArithAbort: true },
  connectionTimeout: 10000,
  requestTimeout:    15000
}
const HTTP_PORT  = cfg.http?.port  || 3001
const AUTH_TOKEN = cfg.auth?.token || 'vonbusch-erp-bridge'
const VERSION    = '1.0.0'

// ── Express App ───────────────────────────────────────────────────────────────
const app = express()
app.use(express.json())

// Einfache Token-Auth
app.use((req, res, next) => {
  if (req.path === '/ping') return next()
  const t = req.headers['x-crm-auth'] || req.headers['authorization']
  if (t !== AUTH_TOKEN && t !== 'Bearer ' + AUTH_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
})

// ── SQL Pool ──────────────────────────────────────────────────────────────────
let pool = null

async function getPool() {
  if (pool && pool.connected) return pool
  pool = await sql.connect(SQL_CFG)
  return pool
}

async function query(q, params) {
  const p   = await getPool()
  const req = p.request()
  if (params) Object.entries(params).forEach(([k,v]) => req.input(k, v))
  const r = await req.query(q)
  return r.recordset
}

// ── Endpunkte ─────────────────────────────────────────────────────────────────

// Health check (kein Auth nötig)
app.get('/ping', async (req, res) => {
  try {
    const p = await getPool()
    await p.request().query('SELECT 1 AS ok')
    res.json({ ok: true, version: VERSION, db: SQL_CFG.database, server: SQL_CFG.server })
  } catch (e) {
    res.status(503).json({ ok: false, version: VERSION, error: e.message })
  }
})

// Kundenstamm
app.get('/customers', async (req, res) => {
  try {
    const rows = await query(`
      SELECT TOP 2000
        k.KundenNr      AS customer_number,
        k.Firma1        AS name,
        k.Firma2        AS name2,
        k.Strasse       AS street,
        k.PLZ           AS zip,
        k.Ort           AS city,
        k.Land          AS country,
        k.Telefon       AS phone,
        k.EMail         AS email,
        k.Homepage      AS website,
        k.Gesperrt      AS locked
      FROM tKunden k
      WHERE k.Geloescht = 0
      ORDER BY k.KundenNr
    `)
    res.json({ data: rows, count: rows.length })
  } catch (e) {
    res.status(500).json({ error: e.message, hint: 'Tabelle tKunden prüfen' })
  }
})

// Ansprechpartner
app.get('/contacts', async (req, res) => {
  try {
    const rows = await query(`
      SELECT TOP 5000
        a.KundenNr      AS customer_number,
        a.Anrede        AS salutation,
        a.Vorname       AS first_name,
        a.Nachname      AS last_name,
        a.Position      AS position,
        a.Abteilung     AS department,
        a.Telefon       AS phone,
        a.Mobil         AS mobile,
        a.EMail         AS email,
        a.Entscheider   AS is_decision_maker
      FROM tAnsprechpartner a
      WHERE a.Geloescht = 0
      ORDER BY a.KundenNr, a.Nachname
    `)
    res.json({ data: rows, count: rows.length })
  } catch (e) {
    res.status(500).json({ error: e.message, hint: 'Tabelle tAnsprechpartner prüfen' })
  }
})

// Mitarbeiter
app.get('/employees', async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        m.MitarbeiterNr  AS employee_number,
        m.Vorname        AS first_name,
        m.Nachname       AS last_name,
        m.EMail          AS email,
        m.Telefon        AS phone,
        m.Abteilung      AS department,
        m.Aktiv          AS active
      FROM tMitarbeiter m
      WHERE m.Geloescht = 0
      ORDER BY m.MitarbeiterNr
    `)
    res.json({ data: rows, count: rows.length })
  } catch (e) {
    res.status(500).json({ error: e.message, hint: 'Tabelle tMitarbeiter prüfen' })
  }
})

// Aufträge
app.get('/orders', async (req, res) => {
  try {
    const since = req.query.since || '2020-01-01'
    const rows = await query(`
      SELECT TOP 5000
        a.AuftragsNr     AS order_number,
        a.KundenNr       AS customer_number,
        a.Datum          AS order_date,
        a.Lieferdatum    AS delivery_date,
        a.Nettobetrag    AS amount_net,
        a.Status         AS status,
        a.Bearbeiter     AS employee_number
      FROM tAuftraege a
      WHERE a.Datum >= @since
      ORDER BY a.Datum DESC
    `, { since })
    res.json({ data: rows, count: rows.length })
  } catch (e) {
    res.status(500).json({ error: e.message, hint: 'Tabelle tAuftraege prüfen' })
  }
})

// Artikel
app.get('/products', async (req, res) => {
  try {
    const rows = await query(`
      SELECT TOP 5000
        ar.ArtikelNr      AS sku,
        ar.Bezeichnung1   AS name,
        ar.Bezeichnung2   AS description,
        ar.Warengruppe    AS category,
        ar.VKPreis1       AS price,
        ar.EKPreis        AS purchase_price,
        ar.MwStSatz       AS vat_rate,
        ar.Einheit        AS unit,
        ar.Bestand        AS stock,
        ar.Aktiv          AS active
      FROM tArtikel ar
      WHERE ar.Geloescht = 0
      ORDER BY ar.Warengruppe, ar.Bezeichnung1
    `)
    res.json({ data: rows, count: rows.length })
  } catch (e) {
    res.status(500).json({ error: e.message, hint: 'Tabelle tArtikel prüfen' })
  }
})

// Schema erkunden (welche Tabellen gibt es?)
app.get('/schema', async (req, res) => {
  try {
    const tables = await query(`
      SELECT TABLE_NAME, TABLE_TYPE
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `)
    res.json({ tables: tables.map(t => t.TABLE_NAME) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Spalten einer Tabelle
app.get('/schema/:table', async (req, res) => {
  try {
    const cols = await query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = @tbl
      ORDER BY ORDINAL_POSITION
    `, { tbl: req.params.table })
    res.json({ table: req.params.table, columns: cols })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(HTTP_PORT, '127.0.0.1', () => {
  console.log(`[vonBusch ERP Bridge v${VERSION}] läuft auf Port ${HTTP_PORT}`)
  console.log(`SQL Server: ${SQL_CFG.server}:${SQL_CFG.port} / DB: ${SQL_CFG.database}`)
  console.log('Endpunkte: /ping /customers /contacts /employees /orders /products /schema')
})

process.on('SIGTERM', () => { if (pool) pool.close(); process.exit(0) })
process.on('SIGINT',  () => { if (pool) pool.close(); process.exit(0) })

// ══════════════════════════════════════════════════════════════════════════════
// RÜCKKANAL — Schreiben nach JustIn
// ══════════════════════════════════════════════════════════════════════════════

// Nächste freie KundenNr ermitteln
async function nextKundenNr() {
  const rows = await query('SELECT MAX(KundenNr) AS max FROM tKunden')
  return (rows[0]?.max || 10000) + 1
}

// Neuen Kunden anlegen (Prospect aus CRM → JustIn)
app.post('/customers', async (req, res) => {
  try {
    const b = req.body
    if (!b.name) return res.status(400).json({ error: 'name ist Pflicht' })

    const nr = await nextKundenNr()
    await query(`
      INSERT INTO tKunden (
        KundenNr, Firma1, Firma2, Strasse, PLZ, Ort, Land,
        Telefon, EMail, Homepage, Gesperrt, Geloescht
      ) VALUES (
        @nr, @name, @name2, @street, @zip, @city, @country,
        @phone, @email, @website, 0, 0
      )
    `, {
      nr,
      name:    b.name    || '',
      name2:   b.name2   || '',
      street:  b.street  || '',
      zip:     b.zip     || '',
      city:    b.city    || '',
      country: b.country || 'D',
      phone:   b.phone   || '',
      email:   b.email   || '',
      website: b.website || ''
    })
    res.json({ ok: true, customer_number: nr })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Ansprechpartner anlegen
app.post('/contacts', async (req, res) => {
  try {
    const b = req.body
    if (!b.customer_number || !b.last_name) {
      return res.status(400).json({ error: 'customer_number und last_name sind Pflicht' })
    }
    await query(`
      INSERT INTO tAnsprechpartner (
        KundenNr, Anrede, Vorname, Nachname, Position,
        Abteilung, Telefon, Mobil, EMail, Entscheider, Geloescht
      ) VALUES (
        @nr, @salutation, @first_name, @last_name, @position,
        @department, @phone, @mobile, @email, @decision_maker, 0
      )
    `, {
      nr:             b.customer_number,
      salutation:     b.salutation    || '',
      first_name:     b.first_name    || '',
      last_name:      b.last_name     || '',
      position:       b.position      || '',
      department:     b.department    || '',
      phone:          b.phone         || '',
      mobile:         b.mobile        || '',
      email:          b.email         || '',
      decision_maker: b.is_decision_maker ? 1 : 0
    })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Kunden aktualisieren (Stammdaten-Sync)
app.put('/customers/:nr', async (req, res) => {
  try {
    const b = req.body
    await query(`
      UPDATE tKunden SET
        Firma1   = @name,
        Strasse  = @street,
        PLZ      = @zip,
        Ort      = @city,
        Land     = @country,
        Telefon  = @phone,
        EMail    = @email,
        Homepage = @website
      WHERE KundenNr = @nr
    `, {
      nr:      parseInt(req.params.nr),
      name:    b.name    || '',
      street:  b.street  || '',
      zip:     b.zip     || '',
      city:    b.city    || '',
      country: b.country || 'D',
      phone:   b.phone   || '',
      email:   b.email   || '',
      website: b.website || ''
    })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})
