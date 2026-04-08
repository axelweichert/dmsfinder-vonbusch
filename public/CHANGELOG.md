# Changelog – vonBuschOS Cloud CRM

> Neueste Version oben. Älteste Versionen unten.

## v3.0.7 – 2026-04-08
### Fix: Volltext-Suche in Dokumenten

- Rohtext aus PDF.js wird jetzt als fulltext gespeichert (statt nur KI-Kurzvorschau)
- Suche nach Inhalten wie "Körtner", "Wacker" etc. findet jetzt Treffer im Dokumenttext

## v3.0.6 – 2026-04-08
### Fix: Dokumente-Suche findet jetzt nach Firmenname + archivierte Docs

- co.name LIKE ? als eigene Query hinzugefügt
- is_archived=0 Filter aus Suche entfernt

## v3.0.5 – 2026-04-08
### Fix: Serviceverträge Mobile Card-Layout

- .th ausgeblendet, .tr als flex-wrap Card — kein horizontales Scrollen mehr

## v3.0.4 – 2026-04-08
### Hotfix: Hardcodierte Versionsnummer im HTML korrigiert

- Sidebar-Footer + Info-Panel zeigten v2.9.9 statt v3.0.4

## v3.0.3 – 2026-04-08
### Hotfix: Serviceverträge !important + Dokumente Archiv-Panel

- SV: overflow-x:auto !important + min-width:540px !important auf .th und .tr
- Dokumente: max-height auf Archiv-Panel-Container (div:last-child) statt Elternelement

## v3.0.2 – 2026-04-08
### Pflege: (Feature X) Suffixe aus README entfernt

- Inhaltsverzeichnis + Kapitelüberschriften 7.3, 11–15: Feature-Nummern-Suffixe entfernt

## v3.0.1 – 2026-04-08
### Hotfix: Serviceverträge .th + Dokumente Layout Mobile

- Serviceverträge: `.th` Header-Zeile hatte kein `min-width` → quetschte sich auf Mobile statt zu scrollen → `#v-sv .th{min-width:520px}` + `#v-sv .tbl>div{min-width:520px}`
- Dokumente: flex-Container mit `width:440px;flex-shrink:0` überschritt Mobile-Viewport → linke Spalte unsichtbar rechts → `doc-layout` Klasse + `flex-direction:column` auf ≤768px, linke Spalte `width:100%;max-height:300px`
- public/CHANGELOG.md: ab sofort bei jeder Version synchron mit README Kap. 27 aktualisiert

## v3.0.0 – 2026-04-08
### Responsive: Weitere Mobile-Fixes (Projekte, ToDo-Board, Serviceverträge, null-Bug)

- Projekte: `#proj-list minmax(480px,1fr)` überschritt Mobile-Viewport → `1fr` auf ≤768px
- ToDo-Board: `#kb-board repeat(4,minmax(180-200px,1fr))` = 720–800px auf 430px Screen → `1fr` + neue Klasse `.kb-section-grid` → `repeat(2,1fr)` auf Mobile
- Serviceverträge: `overflow-x:auto` + `min-width` auf `.tbl` (Teil-Fix, vollständig in v3.0.1)
- Null-Bug Projektkarten: `p.description === "null"` (String) wurde angezeigt → expliziter Check

## v2.9.9 – 2026-04-08
### README: Kapitel 29 Compliance (DSGVO, GoBD, HGB)

- DSGVO: Cloudflare/Anthropic/OpenAI/Microsoft bewertet, AVV-Handlungsbedarf
- GoBD 2024: Anforderungen, Umsetzung, Aufbewahrungsfristen 6/8/10 Jahre
- HGB §§238-241, §257: Aufbewahrungspflichten als Vorsystem dokumentiert
- Sofortmaßnahmen-Tabelle nach Priorität

## v2.9.8 – 2026-04-08
### Feature: Intelligent Placement aktiviert

- wrangler.toml: [placement] mode = "smart"
- Cloudflare analysiert Backend-Calls (Graph API, D1) und wählt
  optimalen Edge-Standort statt nächsten zum User
- Erwartet: niedrigere Latenz für Microsoft Graph und externe APIs

## v2.9.7 – 2026-04-08
### Bugfix: Kalender leer — kalEvents wurde nicht zugewiesen

- Ursache: loadKal() baute res-Objekt, setzte aber nie kalEvents = res.events
  → API gab 1047 Events zurück, kalEvents blieb [] → leerer Kalender
- Fix: kalEvents = res?.events || [] nach dem Promise.all Block

## v2.9.6 – 2026-04-08
### Bugfix: Kalender — leerer Kalender bei Graph-API Fehler

- v2.9.4: c.executionCtx.waitUntil() → TypeError → catch ohne events → leer
- v2.9.5: waitUntil gefixt, aber catch-Block gab events:[] nicht mit
- v2.9.6: catch liefert immer events:[] → Frontend nie leer bei Fehler
- Frontend: Error-Banner (kal-err-banner) bei API-Fehler statt leerem Kalender
- console.error für Diagnose im Worker-Log

## v2.9.6 – 2026-04-08
### Bugfix: Kalender — executionCtx Fix + Error-Handling

- v2.9.4: c.executionCtx.waitUntil() TypeError → catch ohne events → leerer Kalender
- Fix (v2.9.5): safeWaitUntil, Cache-Miss synchron schreiben
- Fix (v2.9.6): Frontend zeigt Fehlermeldung wenn Backend error liefert
- Erster Load (Cache leer): einmalig 10-18s (Graph-API), danach < 100ms aus D1

## v2.9.5 – 2026-04-08
### Bugfix: Kalender-Cache — executionCtx.waitUntil TypeError

- Ursache: c.executionCtx.waitUntil() warf TypeError wenn executionCtx undefined
  → catch-Block antwortete ohne events → leerer Kalender nach 18s
- Fix: safeWaitUntil() Wrapper mit optionalem Chaining (ctx?.waitUntil?.())
- Cache-Miss: D1-Write jetzt synchron (await, kein waitUntil nötig)
- Stale-Cache: safeWaitUntil für Background-Refresh

## v2.9.4 – 2026-04-07
### Performance: Kalender D1-Cache (Stale-While-Revalidate) — < 50ms

- Messung: Graph-API braucht 5.5–12.6s selbst für Quick-Requests
- Fix: D1-Tabelle calendar_cache (email → events_json, cached_at)
- Stale-While-Revalidate: Cache fresh → sofort aus D1 (< 50ms)
- Cache abgelaufen → sofort alten Cache zurückgeben + waitUntil(refresh)
- Erster Load (Cache leer): einmalig 5–12s (Graph-API), dann immer < 50ms
- Frontend: loadKal() vereinfacht — Events + Tasks parallel (Promise.all)
- Zweistufiges Quick/Full-Laden entfernt (nicht mehr nötig)

## v2.9.3 – 2026-04-07
### Performance: Kalender zweistufiges Laden (Quick + Full)

- Phase 1 (Quick): Nur ±6 Wochen um heute — 1 Graph-API-Call, Kalender sofort sichtbar
- Phase 2 (Hintergrund): 12 Monate vollständig nachladen — silent re-render
- Tasks werden parallel zu Phase 1 geladen (kein sequenzielles Warten)
- Backend: /api/calendar/events?window=quick — max 3 Seiten statt 20
- Cache (5 Min): unverändert, bei Cache-Treffer direkt rendern

## v2.9.2 – 2026-04-07
### README: Kapitel 24 — alle neuen Mitarbeiter dokumentiert

- ITS Projektleitung DMS: Christian Koke (465), Eva-Maria Hoffschneider (476)
- ITS Technik Infrastruktur: Petrich (344), Walkenhorst (355), Schröder (366),
  Plaß (377), Dendja (388), Linnenschmidt (399)
- ITS Technik DMS: Westermann (410), Cicek (421), Fritze (432)
- ITS Technik Print Management: Backhaus (443)
- ITS Dispatching: Wiewel (454)
- Kapitel 24 in Untergruppen strukturiert

## v2.9.1 – 2026-04-07
### Bugfix: Umgebung/Environment in rechte Spalte der Einstellungen

- Ursache: initEnv() suchte .form-card mit "Info"-Text — nach Umbenennung
  der Info-Box auf "vonBuschOS Cloud CRM" schlug der Find fehl
  → Karte wurde mit vs.appendChild() außerhalb des Grids eingefügt
- Fix: Fester Platzhalter id="env-card-target" in rechter Spalte
  → initEnv() hängt Karte immer korrekt in Spalte 2 ein
- Einstellungen rechts: Dashboard Widgets → Backup & Restore → Umgebung

## v2.9.0 – 2026-04-07
### Fix: Info-Box in linke Spalte der Einstellungen

- Info-Karte aus rechter Spalte (unter Backup) in linke Spalte verschoben
- Linke Spalte: Darstellung → Mein Profil → ℹ️ vonBuschOS Cloud CRM
- Rechte Spalte: Dashboard Widgets → Backup & Restore → Umgebung

## v2.8.9 – 2026-04-07
### Fix: Info-Text in Einstellungen, Sidebar-Button entfernt

- ℹ️ Button aus sb-top entfernt (war nicht gewünscht)
- Info-Karte in Einstellungen rechts: vollständiger CRM-Infotext
- Kernprinzipien als kompakte Liste, Edge-native Erklärung, Jahreszahl dynamisch

## v2.8.8 – 2026-04-07
### Feature: Info-Button in Sidebar

- ℹ️ Button in sb-top neben Theme-Toggle
- Modal mit vollständigem CRM-Infotext (Edge-native, KI, Revisionssicher, Integriert, Rollenbasiert, Aufgaben)
- Kernprinzipien als Icon-Karten
- Footer: Entwickelt von Axel Weichert · von Busch GmbH · (aktuelles Jahr)

## v2.8.7 – 2026-04-07
### Bugfix: Aktivitäts-Modal — Markdown korrekt gerendert

- Ursache: act.body wurde als rohe Textarea angezeigt (kein renderMd)
- Fix: Preview-Div mit renderMd() — Klick öffnet Textarea zur Bearbeitung
- onblur der Textarea: Preview wird mit renderMd() neu gerendert
- Speichern liest weiterhin den Textarea-Wert (Markdown bleibt erhalten)

## v2.8.6 – 2026-04-07
### Bugfix: Competitive Intel Formatierung

- Ursache: Zwei conflicting setTimeouts in loadCiCompetitors()
  — zweiter setTimeout setzte textContent (roher Markdown) + display:block
  — dadurch renderMd() in toggleCiPanel() nie aufgerufen
- Fix: Einziger setTimeout, innerHTML=renderMd() direkt beim Laden
  — Panel bleibt display:none bis Klick, HTML korrekt vorgerendert

## v2.8.5 – 2026-04-07
### Feature: fin_data auto-befüllen + README korrigiert

- DMS-Upload: KI-Analyse befüllt fin_data automatisch bei doc_type='Angebot'
- Felder: monthlyRate, totalValue, contractMonths, oneTimeCosts, billingCycle, financingTypes
- Backend: mergeDocAnalysis um Finanzdaten erweitert, INSERT speichert fin_data
- README: SoSS Angebotsnummer → ✅ v2.8.3
- README: Aktivitäten-Filter → ✅ v2.8.3
- README: Teilnehmer-Anzeige → ✅ v2.8.3
- README: fin_data beim DMS-Upload → ✅ v2.8.5

## v2.8.4 – 2026-04-07
### Feature: SoSS Bonitätsprüfung — Refinanzierer-Dokument Upload

- Bonitätsprüfungs-Modal: File-Upload für Refinanzierer-Antwort (PDF/JPG/PNG)
- Upload via /api/documents/upload → doc_type='Bonitätsprüfung', company_id der Firma
- PATCH /api/soss/credit-check/:id: nimmt doc_id, speichert in document_r2_key
- Dokument landet im DMS der Firma + in soss_credit_checks verknüpft
- Button deaktiviert sich während Speichern (kein Doppelklick)

## v2.8.3 – 2026-04-07
### Feature: Aktivitäten-Filter, DOCX/XLSX-Vorschau, SoSS Angebotsnummer + README

- Aktivitäten-Filter: echte Typen (Angebot, Anruf ein/aus, Videocall, E-Mail, Besuch, Notiz, Wiedervorlage, AfterSales)
- Teilnehmer-Anzeige im Aktivitäts-Modal: immer sichtbar, leer-Zustand "Keine weiteren Teilnehmer"
- DOCX/XLSX Vorschau: bereits implementiert (mammoth.js + SheetJS) — in README als ✅ dokumentiert
- SoSS Link-Generator: Angebotsnummer-Feld, wird als URL-Parameter vorausgefüllt
- README: Mail.Read/Write/Send, Calendars, Contacts → ✅ aktiv/implementiert
- README: Feature 9 Ziele & Quoten → ✅ v2.8.0, Zeiterfassung → ✅ v2.8.2

## v2.8.2 – 2026-04-07
### Feature: Zeiterfassung im Projekt + Externe Aufgaben per Mail

- D1: time_entries Tabelle (project_id, user_id, entry_date, duration_hours, description, task_id)
- Backend: GET/POST/DELETE /api/time-entries
- Projekt-Detail: neuer Tab "⏱ Zeiten"
- Zeitbuchung: Datum, Stunden (0.25er Schritte), Tätigkeit, optionale Aufgabe
- Ansicht: nach Datum gruppiert, Tagessumme, Gesamtstunden
- Techniker sehen nur eigene Einträge, Manager/Admin sehen alle
- Externe Aufgaben: 📧 Button in Aufgaben-Karten → Mail-Modal mit Empfänger/Betreff/Text
- Mail-Versand via /api/mail/send (Microsoft Graph)

## v2.8.1 – 2026-04-07
### Fix: Ziele & Quoten — Nicht-Sales Mitarbeiter ausgeschlossen

- Elges, Burmeister, Eren, Stefan/Victor von Busch, Ferjani ausgeschlossen

## v2.8.0 – 2026-04-07
### Feature: Ziele & Quoten editierbar + Changelog komplett

- Einstellungen: Karte "🎯 Ziele & Quoten" für berechtigte Nutzer
- Victor (alle Mitarbeiter), Katharina (POM), Axel (ITS)
- Jahres-Dropdown, Ertragsziel pro Mitarbeiter, sofort speichern
- Changelog-View: alle 132 Versionen angezeigt (vorher nur 1)
- Älteste Version aufgeklappt, neueste oben hervorgehoben
- CHANGELOG.md: alle Versionen vollständig enthalten
- README: v2.7.9 korrekt dokumentiert

## v2.7.9 – 2026-04-07
### Fix: README vollständig korrigiert

- Doppeltes Inhaltsverzeichnis entfernt (2.424 doppelte Zeilen)
- ToC Anker-Links Kap. 18/19/20 korrigiert
- Kapitel 27 Projektmanagement + Kapitel 28 Benachrichtigungen neu
- Changelog v2.7.6 ergänzt
- Admin Consent Status auf ✅ Erledigt gesetzt
- Ziele & Quoten editierbar → ⏳ nächstes Feature

## v2.7.8 – 2026-04-07
### HOTFIX: Alle Views wieder sichtbar — v-erp Div-Architektur korrigiert

- **Root cause:** v-erp dpanel schließt erst nach Position 421.000 statt bei ~392.000
- Ursache: Queue-Sektion (v2.7.3) schloss v-erp nicht korrekt → v-salesjahr, v-settings,
  v-proj, v-competitive, v-quotas steckten innerhalb v-erp (display:none → unsichtbar)
- Fix: `</div>` vor v-salesjahr eingefügt — v-erp schließt jetzt korrekt bei ~392.637
- ERP-Link Layout: fbar + 2-Spalten Grid (Tunnel/SQL/Sync/Setup) + Queue-Karte
- Alle Views live verifiziert: AUSSERHALB v-erp ✅
- REGEL ab sofort: v-erp dpanel NIE komplett ersetzen — nur ERP-Konfig-Block

## v2.7.7 – 2026-04-07
### Fix: Alle Views wieder sichtbar — ERP-View Div-Architektur repariert

- Root cause: v-erp dpanel ist Wrapper-Container für ERP-Konfig UND mehrere Views
  (v-salesjahr, v-templates, v-quotas, v-products, v-settings, v-proj, v-proj-detail)
- Falscher Ansatz: kompletten v-erp Block ersetzt → verschachtelte Views mitentfernt
- Korrekter Fix: nur den ERP-Konfig-Block (9.649 Zeichen) ersetzt, Div-Bilanz identisch
- Alle IDs erhalten: erp-tunnel-url, erp-sql-server, jq-list, v-settings, v-proj usw.
- Projekt-Grid: minmax(480px) für größere Kacheln

## v2.7.6 – 2026-04-07
### Feature: Projektansicht — große Karten mit allen Infos

- Projektkacheln: minmax(480px) — deutlich größer
- Badges: NEU (< 48h Änderung), ÜBERFÄLLIG, ✓ ERLEDIGT
- Projektstart + geplantes Ende als Datum-Zeile
- Mitglieder-Avatare gestapelt (async geladen)
- D1: start_date Spalte in projects (ALTER TABLE)
- Neu-Projekt Modal: Projektstart + Geplantes Ende nebeneinander

## v2.7.5 – 2026-04-07
### Fix: ERP-Link View — sauberes Grid-Layout

- Konfigurationskarten waren außerhalb des dpanel v-erp (HTML-Bug)
- Kompletter View neu strukturiert: fbar + 2-Spalten Grid + Queue-Karte
- Karten: 🌐 Cloudflare Tunnel | 🗄️ MS SQL Server | 🔄 Synchronisation | 📋 Setup-Anleitung
- JustIn Rückkanal Queue als form-card vollintegriert
- Alle 18 Element-IDs korrekt im View

## v2.7.4 – 2026-04-07
### Feature: JustIn Rückkanal — direkte MS SQL Übertragung via ERP-Bridge

- ERP-Bridge bridge.js: POST /customers (Neukunde), POST /contacts (Ansprechpartner), PUT /customers/:nr (Update)
- CRM-Worker: processJustInQueue() sendet Queue-Einträge via erp.vonbusch.app
- Cron */15: Queue automatisch alle 15 Minuten verarbeiten
- POST /api/admin/process-queue: manuelle Verarbeitung per Button
- Bei neuem Kunden: erp_id (KundenNr) wird in Firma zurückgeschrieben
- Max 3 Versuche, dann Status 'error'
- ERP-Link View: "▶️ Jetzt übertragen" Button

## v2.7.3 – 2026-04-07
### Feature: JustIn Rückkanal — Outbound Queue

- D1: justin_queue Tabelle (in Production angelegt)
- Backend: /api/justin-queue (GET, POST, PUT, DELETE, clear/done)
- ERP-Link View: neue Sektion "📤 JustIn Rückkanal — Outbound Queue"
- Queue-Tabelle mit Status-Filter (Ausstehend/Gesendet/Fehler)
- Status-Badges mit Counts
- Einträge löschen, alle Erledigten löschen
- addToJustInQueue() Hilfsfunktion für automatische Befüllung
- Vorbereitet für JustIn API-Integration sobald Format bekannt

## v2.7.2 – 2026-04-07
### Fix: Status LED vor Datenbank-Label + Restore Feature

- Status LED (🟢/🔵/🟡) vor "Datenbank: Production" wieder hergestellt
- HTML-Startwert korrigiert + doppelter Code-Block entfernt
- Enthält v2.7.1: Restore aus Backup (D1 Import API)

## v2.7.1 – 2026-04-07
### Feature: Restore aus Backup

- GET /api/admin/backups?env=X → Liste aller R2-Backups
- POST /api/admin/restore → Restore via Cloudflare D1 Import API
- Restore funktioniert für Production, Staging und Test
- Production-Restore: doppelte Bestätigung (confirm + Texteingabe "RESTORE")
- Backup-Karte in Einstellungen zeigt jetzt Backup-Liste + Restore-Buttons
- Automatisches Laden der Backup-Liste beim Öffnen der Einstellungen

## v2.7.0 – 2026-04-07
### Feature: In-App Benachrichtigungen

- D1: notifications Tabelle (in Production angelegt)
- Backend: /api/notifications (GET, count, mark read, read-all)
- Glocke Dropdown: Tabs "📋 Aufgaben" + "🔔 Neu"
- Polling alle 60s für ungelesene Benachrichtigungen
- Badge an Glocke zeigt ungelesene Notifs
- Trigger: Neue Aufgabe in Projekt → Mitglieder werden benachrichtigt
- Trigger: Aufgabe auf "Erledigt" → Projekt-Owner wird benachrichtigt
- Trigger: Mitglied hinzugefügt → Neues Mitglied wird benachrichtigt
- Klick auf Notification → navigiert zum Projekt

## v2.6.4 – 2026-04-07
### Fix: Mitglieder-Modal – allUsers leer

- /api/users gibt {data:[]} zurück, nicht {users:[]}
- Fix: d?.users → d?.data || d?.users
- Live verifiziert: 24 User werden geladen

## v2.6.3 – 2026-04-07
### Feature: Projekte – Mitglieder, Firma-Karte, Timeline

- Projekt-Detail: Tab-Navigation (Kanban / Mitglieder / Timeline)
- Mitglieder hinzufügen/entfernen mit Mitarbeiter-Auswahl
- Timeline/Gantt: Aufgaben als Balkendiagramm nach Fälligkeitsdatum
- Projektkarte in Firmenkarte (verknüpfte Projekte)
- Neues Projekt direkt aus Firmenkarte erstellen
- Backend: GET /api/projects/count, company_id Filter, Members-Routen
- allUsers wird bei Projekt-Detail geladen für Mitglieder-Modal

## v2.6.2 – 2026-04-07
### Fix: Benutzerdefinierte Felder aus Detail-Views entfernt

- Firma-Detail: fi-cf Card entfernt
- Kontakt-Detail: ct-cf Card entfernt
- Benutzerdefinierte Felder bleiben nur in Einstellungen verwaltbar

## v2.6.1 – 2026-04-07
### Fix: Projektmanagement – Modals mit korrekten Inline-Styles

- Alle 4 Modals komplett mit Inline-Styles (kein .modal/.modal-header CSS)
- MODAL_OVL/PNL/HDR/TTL/INP Konstanten für konsistentes Design
- Modals matchen jetzt das CRM-Design (var(--bg), var(--bd) etc.)
- Hintergrund-Click schließt Modal
- saveNewProject/saveEditProject/saveNewTask/saveEditTask korrekt async

## v2.6.0 – 2026-04-07
### Feature: Projektmanagement mit Kanban Board

- Neue Sidebar-Navigation: 📋 Projekte
- D1: Tabellen projects, project_tasks, project_members angelegt
- Backend: /api/projects vollständig (CRUD Projekte + Tasks)
- Projekte-Liste mit Fortschrittsbalken und Farbmarkierung
- Kanban Board: Offen → In Arbeit → Review → Erledigt
- Drag & Drop zwischen Spalten
- Aufgaben: Titel, Beschreibung, Priorität, Fälligkeitsdatum
- Verlinkung mit Firma und Deal optional
- Projekt erstellen/bearbeiten/löschen
- Aufgabe erstellen/bearbeiten/löschen

## v2.5.13 – 2026-04-07
### Fix: ERP-Test HTTP-Methode + Auth-Fehler Monitoring

- checkErpStatus(): api() Aufruf von falschem Syntax korrigiert (GET→POST)
- ERP /api/erp/test wurde als GET statt POST aufgerufen → 404

## v2.5.12 – 2026-04-07
### Feature: Backup via Cloudflare D1 Export REST API (kein Limit)

- Backup nutzt jetzt CF D1 Export API statt Worker-internes SELECT
- Kein LIMIT mehr — alle Daten unabhängig von Datenbankgröße
- Export läuft auf CF-Infrastruktur, nicht im Worker (kein CPU-Timeout)
- Gibt SQL-Dump (.sql) zurück, wird zusätzlich in R2 gespeichert
- Benötigt: CF_API_TOKEN Secret mit Account → D1 → Edit Berechtigung

## v2.5.11 – 2026-04-07
### Fix: Backup – Limit für products/documents/activities auf 10.000

- products hatte LIMIT 2000 → 479 fehlende Produkte (von 2479)
- bigTables-Gruppen: products, documents, activities, sync_log → LIMIT 10000

## v2.5.10 – 2026-04-07
### Fix: Admin-Routes vor app.all('*') verschoben

- Ursache: app.all('*') stand VOR den Admin-Routen → alle POST-Requests wurden von ASSETS abgefangen
- Reihenfolge korrigiert: backup, setup-env, copy-to-env jetzt alle VOR app.all

## v2.5.9 – 2026-04-07
### Fix: Backup – POST statt GET, LIMIT 2000

- Worker CPU-Timeout behoben: GET → POST, LIMIT 2000 pro Tabelle
- Backup wird in R2 gespeichert UND direkt als Download geliefert
- Fehlertext im Toast bei Misserfolg

## v2.5.8 – 2026-04-07
### Feature: Datenbank-Backup

- GET /api/admin/backup → JSON-Export aller 30 Tabellen (nur Admin/GF)
- Unterstützt Production, Staging und Test-Umgebung
- Tägliches Auto-Backup in R2 um 2:00 Uhr (Cron `0 2 * * *`)
- wrangler.toml: zweiter Cron-Trigger hinzugefügt
- Settings: 💾 Backup-Karte mit Download-Buttons (nur Admin sichtbar)
- ms_tokens ausgeschlossen (OAuth-Tokens, sicherheitsrelevant)
- scheduled(): event.cron-Check für tägliches Backup

## v2.5.7 – 2026-04-07
### Fix: Settings – Benutzerdefinierte Felder nach links

- Benutzerdefinierte Felder Card von rechter in linke Spalte verschoben
- Live im Browser verifiziert vor ZIP-Erstellung

## v2.5.6 – 2026-04-07
### Fix: Umgebungs-Umschalter – initEnv() beim Settings-Open

- initEnv() wird jetzt bei sw('settings') aufgerufen: `setTimeout(initEnv, 100)`
- Live getestet: card=true, 7 Buttons sichtbar

## v2.5.5 – 2026-04-07
### Fix: Umgebungs-Umschalter – Card dynamisch erzeugt

- initEnv() erstellt env-switcher-card dynamisch im DOM
- curUser → me (korrekte User-Variable)
- Axel Weichert: role in D1 von sales_manager → admin gesetzt

## v2.5.4 – 2026-04-07
### Fix: Umgebungs-Umschalter – me statt curUser

- curUser → me (korrekte Variable aus init())
- initEnv() mit 500ms Delay damit me geladen ist

## v2.5.3 – 2026-04-07
### Feature: DB-Anzeige in Sidebar

- Unter vonBuschOS Cloud CRM: "🟢 Datenbank: Production" / "🔵 Staging" / "🟡 Test"
- Grün=Production (normal), Blau=Staging (fett), Gelb=Test (fett)
- updateEnvUI() aktualisiert db-label bei jedem Umschalten

## v2.4.94 – 2026-04-07
### Fix: DMS E-Mail Viewer — identisch zu Aktivitäten-Ansicht

- E-Mail Viewer komplett neu: sucht Activity per outlook_event_id oder company+subject
- Zeigt activity.body mit exakt dem selben Styling wie showAkDetail
- Fallback: fulltext_idx → summary → Hinweis

## v2.5.2 – 2026-04-07
### Feature: Multi-Umgebung (Production / Staging / Test)

- D1: vonbusch-crm-staging + vonbusch-crm-test angelegt
- wrangler.toml: DB_STAGING + DB_TEST Bindings
- Backend: Env type erweitert, DB-Middleware (X-CRM-Env Header), nur Admin
- Admin-Endpoints: /api/admin/setup-env + /api/admin/copy-to-env
- Frontend: Umgebungs-Umschalter in Einstellungen (nur Admin/GF)
- api(): sendet X-CRM-Env Header bei Staging/Test
- Indikator in Sidebar-Footer zeigt aktive Umgebung

## v2.5.1 – 2026-04-07
### Fix: Katalog-Overlay vor Angebot-Modal

- showKatalogPicker(): katalog-overlay z-index 200 → 9000 (live geprüft)
- product-modal z-index war das falsche Element — katalog-overlay ist dynamisch

## v2.5.0 – 2026-04-07
### Release 2.5 + Fix: Produktkatalog öffnet vor Angebot-Modal

- product-modal z-index: 200 → 9000 (live verifiziert: proposal-overlay z=300 > product-modal z=200)
- Enthält alle Änderungen seit v2.4.78: Benutzerdefinierte Felder, Duplikate, E-Mail Sync,
  DMS E-Mail Viewer, Sonderzeichen UTF-8, dvSetBody/dvAppendEl Fix, OAuth Loop Fix

## v2.4.98 – 2026-04-07
### Fix: E-Mail Viewer — Sonderzeichen (UTF-8)

- atob() → TextDecoder UTF-8 (live verifiziert: Höflichkeit statt HÃ¶flichkeit)

## v2.4.97 – 2026-04-07
### Fix: DMS E-Mail Viewer — MIME Parser mit base64 Dekodierung

- .eml live im Browser getestet: atob() dekodiert base64 korrekt
- Von/An/Datum/Betreff aus RFC822-Header geparst
- text/plain MIME-Teil gefunden und base64-dekodiert angezeigt
- Fallback: Activity body (email-sync) oder summary

## v2.4.93 – 2026-04-07
### Bugfix: DMS DOCX/XLSX Viewer — dvAppendEl lastElementChild

- dvAppendEl hatte gleichen querySelector('div:last-child') Bug wie dvSetBody
- Fix: lastElementChild (direktes Kind) statt querySelector (findet verschachteltes)
- DOCX und XLSX werden jetzt korrekt angezeigt

## v2.4.92 – 2026-04-07
### Fix: DMS E-Mail Viewer — identisches Styling wie Aktivitäten

- Viewer nutzt exakt gleiche Darstellung wie showAkDetail (grauer Box, pre-wrap)
- parseEmailText(): RFC822-Header (From:/To:/Subject:) wird sauber geparst
- Für email-sync: Activity-Body via outlook_event_id geladen
- Für .eml-Upload: Header geparst und strukturiert angezeigt

## v2.4.91 – 2026-04-07
### Feature: DMS E-Mail Viewer zeigt vollständigen Mail-Inhalt

- Viewer lädt für email-sync Dokumente die zugehörige Activity (via outlook_event_id)
  und zeigt den vollen body — nicht nur die KI-Zusammenfassung
- activities.ts: outlook_event_id als Query-Filter ergänzt
- processMail: body auch in fulltext_idx gespeichert

## v2.4.90 – 2026-04-07
### Bugfix: DMS Viewer — dvSetBody removeChild Fehler

- dvSetBody: querySelector('div:last-child') → lastElementChild
  (querySelector fand verschachteltes div → removeChild schlug fehl → "Wird geladen" blieb)
- E-Mail-Dokumente werden jetzt korrekt inline angezeigt

## v2.4.89 – 2026-04-07
### Fix + Feature: E-Mail DMS Viewer + Label-Korrektur

- doc_type 'email' (lowercase) wird als 'E-Mail' angezeigt (DOC_ICONS + dvHeader)
- DMS Viewer: E-Mail-Dokumente zeigen Inhalt direkt inline (pre-wrap, scrollbar)
- Erkennung über mime_type 'message/rfc822' oder r2_key 'email-sync/' oder doc_type 'E-Mail'

## v2.4.88 – 2026-04-07
### Feature: E-Mail Darstellung + Dokument-Archivierung

- Aktivitäten: E-Mail-Typ zeigt Inhalt formatiert (scrollbar, pre-wrap, nicht editierbar)
- E-Mail-Aktivität speichert Mail auch automatisch als Dokument (doc_type='E-Mail')
- Dokumente-View zeigt eingehende Mails mit Firma/Kontakt-Zuordnung

## v2.4.87 – 2026-04-07
### Feature: E-Mail Sync live + Dedup-Fix

- E-Mail Sync funktioniert: axel@weichert.at → automatisch als Aktivität archiviert
- Duplikat-Bug: Mail wurde 5× gespeichert weil Webhook mehrfach feuerte
- Fix: Dedup-Check via outlook_event_id (messageId) vor INSERT
- outlook_event_id wird jetzt bei jeder E-Mail-Aktivität gespeichert
- Duplikate in D1 bereinigt

## v2.4.86 – 2026-04-07
### Bugfix: E-Mail Sync — Spaltenname + confirm()-Loop

- mail_subscriptions: Spalte hieß 'expiration_datetime' statt 'expires_at' → 500
- D1 Tabelle neu erstellt mit korrektem Schema (expires_at)
- Migration 0023 korrigiert
- confirm()-Loop in mailSubscribe() entfernt — war störend und falsch

## v2.4.85 – 2026-04-07
### Bugfix: E-Mail Sync OAuth Consent-Loop behoben

- Root Cause: prompt=consent im Auth-URL erzwang bei JEDEM Aufruf den Consent-Dialog
- Fix: prompt=select_account (zeigt nur Login, kein Consent wenn bereits erteilt)
- Explizites Re-Consent weiterhin möglich via /api/calendar/auth?force=1

## v2.4.84 – 2026-04-07
### Fix: E-Mail Sync — mail_subscriptions Tabelle + erweiterter OAuth Scope

- D1: mail_subscriptions Tabelle fehlte → 500 auf /api/mail/status (direkt in D1 angelegt)
- Migration 0023: mail_subscriptions.sql für Reproduzierbarkeit
- SCOPE erweitert: Calendars.ReadWrite, Mail.Send, Contacts.Read, Contacts.ReadWrite
  (alle vom Admin genehmigten Berechtigungen jetzt im Token-Request)
- loadMailStatus: Bei 500 → Reconnect-Link statt leerer Anzeige
- mailSubscribe: Fehlermeldung mit Reconnect-Dialog

Aktion erforderlich: https://crm.vonbusch.app/api/calendar/auth neu aufrufen
um Token mit erweiterten Berechtigungen zu erhalten.

## v2.4.83 – 2026-04-07
### Bugfix: Duplikate-Modal — "undefined" bei Kontakten

- Kontakte haben kein .name Feld → first_name + last_name kombiniert (cNm)
- Subinfo für Kontakte: Firma + Position + E-Mail statt Stadt/PLZ/Tel
- Duplikat-Suche für Svenja Gerdes findet korrekt das Duplikat

## v2.4.82 – 2026-04-07
### Feature: Duplikate-Erkennung + Zusammenführen (Firma + Kontakt)

- showDuplikate() implementiert — war bisher leere Funktion ohne Code
- Modal zeigt ähnliche Einträge nach Name/PLZ (Backend /:id/duplicates)
- Zusammenführen: Deals, Aktivitäten, Dokumente werden übertragen, Duplikat gelöscht
- Funktioniert für Firmen und Kontakte
- Merge via /api/companies/merge und /api/contacts/merge (bestehende Backend-Routes)

## v2.4.81 – 2026-04-07
### Bugfix: Benutzerdefinierte Felder — Timing-Fix + UI-Verbesserung

- Root Cause: loadCustomFields wurde vor fi-overview-grid.innerHTML aufgerufen
  → fi-cf-content Element existierte noch nicht im DOM
- Fix: loadCustomFields direkt nach sw('fi-detail') aufgerufen
- Empty State: Button "Feld anlegen" öffnet direkt die Einstellungen
- Felder: Trennlinie zwischen Zeilen für bessere Lesbarkeit

## v2.4.80 – 2026-04-07
### Bugfix: Benutzerdefinierte Felder — Speichern funktioniert jetzt

- Root Cause: SQL LEFT JOIN lieferte cfv.id=NULL wenn noch kein Wert existiert
- Fix Backend: cfd.id as def_id in SELECT — Feld-Definition-ID immer verfügbar
- Fix Frontend: saveCfValue nutzt f.def_id statt f.field_id||f.id
- Felder können jetzt direkt in Firma- und Kontakt-Detail eingegeben werden

## v2.4.79 – 2026-04-07
### Fix: Benutzerdefinierte Felder — async + Seed-Daten + Modal

- loadCfDefs() und loadCustomFields() als async markiert (hatten await ohne async)
- D1 Seed: 4 Felder für Firma (Vertragsende, Zertifizierungen, Wartungsvertrag, Priorität)
  und 2 Felder für Kontakt (DSGVO Unterschrift, Geburtstag) direkt in D1 angelegt
- Modal-Titel: "Custom Field anlegen" → "Benutzerdefiniertes Feld anlegen"
- Default-Entity im Modal: Firma vorausgewählt
- Nach Speichern: Detail-View wird automatisch aktualisiert (curFi reload)

## v2.4.78 – 2026-04-07
### UX: Benutzerdefinierte Felder — Umbenennung + Bearbeitbarkeit

- "Custom Fields" → "📋 Benutzerdefinierte Felder" überall (Firmen, Kontakte, Einstellungen)
- loadCustomFields() als async markiert (war sync trotz await)
- Leer-Zustand: Hinweis auf Einstellungen zum Anlegen von Feldern
- Karte: "direkt bearbeitbar" Hint im Titel
- Felder können inline bearbeitet werden (Text, Select, Checkbox, Datum)

## v2.4.77 – 2026-04-07
### Mobile: JS-basierte Card-Templates statt CSS-Hacks

- Richtiger Ansatz: loadFi/loadCt/loadTk rendern je nach Viewport unterschiedliche HTML-Templates
- isMobile() Hilfsfunktion (≤480px)
- Firmen Mobile: Name + Status-Badge + Stadt/Bereich + Kontakte/Deals/Datum
- Kontakte Mobile: Avatar rund + Name/Position/Firma + Tel/Status kompakt
- Tickets Mobile: TK-Nr + Prio/Status-Badges + Betreff + Firma/Techniker
- CSS Mobile-Block auf minimale, nicht-destruktive Basis reduziert
- Desktop-Darstellung vollständig unverändert

## v2.4.76 – 2026-04-07
### Hotfix: Dashboard-Widget abgeschnitten + Mobile Overflow korrekt

- Fehler v2.4.75: overflow-x:hidden auf .view schnitt Dashboard-Widgets ab
- Fix: overflow-x:hidden nur auf .cnt, max-width:100% auf .card und .twoc
- Dashboard twoc (Deal-Pipeline) → 1-spaltig auf Mobile
- db-quota-section: korrekte Breite auf Mobile

## v2.4.75 – 2026-04-07
### Mobile-Fix: iPhone/iPad kein horizontales Scrollen mehr

- Globales overflow-x:hidden auf Views auf Mobile (≤480px)
- Alle .tr Tabellen-Rows → flex-wrap Card-Stack auf Mobile (kein Grid-Overflow)
- Tabellen-Header auf Mobile ausgeblendet
- CF MSSP Kalkulator: 1fr 1fr → 1fr auf Mobile (untereinander)
- CF MSSP Leads: tr-Cards als Stack, kein seitliches Scrollen
- Security Check / Competitive Intel: Card-Stack auf Mobile
- Einstellungen Profilfoto: Fix — wird jetzt direkt aus localStorage geladen
- 2-Spalten-Grids → 1-Spalte auf ≤480px
- Modals: volle Breite auf Mobile
- Vorbereitung für Release 2.5.0

## v2.4.74 – 2026-04-06
### UX-Pass: Responsivität + Fan-Faktor

- **Toast-System**: Alle 88 alert() durch schöne Toast-Notifications ersetzt (Erfolg/Fehler/Info/Warn)
- **Responsive Tabellen**: .tr auf Mobile als flex-wrap Stack statt Grid-Overflow
- **Responsive Detail-Views**: 3-Spalten-Layouts wrappen auf Tablet/Mobile
- **Micro-Interactions**: Hover-Transitions auf Tabellenzeilen, NavItems, Karten
- **View-Transitions**: Sanftes fadeSlideIn beim View-Wechsel
- **Scrollbar-Styling**: Schlanke, dezente Scrollbars
- **Input-Focus**: Glow-Effekt auf --ac Farbe
- **Buttons**: Active-Scale-Effekt + Primary-Hover-Shadow
- **Empty-States**: Größerer Padding, bessere Lesbarkeit
- **Speichern-Toasts**: Bestätigungen bei Mitbewerber speichern, Firma speichern

## v2.4.73 – 2026-04-06
### UX: Competitive Intel — KI-Analyse eingeklappt + Markdown-Rendering

- KI-Analyse standardmäßig eingeklappt (kein Auto-Expand beim Laden)
- Mitbewerber-Name klickbar → klappt Analyse auf/zu (▶/▼ Pfeil)
- Markdown-Renderer: **fett**, ## Überschriften, - Listen werden gerendert
- runCiAi: Analyse nach KI-Generierung direkt aufgeklappt und gerendert

## v2.4.72 – 2026-04-06
### Feature: KI-Analyse für Mitbewerber (Competitive Intel)

- D1 Migration 0022: ai_analysis + ai_analyzed_at Spalten in competitors
- Backend: POST /api/competitive/competitors/:id/analyze → Claude Sonnet 4
- Prompt: Stärken, Schwächen, Kundensegmente, Differenzierung, Empfehlung (DE)
- Frontend: 🤖 KI Button pro Mitbewerber → Analyse klappt direkt in der Zeile auf
- Bereits analysierte Mitbewerber: Analyse wird beim Laden automatisch angezeigt

## v2.4.71 – 2026-04-06
### Bugfix + UX: Quelle Mapping + Custom Fields Kontakt rechte Spalte

- Quelle: erp_import/email/doc-ki/event zum Mapping ergänzt
- Custom Fields im Kontakt-Detail: von Spalte 1 nach Spalte 3 (unter Marketing Opt-In)

## v2.4.70 – 2026-04-06
### Bugfix: Profilfoto Race Condition + Quelle/Account Manager Klartext

- Profilfoto: init() überschrieb user-av.textContent nach loadProfilePhoto → Race Condition
- Fix: loadProfilePhoto(u.id) direkt in init() nach user-av.textContent setzen
- Kontakt-Detail: c.source zeigt jetzt Klartext (cold_call→Cold Call etc.)
- Kontakt-Detail: c.account_manager_id wird zu display_name via /api/users aufgelöst

## v2.4.69 – 2026-04-06
### UX: Custom Fields in Firmen-Detail nach Social Media verschoben

- Custom Fields stand fälschlicherweise ganz oben im Firmen-Detail (vor dem Profil)
- Statischen fi-cf Block entfernt
- Custom Fields Card dynamisch in openFi() nach Social Media eingefügt
- loadCustomFields() auf neues fi-cf-content Element umgestellt

## v2.4.68 – 2026-04-06
### Bugfix: loadTk() Template-Literal Problem → String-Konkatenation

- loadTk() Template-Literal verhinderte Befüllung von tk-body (Grund unklar)
- Umgestellt auf String-Konkatenation → funktioniert zuverlässig
- setNb() Hilfsfunktion für alle nb-XX Badge-Updates eingeführt
- Tickets-View zeigt jetzt Daten korrekt an

## v2.4.67 – 2026-04-06
### Bugfix: nb-XX getElementById crasht → Kontakte/Aktivitäten/Tickets leer

- loadCt/loadAk/loadTk: getElementById('nb-ct') etc. → null wenn nb-Elemente fehlen
- TypeError stoppte Funktion vor ct-body/ak-body/tk-body Befüllung
- Fix: alle nb-XX Aufrufe null-safe mit Fallback auf badge-XX
- Ursache: Nav-Umbau ersetzte nb-IDs durch badge-IDs ohne Ladefunktionen anzupassen

## v2.4.66 – 2026-04-06
### Bugfix: Leere Badges als blauer Strich + Deals/Tickets fehlend

- Badge CSS hatte display:inline-block → leere Badges sichtbar als Strich
- Fix: .badge{display:none} als Standard, JS setzt display:inline-block wenn Wert > 0
- Deals-Badge: /api/deals?limit=999 → data.length
- Tickets-Badge: /api/tickets?limit=999 → data.length
- Aktivitäten-Badge: war nicht implementiert (kein Count-Endpoint)

## v2.4.65 – 2026-04-06
### Bugfix: Badge-Endpunkte falsch + Lead Magneten immer sichtbar

- loadAllBadges nutzte falsche Endpunkte (kein total zurückgegeben)
- Korrekte Endpunkte: tasks/count, contracts/stats, soss/stats
- Lead Magneten Sub-Items hatten kein initial display:none → immer sichtbar
- Fix: ni-lm-* initial style="display:none", toggleSubnav schaltet um

## v2.4.64 – 2026-04-06
### Bugfix: toggleSubnav fehlt + alle Badges leer

- toggleSubnav() fehlte → Lead Magneten nicht auf/zuklappbar
- Badge-Loading: nur Firmen hatte Ladelogik, alle anderen leer
- loadAllBadges() eingeführt: lädt alle 8 Badges parallel (Firmen, Kontakte, Deals, Aktivitäten, Aufgaben, Tickets, Serviceverträge, SoSS)
- loadAllBadges() in loadDb() aufgerufen beim App-Start

## v2.4.63 – 2026-04-06
### Bugfix: Webinare/System&Tools außerhalb der Sidebar + Badge CSS

- Überzähliges </div> nach lm-rob → sb-div schloss sich zu früh
- ni-wb, ni-ev + alle System & Tools Einträge ausserhalb #sb → horizontale Leiste
- Fix: </div> entfernt, alle 31 ni-Elemente korrekt in sbnav
- Badge CSS (.badge) fehlte → "85" klebt als Text an "Firmen"
- Badge CSS hinzugefügt: accent-Farbe, border-radius, padding

## v2.4.62 – 2026-04-06
### Pflege: README.md — Kapitel 15–17 neu + Nummerierung

- Neues Kapitel 15: WhatsApp & SMS Integration (Feature 11)
- Neues Kapitel 16: Sidebar-Navigation (vollständige Struktur mit Badges)
- Neues Kapitel 17: Einstellungen (Profilfoto, Custom Fields, 2-spaltig)
- Firmen Counter-Badge in Kapitel 3 dokumentiert
- Kapitel 1–27 durchgängig sauber nummeriert

## v2.4.61 – 2026-04-06
### Bugfix: Play-Button SVG riesig im Content-Bereich

- </div ohne > beim lm-rob-Eintrag → SVG aus ni-Element gerutscht, direkt in .shell
- Webinare-SVG (16x16 viewBox) wurde auf volle Breite gestreckt
- Fix: alle fehlerhaften </div\n → </div>\n korrigiert
- Enthält alle Änderungen aus v2.4.59/2.4.60

## v2.4.60 – 2026-04-06
### Bugfix: .dpanel{ doppelt → alle Views unsichtbar

- Navigation-Umbau hatte .dpanel{display:none!important} eingeschleust
- Alle Views (Dashboard, Firmen, etc.) waren unsichtbar
- Fix: zweites .dpanel{ entfernt, genau 1x vorhanden
- Enthält alle Änderungen aus v2.4.59: Nav-Umstrukturierung, Firmen-Badge, Profilfoto-Startup, Settings 2-spaltig

## v2.4.59 – 2026-04-06
### Feature: Navigation + Einstellungen überarbeitet

- Sidebar: CRM (Firmen+Badge, Kontakte, Deals, Aktivitäten, Aufgaben, ToDo, Tickets, Kalender, Dokumente)
- Sidebar: Geschäftsbereiche in Auswertung integriert (Übersicht, Serviceverträge, Reports, Workflows, Selektionen, Produktkatalog, SoSS)
- Sidebar: System & Tools neu sortiert (Competitive Intel, SalesViewer, CF Kalkulator, E-Mail Sync, ERP-Link, Einstellungen)
- Firmen: Counter-Badge (Anzahl Firmen)
- Profilfoto: wird beim App-Start aus localStorage geladen (ohne Einstellungen zu öffnen)
- Einstellungen: 2-spaltig, Custom Fields zwischen Dashboard-Widgets und Info

## v2.4.58 – 2026-04-06
### Pflege: README.md vollständig nachgepflegt

- Feature 11 (WhatsApp/SMS) als erledigt markiert (~~durchgestrichen~~ ✅)
- Neues Kapitel 15: Microsoft Graph Integration — Berechtigungsübersicht, OAuth-Flow, geplante Features
- Roadmap Kurzfristig: Admin Consent, Mail.Send, Calendars.ReadWrite, Contacts.Read/Write dokumentiert
- Inhaltsverzeichnis auf 23 Kapitel erweitert, Nummerierung durchgängig korrigiert

## v2.4.57 – 2026-04-06
### Bugfix: OAuth prompt=consent statt select_account

- Microsoft übersprang Consent-Dialog (CF Access SSO bereits eingeloggt)
- prompt=select_account → prompt=consent → erzwingt Scope-Bestätigung
- Nach Deploy: /api/calendar/auth aufrufen → Mail.Read + Calendars.Read bestätigen

## v2.4.56 – 2026-04-06
### Bugfix: E-Mail Sync — Access denied → SCOPE vereinheitlicht

- Fehler: "Access is denied" weil OAuth-Token nur Kalender-Scope hatte, kein Mail.Read
- Fix: calendar.ts + mail.ts nutzen jetzt identischen SCOPE
  Calendars.Read Mail.Read Mail.ReadWrite User.Read offline_access
- Nach Deploy: Kalender → Neu anmelden → Token enthält dann alle Scopes
- Danach E-Mail Sync aktivieren klappt ohne Fehler

## v2.4.55 – 2026-04-06
### E-Mail Sync: Mail.ReadWrite in SCOPE + OAuth-Neuautorisierung

- Mail.ReadWrite zu OAuth SCOPE hinzugefügt (Azure AD Berechtigung von Kollege eingerichtet)
- E-Mail Sync aktivieren Button → OAuth neu durchführen → Consent für Mail.ReadWrite erteilen
- Scope: Mail.Read Mail.ReadWrite User.Read offline_access Calendars.Read

## v2.4.54 – 2026-04-06
### Feature 11: WhatsApp & SMS Integration

- 📱 WA + ✉ SMS Buttons neben Mobilnummer im Kontakt-Detail
- Modal: Vorlage auswählen (optional) oder Freitext, Variablen werden befüllt
- WhatsApp: öffnet wa.me Deeplink im Browser/App mit vorausgefülltem Text
- SMS: öffnet sms: URI (iPhone/Android öffnet Nachrichten-App)
- Automatisches Activity-Logging: Checkbox "Als Aktivität speichern" (vorausgewählt)
- Buttons nur sichtbar wenn Mobilnummer beim Kontakt hinterlegt ist

## v2.4.53 – 2026-04-06
### Bugfix: JS-Code nach </html> sichtbar

- if(curDl?.id)loadDealCompetitors(curDl.id) war nach </html> platziert
- Browser renderte Code als sichtbaren Text am Seitenende
- Stray-Code entfernt

## v2.4.52 – 2026-04-06
### Feature: Einstellungen 3-Spalten + Profilfoto

- Einstellungen: 2-Spalten-Grid → 3-Spalten-Grid (1fr 1fr 1fr)
- Custom Fields in Spalte 3 (oben, korrekte Platzierung)
- Mein Profil: Profilfoto hochladen, skalieren (max 200px), in localStorage speichern
- Avatar zeigt im Profil (64px) und in der Sidebar (user-av)
- Foto entfernen Button, Initialen als Fallback

## v2.4.51 – 2026-04-06
### Pflege: README.md vollständig aktualisiert

- Migrations 0014–0021 alle dokumentiert
- API-Routen: /api/quotas, /api/templates, /api/relationships, /api/competitive, /api/custom-fields ergänzt
- Neue Kapitel 11–14: Dokumentenvorlagen, Beziehungs-Graph, Competitive Intel, Custom Fields
- Roadmap: Features 10, 12, 13, 14 als erledigt markiert (~~durchgestrichen~~ ✅)
- Inhaltsverzeichnis auf 22 Kapitel erweitert
- Kapitel-Nummerierung korrigiert (Ziele & Quoten war falsch als Kap. 12)

## v2.4.50 – 2026-04-06
### Feature 14: Custom Fields

- Migration 0021: custom_field_defs + custom_field_values
- API: CRUD /api/custom-fields/defs + /api/custom-fields/values (Upsert)
- Feldtypen: Text, Zahl, Datum, Auswahl, Ja/Nein, URL
- Einstellungen: Custom Fields verwalten (anlegen, löschen)
- Kontakt-Detail: ⚙️ Custom Fields Karte (Spalte 1)
- Firma-Detail: ⚙️ Custom Fields Karte
- Inline-Bearbeitung direkt in der Karte, Speicherung ohne Reload

## v2.4.49 – 2026-04-06
### Feature 13: Competitive Intelligence

- Migration 0020: competitors + deal_competitors Tabellen
- API: GET/POST/DELETE /api/competitive/competitors
- API: GET/POST/PATCH/DELETE /api/competitive/deal
- API: GET /api/competitive/report (Verlustanalyse)
- View: Competitive Intel unter System & Tools
- Deal-Detail: Mitbewerber-Block mit Outcome (gewonnen/verloren/offen)
- Report: Häufigster Gegner + Schwierigster Bereich

## v2.4.48 – 2026-04-06
### Feature 12: Beziehungs-Graph

- Neue Tabelle: relationships (Migration 0019)
- API: GET/POST/DELETE /api/relationships
- Karte "🔗 Beziehungs-Graph" in Kontakt-Detail Spalte 2
- Typen: kennt, Kollege, Partner, Beeinflusst Entscheidung, Berichtet an, Ehemaliger Kollege
- Kontakt & Firma als Beziehungsziel wählbar
- Live-Suche beim Hinzufügen, Notizfeld, Lösch-Button

## v2.4.47 – 2026-04-06
### Layout: Aktivitäts-Verlauf nach Spalte 1 (über Tickets)

- Aktivitäts-Verlauf von Spalte 2 → Spalte 1, über Tickets
- Spalte 1: Kontaktdaten, Aktivitäts-Verlauf, Tickets, Notiz
- Spalte 2: Interessen, Social Media, 360° Timeline, Deals

## v2.4.46 – 2026-04-06
### Bugfix: Marketing Aktionen fehlte in Spalte 3

- cd-marketing-wrap wurde bei Grid-Umbau nicht übernommen
- Marketing Aktionen wieder oben in Spalte 3, DSGVO darunter

## v2.4.45 – 2026-04-06
### Feature: Kontakt-Detail 3 gleiche Spalten + neue Verteilung

- Grid: 1fr 1fr 1fr (dynamisch, gleich breit, passt sich Bildschirmbreite an)
- Spalte 1: Kontaktdaten, Tickets, Notiz
- Spalte 2: Interessen & Lösungen, Social Media, 360° Timeline, Aktivitäts-Verlauf, Deals
- Spalte 3: Marketing Aktionen, Marketing Opt-in (DSGVO)

## v2.4.44 – 2026-04-06
### Feature: Kontakt-Detail 3-spaltiges Grid

- Layout von 2 auf 3 Spalten umgestellt (300px | 1fr | 1.2fr)
- Spalte 1: Kontaktdaten, Tickets, Notiz
- Spalte 2: Interessen & Lösungen, Social Media, Marketing Aktionen, DSGVO
- Spalte 3: 360° Timeline, Aktivitäts-Verlauf, Deals
- Tickets aus rechter Spalte in linke Spalte (über Notiz) verschoben
- Timeline/Verlauf/Deals ganz oben in Spalte 3

## v2.4.43 – 2026-04-06
### Bugfix: Vorlage-Modal kein Hintergrund + Herford→Bielefeld

- .modal hatte transparent Hintergrund → Felder schwebten im Raum
- Fix: .modal-overlay .modal{background:var(--sf);border-radius:10px;box-shadow}
- Live bestätigt: backgroundColor=rgb(255,255,255), borderRadius=10px
- Vorlagen-Variablen ({{firma.name}} etc.) funktionieren für jeden Kontakt/Firma universal

## v2.4.42 – 2026-04-06
### Bugfix: Vorlage-Variablen wurden nicht befüllt

- openCtVorlage/openFiVorlage nutzten _ct/_fi — diese Variablen existieren nicht
- Korrekte globale Variablen sind curCt (Kontakt) und curFi (Firma)
- Fix: curCt?.id und curFi?.id → Firma/Kontaktdaten werden korrekt in Modal geladen
- Live bestätigt: firma_in_modal=Schulzentrum Enger, kt_in_modal=Jörg Bachmann

## v2.4.41 – 2026-04-06
### Bugfix: Vorlage-Modal position:fixed per CSS-Klasse

- cssText mit inset:0 Shorthand wurde vom Browser ignoriert → position:static
- Fix: .modal-overlay CSS direkt im Style-Block mit position:fixed !important
- Live via Chrome MCP bestätigt: Modal zentriert bei top:0

## v2.4.40 – 2026-04-06
### Redesign: Vorlage-Modal sauber und übersichtlich

- Kontext-Felder (Firmenname etc.) standardmäßig versteckt — nur bei Bedarf über "Felder anpassen" einblendbar
- Sauberes 2-Block-Layout: Vorlage wählen → Vorschau → Aktionen
- Betreff nur sichtbar wenn Vorlage einen Betreff hat (E-Mail-Typ)
- Kompakter Footer mit Aktions-Buttons
- Doppeltes Social Media in Kontakt-Detail behoben (v2.4.39)

## v2.4.39 – 2026-04-06
### Bugfix: Doppeltes Social Media in Kontakt-Detail

- Social Media Edit-Form (Inputs) lag außerhalb des cd-edit Containers → immer sichtbar
- Fix: id="cd-edit-social" + display:none, wird in toggleEdit() ein-/ausgeschaltet
- Live via Chrome MCP bestätigt: nur noch 1 Social Media Block sichtbar

## v2.4.38 – 2026-04-06
### Bugfix: Vorlage-Modal nicht sichtbar — position:fixed fehlte

- .modal-overlay hat keine CSS-Klasse in der App → kein position:fixed
- Modal renderte bei top:1482px weit unterhalb des sichtbaren Bereichs
- Fix: Alle dynamisch erstellten Overlays (Templates, Quota) bekommen inline position:fixed
- Gleichzeitig: openCtVorlage/openFiVorlage Wrapper aus v2.4.37 enthalten

## v2.4.37 – 2026-04-06
### Bugfix: Vorlage-Button Kontakt/Firma — ReferenceError

- _ct und _fi sind nicht global deklariert → _ct?.id warf ReferenceError → onclick wurde still abgebrochen
- Fix: openCtVorlage() und openFiVorlage() Wrapper-Funktionen die sicher auf _ct/_fi zugreifen

## v2.4.36 – 2026-04-06
### Bugfix: salesjahr, quotas, templates fehlten im VS-Array

- Alle drei Views wurden nie durch sw() ausgeblendet → blieben nach Aufruf dauerhaft sichtbar
- quotas, salesjahr, templates am Ende des VS-Arrays ergänzt

## v2.4.35 – 2026-04-06
### Feature 10: Dokumentenvorlagen mit Variablen

- Neue Tabelle `templates` (Migration 0018 — manuell in D1 ausführen)
- API: GET/POST/PATCH/DELETE /api/templates
- Neue View "📄 Vorlagen" unter System & Tools — Vorlagen verwalten
- Vorlagen-Typen: Brief, E-Mail, Angebot, Allgemein
- Variable-Picker: 17 Variablen (Firma, Kontakt, Sender, Datum)
- "📄 Vorlage" Button in Firma-Detail und Kontakt-Detail
- "📄 Vorlage einfügen" Button im Aktivität-Formular
- Verwendungs-Modal: Vorschau mit befüllten Variablen, manuelle Überschreibung
- Ausgabe: Text kopieren / In Aktivität einfügen / Drucken & PDF

## v2.4.34 – 2026-04-06
### Bugfix: Seed 2025-Deals funktionierten nicht

- won_at Spalte war im Seed-INSERT — schlägt fehl wenn Migration 0016 nicht ausgeführt
- Fix: won_at aus INSERT entfernt, updated_at = Abschlussdatum (Client-Filter nutzt Fallback)
- 2025-Deals für Axel (376k€ Ertrag) und Henning (120k€) jetzt zuverlässig im Seed

## v2.4.33 – 2026-04-06
### Bugfix: Mein Sales Jahr — Vorjahres-Ansicht korrekt

- /api/quotas/me akzeptiert jetzt ?year=YYYY Parameter
- loadSalesJahr übergibt gewähltes Jahr an quota-Endpoint
- Vorher: beim Wechsel auf 2025 wurde immer 2026-Ziel angezeigt
- Seed enthält 2025-Deals für Axel (376k€) und Henning (120k€)

## v2.4.32 – 2026-04-06
### Seed: Vorjahres-Abschlüsse 2025 für Reporting

- 8 gewonnene Deals für Axel Weichert 2025: 376.000 € Ertrag (Ziel 350.000 € = 107%)
- 5 gewonnene Deals für Henning Brinker 2025: 120.000 € Ertrag (Ziel 120.000 € = 100%)
- won_at korrekt auf 2025-Daten gesetzt → Vorjahres-Reporting funktioniert

## v2.4.31 – 2026-04-06
### Bugfix: Ertragsziele korrekt in DB + Seed

- Migration 0017: bestehende falsche Targets löschen + korrekte Werte einfügen
- Axel Weichert: 400.000 € (2026), 350.000 € (2025)
- Henning Brinker: 160.000 € (2026), 120.000 € (2025)
- ITS gesamt 2026: 1.000.000 € (Axel 400k + Henning 160k + Henri 120k + Hannah 100k + Sandro 80k + Mario 140k)
- Seed: INSERT OR REPLACE statt OR IGNORE für targets → überschreibt falsche Werte
- Migration 0017 in D1-Konsole ausführen (3 Statements einzeln)

## v2.4.30 – 2026-04-06
### Bugfix: Mein Sales Jahr + Ziele & Quoten

- loadSalesJahr: owner_id='ME' war Literal → erst /api/users/me aufrufen, dann Deals filtern
- Ziele & Quoten: "Alle Teams"-Tab versteckt wenn nur 1 Team sichtbar
- "Mein Sales Jahr" jetzt direkt unter Dashboard in der Sidebar
- Seed: Ertragsziele 2026 (Axel 400k, Henning 160k) + 2025 (Axel 350k, Henning 120k) hinterlegt

## v2.4.29 – 2026-04-06
### Feature: Mein Sales Jahr + Dashboard-Widget Fixes

- Neue View "Mein Sales Jahr" (unter Auswertung in der Sidebar)
- KPIs: Umsatz IST, Ertrag IST, Zielerreichung, Pipeline, Abschlüsse, Aktivitäten, Touchpoints, Ø Marge
- Ertragsziel-Fortschrittsbalken mit Restbetrag
- Monatlicher Verlauf: Doppelbalken Umsatz (cyan) + Ertrag (grün)
- Liste der 10 letzten gewonnenen Deals mit Umsatz + Ertrag
- Dashboard-Widget: mehr Padding, Sparkline-Abstand verbessert
- Einstellungen: "Mein Ertragsziel" Widget ein-/ausschaltbar

## v2.4.28 – 2026-04-06
### Bugfix: Ziele & Quoten — Ertrag statt Umsatz + View-Fix

- Ertragsziel = margin_value (Marge) — nicht mehr value (Umsatz)
- Backend: margin_target wird gesetzt und gelesen statt revenue_target
- sw-Hook für 'quotas' fehlte → View lud nie beim Navigieren
- "Alle anzeigen" Link repariert
- Labels: "Umsatzziel" → "Ertragsziel / Marge"

## v2.4.27 – 2026-04-06
### Bugfix: Ziele & Quoten — Sichtbarkeit korrigiert

- Katharina sieht jetzt alle Teams (für Sales-Meetings alle 6 Wochen)
- Leif Krahmüller (Robotik), Ralf Busche (Digitaldruckerei), Claus Dueck (LFP) sehen ihr Team
- SEES_ALL-Liste: Victor, Stefan, Katharina → vollständige Übersicht
- D1: SQL-Statements müssen einzeln ausgeführt werden (D1 unterstützt kein Multi-Statement)

## v2.4.26 – 2026-04-06
### Bugfix: public/CHANGELOG.md wird jetzt aus README.md Kapitel 19 generiert

- public/CHANGELOG.md war bei v2.4.17 stehen geblieben — Changelog-View zeigte veralteten Stand
- Fix: Kapitel 19 der README.md wird bei jedem ZIP-Build automatisch nach public/CHANGELOG.md extrahiert
- Changelog-View im CRM zeigt ab sofort immer den aktuellen Verlauf

## v2.4.25 – 2026-04-06
### Struktur: Changelog in README.md integriert

- CHANGELOG.md entfällt als separate Datei — Changelog lebt jetzt in README.md Kapitel 19
- Konzept angepasst: jede neue Version trägt Eintrag direkt in README.md ein
- Verhindert dass Changelog bei neuen ZIPs verloren geht

## v2.4.24 – 2026-04-06
### Feature: ERP Statusleuchten synchron

- Zentrale setErpStatus() koppelt beide Dots (oben + ERP-Link Panel)
- Test-Button und Seitenstart aktualisieren immer beide gleichzeitig
- ERP-Link Panel prüft Status live beim Öffnen (wenn konfiguriert)

## v2.4.23 – 2026-04-06
### Bugfix: Just.in Dot live ping statt D1-Status

- Dot prüft jetzt live ob Bridge erreichbar ist (nicht mehr gespeicherten Status)
- Nur grün wenn Bridge wirklich antwortet
- Grau wenn nicht konfiguriert oder nicht erreichbar

## v2.4.22 – 2026-04-06
### Bugfix: README aktualisiert

- Kapitel 3: Aufgaben-System dokumentiert
- Kapitel 11: Just.in Dot Statusfarben dokumentiert
- Kapitel 15: erp_config Tabelle + API-Endpoints dokumentiert

## v2.4.21 – 2026-04-06
### Feature: Just.in Dot zeigt echten Verbindungsstatus

- Grau: ERP nicht konfiguriert
- Gelb: konfiguriert, noch nicht getestet
- Grün: letzte Verbindung erfolgreich
- Rot: letzte Verbindung fehlgeschlagen
- Grün nach erfolgreichem Test-Button in ERP-Link

## v2.4.20 – 2026-04-06
### Feature: ERP-Link (JustIn Anbindung)

- Neuer Menüpunkt unter System & Tools: ERP-Link
- Konfigurationsmaske: Tunnel-URL, SQL-Server, Port, DB, User, Passwort
- Sync-Optionen: Kundenstamm, Kontakte, Mitarbeiter, Aufträge, Artikel
- Test-Button prüft Verbindung zur vonbusch-erp-bridge
- Setup-Anleitung direkt in der UI
- D1 Tabelle erp_config (bereits in DB angelegt)
- Backend: /api/erp/config, /api/erp/test, /api/erp/status
- README Kapitel 11: vollständige JustIn-Architektur mit Diagramm
- Bugfix: Pflicht-Check .dpanel{ korrigiert (falsch-positive Dopplung)

## v2.4.19 – 2026-04-06
### Bugfix: Dashboard KPI-Grid repariert

- #v-cf-mssp ohne Block ließ .kg als Nachfahren-Selektor wirken → display:block
- #v-cf-mssp erhält vollständige CSS-Regel, .kg ist jetzt global

## v2.4.18 – 2026-04-06
### Bugfix: Dashboard KPI-Blöcke wieder nebeneinander

- .kg CSS-Klasse war durch dpanel-Fixes überschrieben → display:block statt display:grid
- Dashboard Pipeline-Wert, Firmen/Kontakte, Tickets, MRR wieder in 4-spaltigem Grid

## v2.4.17 – 2026-04-06
### Bugfix: HTML-Strukturfehler behoben

- Fehlendes > bei view-div vor v-tasks: alle Views ab Aufgaben waren in anonymem display:none Container

## v2.4.16 – 2026-04-05
### Bugfix: CSS dpanel doppelt → alle Views ab Aufgaben unsichtbar

- .dpanel{display:none!important} war doppelt in der CSS — hat alle dpanel-Views versteckt
- Exakt ein korrekter .dpanel-Block bleibt, #v-cf-mssp hat eigene Regel

## v2.4.15 – 2026-04-05
### Bugfix: Aufgaben-View + loadMyActivities

- bnavUpdate(v) in loadMyActivities: v war nicht definiert (ReferenceError)
- loadTasks komplett ohne Template-Literals neu geschrieben (sicher)
- productsRouter Doppel-Import/-Route in index.ts entfernt
- tasks in VN-Map eingetragen

## v2.4.13 – 2026-04-05
### Bugfix: Doppelter productsRouter Import → Build-Fehler behoben

- productsRouter war doppelt in index.ts importiert und registriert
- Das hat den TypeScript-Build zum Scheitern gebracht
- Cloudflare hat deshalb immer den alten Worker-Code behalten

## v2.4.12 – 2026-04-05
### Bereinigung: ZIP-Struktur ohne verschachtelte Unterordner

- Identisch zu v2.4.11 aber ohne alten vonbusch-crm-v2.4.8 Unterordner in der ZIP

## v2.4.11 – 2026-04-05
### Bugfix: Aufgaben-View + Deals-View HTML-Fehler

- Fehlendes <div class="dpanel"> vor v-dl (Deals) repariert → Ursache der leeren Aufgaben-View
- Alle View-Tags geprüft und vollständig

## v2.4.10 – 2026-04-05
### Bugfix: Aufgabe anlegen + Badge

- openNewTaskModal war nicht async → + Aufgabe Button hat still versagt
- Badge verschwindet jetzt bei 0 Aufgaben statt '–' zu zeigen

## v2.4.9 – 2026-04-05
### Bugfix: tasks Route vereinfacht (kein JOIN, kein CASE)

- GET /api/tasks: Kein LEFT JOIN mehr, einfache Query — behebt dauerhaftes Hängen
- GET /api/tasks/ping: Neuer Health-Check Endpoint
- Mail/Kalender-Benachrichtigung vorerst deaktiviert (stabiler Betrieb zuerst)

## v2.4.8 – 2026-04-05
### Feature: Aufgaben — nur eigene, Mail, Kalender + Bugfix SQL

- Jeder sieht nur seine eigenen Aufgaben (assigned_to = current user)
- Badge/Klingel zeigt nur eigene offene Aufgaben
- Mail-Benachrichtigung bei Zuweisung via Outlook/Graph API
- Kalender-Termin (Ganztag) beim Zugewiesenen in Outlook
- Aufgaben mit Deadline im CRM-Kalender farbig (gruen/rot/grau)
- Bugfix: NULLS LAST SQL-Syntax durch CASE-Statement ersetzt (D1-Kompatibilitaet)

## v2.4.7 – 2026-04-05
### Feature: Aufgaben-System + Lagerbestand-Warnung

- **Aufgaben-System** (tasks): Neue Tabelle in D1, eigene Route /api/tasks
- **Nav-Punkt „Aufgaben"** unter CRM mit Badge-Zähler (offene Aufgaben)
- **Klingel** oben rechts: Badge + Dropdown mit offenen Aufgaben, anklickbar
- **Aufgaben-View**: Liste mit Offen/Erledigt/Alle Filter, Priorität, Fälligkeit, Verknüpfung
- **Aufgabe erstellen**: Modal mit Titel, Beschreibung, Zugewiesener Person, Priorität, Fälligkeitsdatum
- **Lagerbestand in Produktkarte**: Anzeige wenn Bestand > 0; Button „⚠ Einkauf" wenn Bestand = 0
- **Einkauf-Aufgabe**: Klick auf „⚠ Einkauf" → Aufgabe vorausgefüllt an Michael Burmeister (usr-mb)
- **Bugfix**: Alle 2.312 Import-Produkte ohne UUID haben jetzt IDs → anklickbar
- **Bugfix**: 📦 Emoji statt \u{1F4E6} (war JS-Syntaxfehler)

## v2.4.6 – 2026-04-05
### Bugfix & Feature: Produktkatalog Kategorie-Filter + Quick-Angebot

- **Kategorie-Filter zweistufig:** Haupt-Dropdown (z.B. "Hardware / Ubiquiti") + Sub-Dropdown (z.B. "Switches") — dynamisch aus DB geladen, keine hardcodierten Werte mehr
- **Statistik-Kacheln:** Anzahl Artikel + Lagerbestand pro Kategorie, anklickbar als Direktfilter
- **Quick-Angebot Button** direkt in der Deals-Übersicht (nicht mehr nur in Deal-Detail)
- **Backend:** `category LIKE 'Prefix%'` statt exakter Übereinstimmung → Hauptkategorien zeigen alle Unterkategorien
- **Backend:** `active_only=1` Parameter ergänzt (zusätzlich zu `active`)
- **Farben:** Neue Kategorie-Farben für Ubiquiti, Wortmann, Proxmox, Print-Hersteller
- **Produkt-Formular:** Kategorie als Freitext-Eingabe mit Datalist statt hardcoded Select
- **Bugfix:** Keine 2000+ Produkte-Massenladung beim Öffnen des Katalogs — Hinweis zum Filtern

## v2.4.5 – 2026-04-05
### Feature: Produktkatalog – Kategorie-Statistiken & Lagerbestand
- Neues `stock`-Feld (Lagerbestand) in D1 via ALTER TABLE (bereits ausgeführt)
- `/api/products/stats` Endpoint: Kategorien mit Artikel-Anzahl & Gesamtlagerbestand
- Produktkatalog-Hauptview: scrollbares Statistik-Panel, Kacheln klickbar als Filter
- Tabellenkopf: VK netto, EK, Lager, MwSt, Aktionen
- Produkt-Modal: scrollbar, Löschen-Button, EK-Preis + Lagerbestand-Felder, Header/Footer-Layout
- Klick auf Tabellenzeile öffnet Bearbeitungs-Modal mit allen Produktdaten
- Ohne Kategorie/Suchbegriff: Prompt statt 2000+ Produkte auf einmal laden
- deleteProductMain() mit Bestätigungsdialog
- `/api/products` liefert DB-Kategorien dynamisch (nicht mehr hardcodiert)
- Versionsnummer im Footer auf v2.4.5 korrigiert

---

## v2.4.4 – 2026-04-05
### Fix: Cloudflare Kalkulator Layout (endgültig)
- v-cf-mssp aus .cnt Flex-Flow entfernt
- position:absolute; top:54px; left:0; right:0; bottom:0 relativ zu .main
- .main erhält position:relative
- Kein Flex-Stretch-Problem mehr möglich

---

## v2.4.3 – 2026-04-05
### Fix + UX: Cloudflare Kalkulator
- Layout-Fix: CSS-Regel `#v-cf-mssp.dpanel.show{display:block}` erzwingt Block-Layout (kein flex-column Stretch mehr)
- Marge-Feld in den Header-Bereich integriert (war am rechten Rand kaum sichtbar), Default 30 %
- Menüpunkt umbenannt: „Cloudflare Kalkulator"
- Menüpunkt verschoben: jetzt nach E-Mail Sync (vor Einstellungen)

---

## v2.4.2 – 2026-04-05
### Fix: CF MSSP Kalkulator Layout
- Inhalt wurde durch .cnt flex-column nach unten gedrückt
- Block-Wrapper eingefügt: Kalkulator wird ab sofort korrekt oben dargestellt
- README aktualisiert: Kapitel 4.13 (Produktkatalog), 4.14 (CF MSSP Kalkulator), D1-Migrations, Roadmap

---

## v2.4.1 – 2026-04-05
### Fix: CF MSSP Kalkulator Nav-Eintrag fehlplatziert
- Nav-Eintrag ni-cf-mssp landete nach </html> → SVG ohne Rahmen füllte Dashboard fullscreen
- Korrekt in Sidebar vor ni-mail eingefügt, </html> repariert

---

## v2.4.0 – 2026-04-05
### Neu: Cloudflare MSSP Kalkulator
- Neue View unter System & Tools: CF MSSP Kalkulator
- Live USD/EUR Kurs via frankfurter.app API (mit Fallback)
- ZTNA: Plan (Essentials/Advanced/Premier) + Nutzeranzahl → automatische Staffelerkennung
- Application Security: Traffic TB/Monat → Preisband + Extra-TB-Berechnung
- Marge % global einstellbar, alle Werte sofort neu kalkuliert
- Zusammenfassung: Beide Positionen kombiniert (HEK/VK Monat + Jahr)
- "In Angebot übernehmen": Deal-Picker → öffnet Deal, überträgt Positionen in Angebots-Generator

---

## v2.3.9 – 2026-04-05
### Neu: EK-Preis (Einkaufspreis) im Produktkatalog
- D1: Spalte purchase_price (REAL) zur products-Tabelle hinzugefügt
- Alle 151 Ubiquiti-Produkte: EK = Listenpreis - 10% (automatisch berechnet)
- Produktformular: EK-Preis-Feld mit Auto-Berechnung beim Listenpreis-Ändern
- Produktliste: EK-Preis unter Listenpreis angezeigt
- Backend: INSERT und PATCH übergeben purchase_price korrekt

---

## v2.3.8 – 2026-04-05
### Fix: Doppelter Produktkatalog-Eintrag + doppelte Überschrift
- System & Tools > Produktkatalog (ni-products) entfernt — war alte prod-list View
- Doppelte Überschrift "Produktkatalog" in v-prd View entfernt (ptitle setzt sie bereits)
- Nur noch ein Produktkatalog unter Auswertung

---

## v2.3.7 – 2026-04-05
### Fix: Produktkatalog zeigte "Wird geladen" (doppelte loadProducts Funktion)
- Ursache: Zwei loadProducts() im Script — alte prod-list Version überschrieb neue prd-list
  Daten wurden in versteckte View gerendert, nie sichtbar
- Fix: Alte doppelte loadProducts() (10.358 chars) entfernt
- Jetzt: Exakt eine loadProducts() sucht prd-list → Produktkatalog funktioniert

---

## v2.3.6 – 2026-04-05
### Fix: Produktliste Template-Code als Text + Formular-Layout (Basis: v2.3.5)
- Verschachtelter Backtick in loadProducts() brach gesamtes Script ab
  (Safari: Syntax-Error → kein API-Call, Dashboard komplett leer)
  Fix: String-Konkatenation statt nested Template-Literals
- Produktkatalog-Formular neu strukturiert: 720px, klares Grid-Layout
  Name (2/3) + SKU (1/3) | Beschreibung volle Breite | Preis+MwSt+Aktiv eine Zeile

---

## v2.3.5 – 2026-04-05
### KRITISCH: JS-Code außerhalb des script-Tags (Produktkatalog + weitere Funktionen)
- Ursache: Beim Einfügen der Produktkatalog-Funktionen (loadProducts, showKatalogPicker,
  showDuplikate, _generatePdfBlob) wurde versehentlich NACH dem </script>-Tag eingefügt
  statt davor — Browser renderte den JS-Code als sichtbaren HTML-Text
- Fix: Alle ~10.470 Zeichen verlorenen JS-Code zurück in den script-Block verschoben
- Betroffene Funktionen: loadProducts, loadProductCategories, openNewProduct,
  openEditProduct, saveProduct, deleteProduct, showKatalogPicker, katalogPick,
  showDuplikate, renderMergeModal, mergeCandidateChanged, executeMerge,
  _generatePdfBlob, printProposal, saveProposalToDms

---

## v2.3.4 – 2026-04-05
### Fix: Produktkatalog-Liste zeigte Template-Code als Text
- Ursache: verschachtelte Template-Literals (Backtick im Backtick) im loadProducts()
  Browser bricht das äußere Template-Literal ab, Rest wird als Klartext gerendert
- Fix: inner Template durch String-Konkatenation ersetzt ('+'-Operator)
- Betraf: SKU-Badge, Inaktiv-Badge und alle nachfolgenden Felder in der Produktliste

---

---
*Ältere Einträge (vor v2.4.0) im CHANGELOG.md im Repository.*

## v2.5.4 – 2026-04-07
### Fix: Umgebungs-Umschalter — me statt curUser

- curUser → me (korrekte Variable aus init())
- initEnv() mit 500ms Delay damit me geladen ist
- Umgebungs-Block jetzt sichtbar für Admin/GF

# vonBuschOS Cloud CRM

> 🌍 **Das weltweit erste und einzige Cloud-native CRM, das vollständig ohne Server im globalen Edge-Netzwerk von Cloudflare läuft.**  
> Kein klassisches Hosting. Kein Server zu betreiben. Keine Downtime. Globale Verfügbarkeit in Millisekunden — von jedem Edge-Standort weltweit.
>
> Gebaut auf Cloudflare Workers · D1 · R2 · Hono.js · Microsoft 365

**Version:** v2.7.9 &nbsp;|&nbsp; **Live:** https://crm.vonbusch.app &nbsp;|&nbsp; **Repo:** axelweichert/vonbuschos-cloud-crm
