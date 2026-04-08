# vonBuschOS Cloud CRM

> 🌍 **Das weltweit erste und einzige Cloud-native CRM, das vollständig ohne Server im globalen Edge-Netzwerk von Cloudflare läuft.**  
> Kein klassisches Hosting. Kein Server zu betreiben. Keine Downtime. Globale Verfügbarkeit in Millisekunden — von jedem Edge-Standort weltweit.
>
> Gebaut auf Cloudflare Workers · D1 · R2 · Hono.js · Microsoft 365

**Version:** v2.4.25 &nbsp;|&nbsp; **Live:** https://crm.vonbusch.app &nbsp;|&nbsp; **Repo:** axelweichert/vonbuschos-cloud-crm

---

## Inhaltsverzeichnis

1. [Systemüberblick](#1-systemüberblick)
2. [Architektur](#2-architektur)
3. [CRM-Kernfunktionen](#3-crm-kernfunktionen)
4. [Dokumentenmanagementsystem (DMS)](#4-dokumentenmanagementsystem-dms)
5. [Revisionssicheres Archiv](#5-revisionssicheres-archiv)
6. [SoSS — Sales Offer Self Service](#6-soss--sales-offer-self-service)
7. [Ertrag, Marge & Ziele](#7-ertrag-marge--ziele)
8. [Reports & Auswertung](#8-reports--auswertung)
9. [KI & Automatisierung](#9-ki--automatisierung)
10. [Marketing, Lead Magneten, Webinare & Veranstaltungen](#10-marketing-lead-magneten-webinare--veranstaltungen)
11. [Integrationen](#11-integrationen)
12. [Responsive Design & Mobile](#12-responsive-design--mobile)
13. [Rollen & Berechtigungen](#13-rollen--berechtigungen)
14. [Deployment](#14-deployment)
15. [Infrastruktur & Datenbank](#15-infrastruktur--datenbank)
16. [Team & Mitarbeiter](#16-team--mitarbeiter)
17. [Design & Branding](#17-design--branding)
18. [Offene Punkte & Roadmap](#18-offene-punkte--roadmap)

---

## 1. Systemüberblick

Das vonBuschOS Cloud CRM ist das **weltweit erste und einzige Cloud-native CRM, das vollständig ohne Server im globalen Edge-Netzwerk von Cloudflare läuft**. Es gibt kein vergleichbares System, das diese Architektur konsequent für ein vollwertiges CRM umsetzt.

Das System wurde vollständig maßgeschneidert auf die internen Prozesse der von Busch GmbH entwickelt und läuft ausschließlich auf Cloudflare-Infrastruktur — ohne externe Server, ohne klassisches Hosting, ohne Betriebsaufwand.

**Was "Edge-native" bedeutet:**  
Jede Anfrage wird im nächstgelegenen Cloudflare-Rechenzentrum (300+ weltweit) verarbeitet. Es gibt keinen zentralen Server, der ausfallen könnte. Die Datenbank (D1) läuft auf verteiltem SQLite direkt im Edge. Der Objektspeicher (R2) ist global verfügbar. Der Worker (Hono.js) startet in unter 5ms cold start — klassische Server brauchen Sekunden.

**Kernprinzipien:**
- 🌍 **Edge-native** — Kein Server, kein Hosting, 300+ globale Standorte, < 5ms Cold Start
- 🤖 **KI-gestützt** — Claude Sonnet 4 + GPT-4o: Smart-Protokoll (Diktat → Protokoll), Dokumentenanalyse, Unternehmensprofile
- 🔒 **Revisionssicher** — Rechtssichere Dokumentenarchivierung nach GoBD / §147 AO
- 🔗 **Integriert** — Microsoft 365, JustIn ERP, SalesViewer, Lead Magneten, SoSS
- 👥 **Rollenbasiert** — Granulare Rechtesteuerung von Sales bis GF
- ✅ **Aufgaben-System** — Persönliche Aufgaben mit Deadline, Mail-Benachrichtigung, Kalender-Integration

---

## 2. Architektur

```
Cloudflare Edge Network
─────────────────────────────────────────────────────────────

  Workers (Hono.js)    D1 (SQLite)        R2 Storage
  TypeScript      ◄──  vonbusch-crm       vonbusch-crm-docs
                       vonbusch-soss      vonbusch-crm-archiv
                                          (Bucket Lock aktiv)

  └──────────────────────────────────────────────────────┐
  Cloudflare Access — Azure AD SSO (kein eigenes Auth)    │
  ────────────────────────────────────────────────────────┘

─────────────────────────────────────────────────────────────
        │                    │                    │
   Microsoft 365         JustIn ERP          SoSS + Lead Magneten
  (Graph API, OAuth)     (Sync API)    (soss.vonbusch.app + zt-shield, sec-check)
```

| Komponente | Technologie | Details |
|---|---|---|
| Backend | Cloudflare Workers + Hono.js | TypeScript, Edge Runtime |
| Datenbank CRM | Cloudflare D1 | vonbusch-crm, 7 Migrations |
| Datenbank SoSS | Cloudflare D1 | vonbusch-soss (Sessions, Orders, Credit Checks) |
| Dateispeicher | Cloudflare R2 | 2 Buckets: Arbeit + Archiv (Bucket Lock) |
| Frontend | Vanilla SPA | HTML/CSS/JS, kein Framework, NNG-Font eingebettet |
| Authentifizierung | Cloudflare Access + Azure AD | SSO, kein eigenes Auth |
| KI-Analyse | Claude Sonnet 4 + GPT-4o | Parallel, 30 Tage gecacht |
| Kalender | Microsoft Graph API | OAuth, Auto-Token-Refresh |
| E-Mail | Microsoft Graph Webhooks | + EML Drag & Drop Import |
| ERP | JustIn | Sync via /api/sync/ingest |

---

## 3. CRM-Kernfunktionen

### 3.1 Firmen

Firma ist das **zentrale Objekt** im CRM. Alle anderen Entitäten sind einer Firma zugeordnet.

**Firmen-Detailansicht mit Tabs:**
- **Übersicht** — Stammdaten, Adresse, Kontaktdaten, Notizen, KI-Analyse
- **Kontakte** — Alle Ansprechpartner der Firma
- **Deals** — Pipeline-Übersicht firmenspezifisch
- **Aktivitäten** — Alle Aufgaben, Anrufe, Termine
- **Dokumente** — DMS-Ablage firmenspezifisch
- **Verträge** — Serviceverträge mit MRR-Tracking
- **Tickets** — Support-Anfragen

**Firmenstammdaten:** Name, Adresse, Telefon, Fax, E-Mail, Website, Kundennummer (JustIn ERP-ID), Geschäftsbereich, Status (Prospect/Kunde/Inaktiv)

**Social Media (Firma):** LinkedIn, Facebook, Instagram, X (Twitter), Xing — in der Firmen-Übersicht angezeigt und im Bearbeiten-Formular pflegbar

**Duplikat-Schutz:** Beim Anlegen wird automatisch auf bestehende Firmen/Kontakte mit gleicher E-Mail oder gleichem Namen geprüft.

### 3.2 Kontakte

- Vorname, Nachname, Position, Abteilung
- E-Mail, Telefon, Mobil — alle klickbar (mailto:, tel:)
- **Social Media:** LinkedIn, Facebook, Instagram, X (Twitter), Xing — immer sichtbar, direkt editierbar, Auto-Save beim Verlassen des Felds, klickbarer Link-Button
- DSGVO Opt-in für E-Mail, Telefon, Veranstaltungen, Post, Global Opt-in
- **Marketing-Aktionen** (pro Kontakt, eigene DB-Tabelle `contact_marketing_tags`):
  - Saisonale Aktionen mit aktuellem Jahr: Weihnachtsaktion, Osteraktion (Checkbox)
  - Geschäftsbereich-Infos: ITS, POM, LFP, Robotik, Digitaldruckerei, ECM, eWLAN, Cloudflare
  - Webinare: DMS-Webinar, Cloudflare-Webinar
  - Newsletter: Opt-in / Opt-out Radio-Buttons
- Zuordnung zu Firma + optional zu Deals/Aktivitäten
- Interessen & Lösungen (Tags), Geburtstag (Reminder im Dashboard)

### 3.3 Deal-Pipeline

| Stage | Bedeutung |
|---|---|
| Erstkontakt | Erster Kontakt hergestellt |
| Qualifiziert | Bedarf bestätigt |
| Angebot | Angebot erstellt/versendet |
| Verhandlung | In Verhandlung |
| Gewonnen | Auftrag erhalten |
| Verloren | Deal nicht zustande gekommen |

**Deal-Felder:** Titel, Firma, Kontakt, Bereich, Verantwortlicher, Umsatz, Einkauf/Kosten, Ertrag (auto), Marge % (auto), Wahrscheinlichkeit, Abschlussdatum, Notizen

**Auto-Won-Deal:** Upload einer Auftragsbestätigung im DMS oder SoSS-Bestellung erzeugt automatisch einen gewonnenen Deal.

### 3.4 Aktivitäten

**18 Aufgabentypen:**

| Kategorie | Typen |
|---|---|
| Kommunikation | Anruf eingehend/ausgehend, Videocall, E-Mail, Brief |
| Vertrieb | Angebot, Lead, Besuch intern/extern, Wiedervorlage |
| Intern | Notiz, Auswertung, Bonitätsanfrage, Auslaufende Verträge |
| Events | Veranstaltung, Kongress, HXNWRK Lead |
| After Sales | AfterSales |

**Eigenschaften:** Priorität (Hoch/Mittel/Niedrig), Dauer in Minuten, Fälligkeitsdatum, Teilnehmer, Folgeaktivität (auto-anlegen), Mitarbeiternummern sichtbar

**Dashboard-Widget „Meine Aktivitäten":** Heute / Überfällig / Diese Woche / Erledigt — alle mit farbigen Zahl-Badges

### 3.4.1 🎙️ KI Smart-Protokoll

Der wichtigste KI-Feature für den Außendienst. Nach einem Kundentermin einfach Stichpunkte per iPhone-Diktat einsprechen und die KI erstellt daraus ein vollständiges Gesprächsprotokoll.

**Flow:**
1. Neue Aktivität anlegen, Firma + Typ wählen
2. Mikrofon-Taste auf der iPhone-Tastatur antippen
3. Frei einsprechen: _"War bei Nielsen, neuer Server-Ausbau, Budget freigegeben, Axel macht Angebot, Termin Mitte Mai..."_
4. **✦ Smart-Protokoll generieren** klicken (pulsierender blauer Knopf)
5. Claude Sonnet 4 strukturiert daraus:

```
**Termin:** Besuch extern, 4. April 2026
**Teilnehmer:** Nielsen Design GmbH

**Besprochene Themen:**
- Server-Ausbau (Budget freigegeben)

**Ergebnisse / Vereinbarungen:**
- Budget genehmigt

**Nächste Schritte:**
- Axel: Angebot erstellen bis Mitte Mai
```

- Funktioniert identisch auf iPhone Safari und Desktop
- Button-Animation: pulsierender Blau-Glow (`@keyframes ai-pulse`)
- Backend: `POST /api/activities/smart-protokoll` → Claude Sonnet 4 (1024 Tokens)
- KI bekommt Kontext: Aktivitäts-Typ + Firmenname für passende Formulierung

### 3.7 360° Kontakt-Timeline

Chronologische Gesamtansicht aller Berührungspunkte eines Kontakts — direkt im Kontakt-Detail.

**Enthält:**
- Alle Aktivitäten (Anrufe, Mails, Besuche, Notizen)
- Deals der Firma (mit Stage und Wert)
- Dokumente der Firma (DMS)
- Marketing-Aktionen (Webinare, Events, Newsletter)

**Filter:** Alle · Aktivitäten · Deals · Dokumente · Events

Gruppiert nach Monat, chronologisch (neueste zuerst). Farbcodierte Icons pro Touchpoint-Typ.

### 3.8 Lead Score

Jeder Kontakt bekommt automatisch einen Score (0–100) basierend auf:

| Kriterium | Punkte |
|---|---|
| Newsletter Opt-in | 20 |
| DSGVO E-Mail/Telefon | 5+5 |
| Entscheider / Mitentscheider | 15 / 8 |
| Vollständigkeit (E-Mail, Telefon, Position, Tags) | bis 8 |
| Social Media Profile | bis 5 |
| Firma ist Kunde / Prospect | 15 / 8 |

Angezeigt als farbiger Badge im Kontakt-Kopf: 🟢 70+ · 🟡 40-69 · 🔴 <40

### 3.5 Serviceverträge (MRR)

- Vertragsdetails: Produkt, Bereich, Laufzeit, Start/Ende
- Monatlicher Wert (MRR) + jährlicher Wert (ARR)
- Dashboard-KPI: Gesamter MRR über alle aktiven Verträge

### 3.6 Globale Live-Suche

- Desktop: Suchfeld oben rechts — Mobile: Blur-Overlay via Lupen-Icon
- Durchsucht: Firmen, Kontakte, Deals, Aktivitäten, Tickets
- Ergebnisse ab 2 Zeichen, direkte Navigation in Detailansicht

---

## 4. Dokumentenmanagementsystem (DMS)

### 4.1 Upload & Verarbeitung

**Unterstützte Formate:** PDF, DOCX, XLSX, PPTX, EML, TXT, JPEG, PNG

**Upload-Flow:**
1. Drag & Drop oder Klick auf Upload-Zone
2. KI-Analyse startet automatisch (Claude Sonnet 4 + GPT-4o parallel)
3. Extrahierte Felder werden zur Prüfung angezeigt
4. Nutzer bestätigt/korrigiert → Speichern in R2 + D1

### 4.2 KI-Extraktion

| Feld | Beschreibung |
|---|---|
| doc_type | Dokumenttyp (Rechnung, AB, Angebot, Vertrag…) |
| doc_date | Dokumentdatum |
| subject | Betreff / Titel |
| summary | Kurzzusammenfassung |
| company_name/street/zip/city/phone | Firmendaten für Auto-Zuordnung |
| contact_name/email | Ansprechpartner |
| tags | Automatische Schlagwörter |
| fin_data | Finanzdaten als JSON (monthlyRate, contractMonths, totalValue, financingTypes) |

### 4.3 DocViewer

- **PDF** — Inline-Vorschau direkt im Browser
- **Bilder** — Inline-Vorschau (JPEG, PNG)
- **DOCX** — Textdarstellung via mammoth.js
- **XLSX** — Tabellenansicht via SheetJS

### 4.4 Volltextsuche

Indexierter Volltext in D1 (`fulltext_idx`), integriert in globale Suche.

---

### 4.11 Workflows & Sequenzen

Automatisierungen unter Auswertung → Workflows.

**Trigger:** Deal Stage-Wechsel · Kein Kontakt seit X Tagen (Cron alle 15 Min.) · Neuer Deal · Neuer Kontakt · Manuell

**Aktionen:** Aktivität anlegen · Deal-Stage setzen · Zuständigen setzen · Tag hinzufügen

**Sequenzen:** Mehrere Schritte mit Zeitverzögerung (sofort + nach 3 Tagen + nach 7 Tagen)

**4 vorgefertigte Workflows:** Deal → Angebot (Wiedervorlage), Kein Kontakt 30 Tage, Neuer Prospect 3-Schritt-Sequenz, Gewonnener Deal AfterSales

**Log:** Jede Ausführung protokolliert mit Entität, Status, Schritten, Timestamp


### 4.12 Angebots-Generator

Button **📄 Angebot erstellen** direkt im Deal-Detail. Erzeugt ein vollständiges, druckfertiges Angebot mit vonBusch CI.

**Eingaben:**
- Empfänger (Firma/Kontakt) aus Deal automatisch befüllt
- Angebotsnummer im JustIn-Format: `AN[6-stellig]v1` (z. B. AN436838v1), Gültigkeitsdatum 30 Tage
- Absender vorausgefüllt: Axel Weichert, Senior Business Consultant, Durchwahl + Mobil + E-Mail
- Positionen frei: Bezeichnung, Menge, Einheit, Einzelpreis, MwSt (0 / 7 / 19 %) — Summen live berechnet

**KI-Anschreiben:**
- **✦ KI-Text:** Claude Sonnet 4 generiert Anschreiben + Schlusstext passend zu Kunde und Deal-Titel
- Leitet Anrede (Herr/Frau) automatisch aus dem Vornamen ab

**PDF-Ausgabe (A4, vonBusch CI):**
- Dunkler Header (`#0d1a14`) mit weißem vonBusch-Logo (SVG inline), Angebotsnummer + Datum rechts
- Akzentlinie Verlauf `#0d1a14 → #00C2FF → #0066CC`
- Positionstabelle mit zebra-Striping, dunkler Tabellenkopf
- Summenblock (Netto / MwSt / Brutto) in vonBusch-Akzentfarbe
- Unterschriftsblock + Handelsregisterfußzeile
- Seitenumbruch-Schutz: `break-inside: avoid` auf Tabelle, Summenblock und Signatur; `@page margin: 14mm`

**🖨️ Drucken / PDF:** PDF direkt herunterladen — kein Druckdialog, kein Browser-Header/Footer.

**💾 Im DMS speichern:** PDF wird automatisch als `application/pdf` ins DMS hochgeladen — Typ `Angebot`, Firma, Gesamtbetrag und Angebotsnummer werden automatisch gesetzt. Nach Upload: Wechsel zur Dokumente-Ansicht.

**PDF-Generierung (zweistufig):** 1) Cloudflare Browser Rendering REST API → text-selektierbare PDF (benötigt Secrets `CF_ACCOUNT_ID` + `CF_BR_TOKEN`). 2) Automatischer Fallback auf jsPDF + html2canvas wenn CF-Fehler.

### 4.13 Produkt-/Leistungskatalog

Verwaltet unter **System & Tools → Produktkatalog**. Zentrale Datenbank aller verkaufbaren Produkte und Dienstleistungen.

**Felder:** Name, Beschreibung, Kategorie, Einheit, Listenpreis (VK), **EK-Preis** (purchase_price), MwSt-Satz, SKU, aktiv/inaktiv.

**EK-Preis / Margenberechnung:** Auto-Kalkulation aus Listenpreis – Marge %. Wird im Angebots-Generator zur Margenkalkulation genutzt.

**Vorgeladene Produktdaten (167 Produkte in D1):**

| Hersteller | Produkte | SKU-Präfix | EK-Kalkulation |
|---|---|---|---|
| Ubiquiti | 151 | UI-* | VK − 10 % |
| Proxmox | 16 | PMX-* | VK − 15 % |

Proxmox-Produkte: PVE, PBS, PMG je Community/Basic/Standard/Premium × 1+2 CPU-Sockets (Preise: proxmox.com verifiziert).

**Angebots-Generator-Integration:** 📦-Button öffnet Katalog-Picker → gewähltes Produkt wird als Angebotsposition mit Preis und MwSt übernommen.

**Kategorie-Struktur (v2.4.18):** Dreistufige Hierarchie `Hauptkategorie / Hersteller / Produktlinie` z.B. `Hardware / Ubiquiti / Switches`. Zweistufiger Filter im Produktkatalog: Haupt-Dropdown → Sub-Dropdown, dynamisch aus DB geladen. Statistik-Kacheln zeigen Artikelanzahl + Lagerbestand pro Kategorie.

**Vorgeladene Produktdaten in D1 (2.479 Produkte):**

| Kategorie | Produkte |
|---|---|
| Hardware / Ubiquiti / Gateways | 14 |
| Hardware / Ubiquiti / Switches | 40 |
| Hardware / Ubiquiti / Access Points | 25 |
| Hardware / Ubiquiti / Kameras | 35 |
| Hardware / Ubiquiti / Access Control | 18 |
| Hardware / Ubiquiti / Infrastruktur | 12 |
| Hardware / Ubiquiti / Connect | 7 |
| Hardware / Wortmann / TERRA Server | 51 |
| Hardware / Wortmann / TERRA Notebooks | 102 |
| Hardware / Wortmann / TERRA PCs | 28 |
| Hardware / Wortmann / TERRA Storage | 7 |
| Hardware / Wortmann / TERRA LCD | 19 |
| Software / Proxmox | 16 |
| Print / KonicaMinolta | 937 |
| Print / Canon | 337 |
| Print / Canon LFP | 47 |
| Print / Lexmark | 689 |
| DocuWare, JobRouter, NAS/Speicher | 87 |

### 4.14 CF MSSP Kalkulator

Erreichbar unter **System & Tools → CF MSSP Kalkulator**. Ermöglicht die sekundenschnelle Kalkulation von Cloudflare MSSP-Angeboten mit live USD/EUR-Kurs.

**Komponenten:**

| Modul | Beschreibung |
|---|---|
| **ZTNA** | Plan (Essentials / Advanced / Premier) + Nutzeranzahl → automatische Staffelpreisband-Erkennung (5 Staffeln) |
| **Application Security** | Traffic TB/Monat → Preisband + Extra-TB über 5 TB |
| **Marge %** | Global einstellbar — wirkt auf alle Berechnungen |
| **USD/EUR-Kurs** | Live via `frankfurter.app`, Fallback 0.9200 |

**Zusammenfassung:** Tabellarische Übersicht HEK / VK EUR pro Monat / VK EUR pro Jahr.

**Angebots-Integration:** Button „In Angebot übernehmen" → Deal-Picker → öffnet Angebots-Generator mit MSSP-Positionen vorbelegt (inkl. USD/EUR-Kurs im Positionstext).


## 5. 🔒 Revisionssicheres Archiv

Das vonBusch CRM verfügt über ein **zweistufiges Dokumentenspeichersystem**: einen normalen, editierbaren Arbeitsspeicher und ein unveränderliches, rechtssicheres Langzeitarchiv.

### 5.1 Warum Revisionssicherheit?

| Gesetz / Norm | Anforderung | Relevante Dokumente |
|---|---|---|
| **GoBD** | Unveränderliche, nachvollziehbare Ablage | Belege, Buchungsunterlagen |
| **§ 147 AO** (Abgabenordnung) | 10 Jahre Aufbewahrungspflicht | Rechnungen, Auftragsbestätigungen |
| **§ 257 HGB** | 6–10 Jahre Handelskorrespondenz | Verträge, Angebote, Lieferscheine |
| **DSGVO** | Nachweispflicht für Verarbeitungen | Einwilligungen, Protokolle |
| **NIS-2** | Nachvollziehbare Sicherheitsdokumentation | IT-Sicherheitsberichte |
| **ISO 27001** | Lückenlose Auditierbarkeit | Alle sicherheitsrelevanten Dokumente |

### 5.2 Technische Umsetzung — Cloudflare R2 Bucket Lock

| Eigenschaft | Konfiguration |
|---|---|
| Bucket-Name | `vonbusch-crm-archiv` |
| Lock-Regel | Revisionssichere-Ablage |
| Gültigkeitsdauer | **Unbestimmte Dauer (Indefinitely)** |
| Wirkung | Kein Objekt kann gelöscht oder überschrieben werden |
| Ausnahme | Nur der gesamte Bucket kann als Ganzes geleert werden |

### 5.3 Zwei-Bucket-Architektur

```
1. Normaler Upload
      ──►  R2: vonbusch-crm-docs
           Bearbeitbar / Löschbar / Durchsuchbar

2. Manuelles Archivieren (DMS-Klick) oder SoSS-Bestellung
      ──►  R2: vonbusch-crm-archiv
           Bucket Lock: Indefinitely — NICHT löschbar
```

### 5.4 Archivierte Inhalte

| Inhalt | Pfad im Archiv |
|---|---|
| Manuell archivierte DMS-Dokumente | `docs/{companyId}/{YYYY}/{MM}/{docId}.{ext}` |
| SoSS-Bestelldokumente (PDF) | `bestellungen/{YYYY}/{MM}/{orderId}-bestellung.pdf` |
| SoSS-Unterschriften (PNG) | `signatures/{YYYY}/{MM}/{orderId}-signature.png` |

---

## 6. SoSS — Sales Offer Self Service

**URL:** https://soss.vonbusch.app &nbsp;|&nbsp; **Repo:** axelweichert/vonbusch-soss &nbsp;|&nbsp; **Aktuelle Version v2.4.24

SoSS ist ein separater Cloudflare Worker, der Kunden ermöglicht, Angebote online zu sehen, eine Finanzierungsart zu wählen und verbindlich zu beauftragen — ohne CRM-Zugang oder persönlichen Kontakt.

### 6.1 Login & Authentifizierung

- Login via **Kundennummer + Angebotsnummer** (kein Passwort)
- Session-Cookie (48h gültig, HttpOnly, Secure)
- Kein Cloudflare Access — öffentlich erreichbar für Kunden

### 6.2 Angebots-Ansicht

- Übersicht: Firmendaten, Angebotsinhalt, KI-Summary, Tags
- PDF-Einbettung: Originales Angebots-PDF inline im Browser
- Finanzierungsoptionen kommen direkt aus `fin_data` JSON-Feld in D1

### 6.3 Finanzierungsauswahl

| Karte | Zeigt | Bedingung |
|---|---|---|
| Kauf | Kaufpreis (netto) | Nur wenn `totalValue` in fin_data |
| Finanzierung | Monatliche Rate + Laufzeit + Abrechnungsturnus | Nur wenn `monthlyRate` in fin_data |

### 6.4 Servicevertrag

- Wenn im Angebot enthalten: Checkbox vorausgewählt, Haken = mitbeauftragen
- Wenn nicht im Angebot: Opt-in Checkbox „Servicevertrag hinzufügen?" — Haken = Interesse wird im CRM vermerkt

### 6.5 Digitale Unterschrift & Auftragserteilung

1. Unterschrift via Canvas (Maus oder Touch)
2. Klick „Auftrag verbindlich erteilen"
3. Worker führt aus:
   - Unterschrift als PNG → `vonbusch-crm-archiv`
   - **Bestelldokument als PDF** generiert (pdf-lib) → `vonbusch-crm-archiv`
   - Eintrag in `soss_orders` (SOSS D1)
   - Won-Deal in CRM D1
   - Aktivität „Auftrag erteilt" + „Bonitätsanfrage" in CRM D1
   - Dokument `doc_type=Bestellung` in CRM D1 registriert
4. Bestätigungsseite mit Link zum Bestelldokument (PDF)

### 6.6 Bestelldokument (PDF)

Das Bestelldokument ist ein **A4-PDF** mit vonBusch-Branding:

| Abschnitt | Inhalt |
|---|---|
| Logo + Header | vonBusch Logo (PNG), Titel „BESTELLUNG", Angebotsnr., Datum, Ref-ID |
| Auftraggeber | Firma, Adresse, Ansprechpartner, E-Mail, Kundennummer |
| Auftragsdetails | Angebotsnr., Finanzierungsart, Rate/Laufzeit/Turnus, Servicevertrag |
| Unterschrift | Eingebettetes PNG-Bild der digitalen Unterschrift, Datum, IP-Adresse |
| Stempel | „✓ Verbindliche Beauftragung" |
| Rechtlicher Hinweis | GoBD, §147 AO, AGB-Hinweis |
| Footer | Adresse von Busch GmbH, Dokument-ID |

### 6.7 SoSS-Aufträge im CRM

Unter **„SoSS Aufträge"** in der CRM-Navigation:
- Liste aller eingegangenen Bestellungen mit Status-Badges
- Detail-Modal: Kundendaten, Finanzierung, Rate, Servicevertrag, Unterschriftsdatum, IP
- **„Bestellung ansehen"** — öffnet archivierten Bestellung-PDF direkt über CRM-Endpoint
- **„Deal öffnen"** — navigiert zum automatisch erzeugten Won-Deal
- **„Bonitätsprüfung"** — öffnet Bonitätsanfrage-Aktivität

### 6.8 fin_data — Finanzdaten für SoSS

Das Feld `fin_data` (JSON, Spalte in `documents`-Tabelle) enthält die Finanzdaten eines Angebots:

```json
{
  "monthlyRate": 4314.69,
  "totalValue": null,
  "contractMonths": 84,
  "billingCycle": "vierteljährlich",
  "financingTypes": ["miete"],
  "hasServiceContract": false
}
```

Muss beim Angebots-Upload im CRM befüllt werden. Kann direkt in D1 gesetzt werden.

---

## 7. Ertrag, Marge & Ziele

### 7.1 Deal-Marge

| Feld | Berechnung |
|---|---|
| value | Umsatz (Eingabe) |
| cost_value | Einkauf/Kosten (Eingabe) |
| margin_value | value − cost_value (auto) |
| margin_percent | margin_value / value × 100 (auto) |

### 7.2 Ziele (Targets)

Monatliche Umsatz- und Ertrags-Ziele pro Mitarbeiter und Bereich:

- Einstellbar über Einstellungen > Ziele (Admin)
- Fortschrittsanzeige in Reports: IST vs. SOLL

---

## 8. Reports & Auswertung

### 8.1 Reports

Umsatz, Aktivitäten, Deals nach Zeitraum (Woche / Monat / Quartal / Jahr / Gesamt). Aufgeteilt nach Mitarbeiter und Geschäftsbereich.

### 8.2 🔮 Pipeline-Forecasting

Eigener Tab im Reports-Bereich — gewichtete Pipeline-Prognose.

**KPI-Karten:**
- Pipeline gesamt (alle offenen Deals)
- Gewichteter Forecast (Deal-Wert × Wahrscheinlichkeit)
- Q-Forecast (nur Deals mit Abschluss im laufenden Quartal)
- Anzahl offene Deals

**Wahrscheinlichkeits-Verteilung:**
- 🟢 Heiß (>75%) — Balken mit Deal-Wert + gewichtetem Anteil
- 🟡 Warm (50–75%)
- 🔴 Kalt (<50%)

**Top Deals im Fokus:** Die wichtigsten Deals des laufenden Quartals, sortiert nach erwartetem Ertrag (Wert × Wahrscheinlichkeit).



| Report | Inhalt |
|---|---|
| Umsatz-Report | Monatlich / Quartalsweise / Jährlich, nach Bereich und MA |
| Ertrags-Report | Marge in € und % nach Bereich und MA |
| Pipeline-Report | Deal-Status, Conversion Rates, Abschlusswahrscheinlichkeiten |
| Aktivitäten-Report | Anzahl nach Typ, MA und Zeitraum |
| Vertrags-Report | MRR, ARR, auslaufende Verträge |
| SoSS-Report | Eingehende Bestellungen, Finanzierungsarten, Volumen |

---

## 9. KI & Automatisierung

Das CRM nutzt **Claude Sonnet 4** (Anthropic) und **GPT-4o** (OpenAI) für vier verschiedene KI-Einsatzbereiche.

### 9.0 Übersicht KI-Features

| Feature | Modell | Endpoint | Trigger |
|---|---|---|---|
| 🎙️ Smart-Protokoll | Claude Sonnet 4 | POST /api/activities/smart-protokoll | Manuell (Button) |
| ✉️ Webinar-Einladungsmail | Claude Sonnet 4 | POST /api/webinars/:id/generate-email | Manuell (Button) |
| 🏢 Unternehmensprofile | Claude S4 + GPT-4o | GET /api/companies/:id/ai-analysis | Manuell/Cache |
| 📄 Dokumentenanalyse | Claude S4 + GPT-4o | POST /api/documents/analyze | Automatisch beim Upload |



### 9.1 🎙️ Smart-Protokoll — Diktat → strukturiertes Gesprächsprotokoll

**Das Highlight für den Außendienst.** Nach einem Kundentermin einfach Stichpunkte einsprechen — die KI macht daraus ein professionelles Gesprächsprotokoll.

**So funktioniert es:**

```
1. Neue Aktivität anlegen (Typ: Besuch extern, Anruf, etc.)
2. Firma auswählen
3. In "Text / Notiz" tippen → Mikrofon auf iPhone-Tastatur antippen
4. Frei sprechen: "War bei Nielsen, neuer Server-Ausbau, Budget freigegeben,
   Axel macht Angebot, Termin Mitte Mai..."
5. ✦ Smart-Protokoll generieren klicken (pulsiert blau)
6. Claude strukturiert daraus automatisch ein fertiges Protokoll
```

**Ausgabe-Format:**

```
**Termin:** Besuch extern, 4. April 2026
**Teilnehmer:** Nielsen Design GmbH

**Besprochene Themen:**
- Server-Ausbau (Budget freigegeben)

**Ergebnisse / Vereinbarungen:**
- Budget für Server-Ausbau genehmigt

**Nächste Schritte:**
- Axel Weichert: Angebot erstellen
- Folgetermin Mitte Mai

**Notizen:**
- Entscheider war persönlich anwesend
```

**Technisch:**
- Button mit pulsierendem blauen Glow-Effekt (`@keyframes ai-pulse`)
- Funktioniert auf iPhone Safari (Diktat) und Desktop
- Backend: `POST /api/activities/smart-protokoll` → Claude Sonnet 4
- KI bekommt Kontext: Aktivitäts-Typ + Firmenname → passt Tonalität an
- Kein extra Login, keine App — direkt im CRM-Browser

---

### 9.2 Dokumentenanalyse (DMS-Upload)

- **Claude Sonnet 4** und **GPT-4o** werden parallel aufgerufen
- Ergebnis wird 30 Tage in D1 gecacht (`ai_analysis_cache`, `ai_analysis_at`)
- Extrahiert: Dokumenttyp, Datum, Firma, Kontakt, Tags, Finanzdaten

### 9.3 Unternehmensprofile (KI-Analyse Firmen)

Vollständiges KI-Firmenprofil mit:

| Feld | Inhalt |
|---|---|
| kurzprofil | 2–3 Sätze Firmenbeschreibung |
| mitarbeiter | Mitarbeiterzahl |
| umsatz_verlauf | 5-Jahres-Umsatzverlauf |
| marktposition | Marktstellung und Wettbewerbsumfeld |
| it_reifegrad | IT-Modernisierungsgrad |
| vertriebschancen | Konkrete Chancen für von Busch |
| risiken | Risikofaktoren |
| empfehlung | Strategische Handlungsempfehlung |

---

## 10. Marketing, Lead Magneten & Webinare

### 10.1 Lead Magneten

Öffentliche Landing Pages mit Formular, die Interessenten direkt ins CRM eintragen.

| Lead Magnet | Status | Zweck |
|---|---|---|
| Cloudflare MSSP | Aktiv | Cloudflare Enterprise-Interessenten |
| Security Check | Aktiv | IT-Security Analyse-Interessenten |
| DMS | Demnächst | Dokumentenmanagement-Interessenten |
| Robotik | Demnächst | Robotik-Lösungen |

Jeder Lead Magnet hat eine eigene D1-Datenbank und Landing Page. Neue Einträge erscheinen sofort im CRM unter Marketing → Lead Magneten.

### 10.2 Webinare (vollständiges Modul)

Das Webinar-Modul deckt den kompletten Lebenszyklus eines Webinars ab — von der Planung über die Einladung bis zum Nachhalten der Teilnahme.

#### Status-Workflow

```
Geplant → Einladungen versendet → Live → Abgeschlossen
                                        → Abgesagt
```

#### Webinar-Verwaltung

**Felder:** Titel, Thema (Cloudflare / DMS / IT-Infrastruktur / Security / Robotik / Sonstiges), Datum & Uhrzeit, Dauer (Minuten), Teaser (für E-Mail-Vorschau), Beschreibung, GoToWebinar-ID, Registrierungslink, max. Teilnehmer, E-Mail-Betreff

#### Teilnehmer-Tracking

| Status | Bedeutung |
|---|---|
| Eingeladen | E-Mail wurde rausgeschickt, keine Reaktion |
| Registriert ✓ | Hat sich über GoToWebinar angemeldet |
| Teilgenommen ✓ | War beim Webinar dabei |
| Nicht erschienen | War registriert, aber kein Show |
| Abgesagt | Hat explizit abgesagt |

Statusänderungen direkt per Dropdown im Teilnehmer-Tab. Statistiken (Eingeladen/Registriert/Teilgenommen/Nicht erschienen) als KPI-Karten oben im Webinar-Detail.

#### KI-Einladungsmail

Per Klick generiert Claude Sonnet 4 eine vollständige Webinar-Einladungsmail:

- Subject, Preheader, Headline, Intro-Text
- 3 Bullet Points (Themen/Mehrwert)
- CTA-Button-Text
- Abschluss-Satz
- Vollständiges responsives HTML im vonBusch-Stil

Das HTML kann direkt in **rapidmail** eingefügt oder als Browser-Vorschau geöffnet werden.

#### Bulk-Einladung

Kontakte direkt aus dem Webinar einladen:
1. Klick auf „+ Einladen"
2. Kontakt oder Firma suchen (Echtzeit-Suche)
3. Beliebig viele Kontakte ankreuzen
4. Einladen → Status wird auf „Eingeladen" gesetzt

#### Vorhandene Webinare

| Titel | Thema | Datum | Status |
|---|---|---|---|
| Zero Trust ist besser mit Cloudflare | Cloudflare | 21.05.2025 | Abgeschlossen |
| Digitales Dokumentenmanagement – die kleinen Dinge | DMS | 28.10.2025 | Abgeschlossen |
| Digitale Personalakte – ab 2027 Pflicht | DMS | 27.03.2026 | Abgeschlossen |

#### GoToWebinar-Integration

GoToWebinar-ID und Registrierungslink sind hinterlegbar. Vollständige API-Sync (Registranten automatisch importieren) folgt sobald der GoToWebinar API-Key vorliegt.

| Lead Magnet | URL | D1-Binding |
|---|---|---|
| zt-shield (MSSP-Tool) | zt-shield.vonbusch.digital | ZT_SHIELD_DB |
| Security Check | sec-check.vonbusch.digital | SEC_CHECK_DB |

Lead-Formular-Ausfüllungen landen automatisch im CRM als Unternehmen + Aktivität.

---


### 10.3 Veranstaltungen (vollständiges Modul)

Alle von Busch Kundenevents werden über das Veranstaltungsmodul geplant, eingeladen, nachverfolgt und ausgewertet.

#### Event-Formate

| Format | Icon | Beschreibung | Größe | Dauer |
|---|---|---|---|---|
| NXT | 🏆 | Große Jahreskonferenz, alle 2 Jahre | 100+ Teilnehmer | 1 Tag |
| Exklusives Event | 🤝 | Partner-Event mit Abendessen | ~20 Kunden | 5 Std. |
| Business Bytes | ☕ | Frühstück/Workshop, kompakt | ~10 Entscheider | 2 Std. |
| Sonstiges | 📅 | Flexibel | beliebig | beliebig |

#### Status-Workflow

```
Geplant → Einladungen versendet → Teilnehmer bestätigt → Abgeschlossen
                                                         → Abgesagt
```

#### Teilnehmer-Lebenszyklus

| Status | Bedeutung |
|---|---|
| Kandidat | KI hat ihn empfohlen oder manuell vorgemerkt |
| Eingeladen | Einladung wurde verschickt |
| Zugesagt ✓ | Hat zugesagt (telefonisch/per Mail) |
| Teilgenommen ✓ | War beim Event dabei |
| Nicht erschienen | War zugesagt, ist nicht gekommen |
| Abgesagt | Hat explizit abgesagt |

#### KI-Kontakt-Selektion

Claude analysiert alle Kontakte und wählt die passendsten für das jeweilige Event aus:
- Passung zum Thema (Interessen, Tags, Branche)
- Kundenbeziehung (Kunden vor Prospects)
- Aktualität (wann war letzter Kontakt)
- Formatpassung (business_bytes → max. 12 Entscheider, NXT → breite Mischung)

Empfehlung erscheint mit Begründung → bestätigen → direkt als Kandidaten in die Liste

#### Nachfass-Tracking pro Kontakt

Direkt in der Teilnehmer-Liste:
- **Nachtelefonat**-Checkbox (✅ wenn erledigt, 📞 wenn ausstehend)
- **Lead entstanden**-Haken (⭐ markiert den Kontakt)
- **Status-Dropdown** (immer aktuell, direkt änderbar)
- **Ergebnis-Notiz** zum Nachtelefonat

#### KI-Einladungsmail

Wie beim Webinar-Modul: Claude Sonnet 4 generiert vollständige HTML-Mail im vonBusch-Stil:
- Subject, Preheader, Highlights (3 Bullet Points)
- Agenda-Text, CTA-Button
- Vollständiges responsives HTML → HTML kopieren → rapidmail

#### Feedback-Fragebogen

Nach der Veranstaltung:
1. Teilnehmer-Status auf „Teilgenommen" setzen
2. „Feedback-Links erstellen" klicken
3. Jeder Teilnehmer erhält einen **persönlichen Token-Link**
4. Link per E-Mail versenden (Text wird generiert)
5. Teilnehmer füllt Fragebogen aus (ohne Login):
   - Gesamtzufriedenheit ⭐⭐⭐⭐⭐
   - Inhalte / Vorträge ⭐⭐⭐⭐⭐
   - Organisation ⭐⭐⭐⭐⭐
   - Würde Folgeevent empfehlen? Ja/Nein
   - Welche Themen interessieren dich künftig?
   - Nächste Schritte / Wünsche (Freitext)
   - Kommentare (Freitext)
6. **Feedback-Auswertung** im CRM: Durchschnittswerte, Empfehlungsquote, alle Kommentare

#### Nachlese

Freitextfeld direkt im Event-Detail für den Veranstaltungsbericht:
- Key-Takeaways, Impressionen, Lessons Learned
- Überblick entstandene Leads, Follow-up-Maßnahmen

#### Bestehende Veranstaltungen

| Titel | Format | Datum | Status |
|---|---|---|---|
| NXT2025 | 🏆 NXT | 03.09.2025 | Abgeschlossen |
| Cloudflare & vonBusch – Security für den Mittelstand | 🤝 Exklusiv | 04.12.2025 | Abgeschlossen |
| Business Bytes – Die Gefahr kommt zum Frühstück | ☕ Business Bytes | 24.03.2026 | Abgeschlossen |

#### API-Routen (events.ts)

| Endpoint | Methode | Beschreibung |
|---|---|---|
| /api/events | GET | Liste mit Status-Statistiken |
| /api/events | POST | Neues Event anlegen |
| /api/events/:id | GET/PATCH/DELETE | Detail/Bearbeiten/Löschen |
| /api/events/:id/contacts | GET | Teilnehmerliste |
| /api/events/:id/invite | POST | Kontakte hinzufügen (bulk) |
| /api/events/:id/contacts/:id | PATCH/DELETE | Status/Nachtel/Lead/Entfernen |
| /api/events/:id/ai-suggest | POST | KI-Kontakt-Selektion |
| /api/events/:id/generate-email | POST | KI-Einladungsmail |
| /api/events/:id/create-feedback | POST | Feedback-Token erstellen |
| /api/events/:id/feedback | GET | Feedback-Auswertung |
| /api/events/:id/nachlese | POST | Nachlese speichern |
| /api/events/feedback/:token | GET/POST | Öffentlicher Fragebogen |

### 10.4 Selektionen

Eigenständiger Menüpunkt unter Auswertung — zentrales Filter- und Selektion-Werkzeug für alle Vertriebsaktionen.

#### Was ist eine Selektion?

Eine gespeicherte, wiederverwendbare Suche über Kontakte oder Firmen nach beliebig kombinierbaren Kriterien. Einmal erstellt, kann sie jederzeit neu ausgeführt, aktualisiert und für verschiedene Aktionen genutzt werden.

#### KI-Selektion (Hauptfeature)

Der einfachste Weg: Einfach in natürlicher Sprache beschreiben was gesucht wird.

**Beispiele:**
- _"Alle IT-Leiter aus Bielefeld die noch keine Cloudflare-Demo hatten"_
- _"Kunden mit offenem Deal im Bereich POM die länger als 30 Tage nicht kontaktiert wurden"_
- _"Prospects im Raum OWL mit Interesse an DMS"_

Claude analysiert die Anfrage, wählt passende Filter-Felder und führt die Selektion direkt aus. Ergebnis + Vorschau werden sofort angezeigt. Filter können danach im Builder angepasst werden.

#### Manuelle Filter (Builder)

| Kategorie | Filter-Felder |
|---|---|
| Firma | Status (Kunde / Prospect / Inaktiv), Geschäftsbereich, PLZ (beginnt mit), Stadt |
| Kontakt | Position/Rolle (enthält), Interessen/Tags, Newsletter Opt-in |
| Aktivitäten | Kontaktiert in letzten X Tagen, Nicht kontaktiert seit X Tagen |
| Deals | Hat offenen Deal, Hat gewonnenen Deal |
| Marketing | Marketing-Aktion erhalten / nicht erhalten |

Alle Filter sind kombinierbar (AND-Verknüpfung). Vorschau-Tabelle zeigt bis zu 50 Treffer live.

#### Aktionen nach Selektion

| Aktion | Beschreibung |
|---|---|
| ⬇ CSV-Export | Kontaktdaten als CSV-Datei (UTF-8, Excel-kompatibel) |
| → Webinar | Alle Treffer direkt in ein Webinar einladen |
| → Veranstaltung | Alle Treffer direkt zu einer Veranstaltung hinzufügen |

#### Speichern & Wiederverwenden

Selektionen werden gespeichert und erscheinen in der Übersicht mit Treffer-Anzahl und Datum der letzten Ausführung. Erneutes Ausführen aktualisiert den Treffer-Count auf den aktuellen Stand.

## 11. Integrationen

### 11.1 Microsoft 365 / Azure AD
- SSO-Login via Cloudflare Access + Azure AD
- Outlook-Kalender: Aktivitäten und Aufgaben werden als Termine angelegt
- Mail.Send via Graph API: Benachrichtigungen bei Aufgabenzuweisung
- E-Mail-Sync: Eingehende Mails werden Firmen/Kontakten zugeordnet

### 11.2 JustIn ERP — Anbindung via Cloudflare Tunnel

**Architektur:**

```
┌─────────────────────────────────────────────────────────────┐
│                  von Busch GmbH (internes Netzwerk)         │
│                                                             │
│  ┌──────────────┐    TCP 1433    ┌────────────────────────┐ │
│  │    sql01     │◄──────────────│  vonbusch-erp-bridge   │ │
│  │192.168.200.10│               │  .exe  (Windows x64)   │ │
│  │  DB: justin  │               │  HTTP :3001 (nur lokal)│ │
│  └──────────────┘               └──────────┬─────────────┘ │
│                                            │               │
│                                   cloudflared.exe          │
│                                   (Windows-Dienst)         │
└────────────────────────────────────────────┼───────────────┘
                                             │ HTTPS Tunnel
                                             ▼
                              Cloudflare Zero Trust
                              erp.vonbusch.app
                              (Account: vonbuschthree60)
                                             │
                                             ▼
                              vonBusch CRM Worker
                              fetch('https://erp.vonbusch.app/...')
```

**Komponenten:**

| Komponente | Beschreibung | Ort |
|---|---|---|
| `vonbusch-erp-bridge.exe` | Windows x64 Dienst, liest JustIn SQL, stellt REST API bereit | Windows-Server im LAN |
| `cloudflared.exe` | Tunnelt Port 3001 → erp.vonbusch.app, kein offener Port nötig | Gleicher Windows-Server |
| Zero Trust Tunnel | Sichert Zugriff (nur CRM-Worker autorisiert) | CF Account vonbuschthree60 |
| ERP-Link UI | Konfigurationsmaske unter System & Tools | CRM |
| `/api/erp/*` | Backend-Routes: Config, Test, Sync | Cloudflare Worker |

**Synchronisierte Daten (JustIn → CRM):**
- Kundenstamm: Firmen, Kundennummern, Adressen
- Ansprechpartner: Kontakte je Firma
- Mitarbeiter: Stammdaten mit Mitarbeiternummern
- Aufträge: Status, Won-Deals Trigger
- Artikel (optional): Ersetzt statischen Produktkatalog

**Setup-Schritte:**
1. `vonbusch-erp-bridge.exe` auf Windows-Server installieren und als Dienst starten
2. Read-Only SQL User auf DB `justin` anlegen (kein `sa`)
3. `cloudflared.exe` als Windows-Dienst, Tunnel zu `erp.vonbusch.app`
4. Im CRM unter System & Tools → ERP-Link konfigurieren und testen

**SQL Server:** `sql01` / `192.168.200.10`, Port `1433`, DB `justin`  
**Tunnel-URL:** `https://erp.vonbusch.app`

**Just.in Status-Dot (oben rechts):**
| Farbe | Bedeutung |
|---|---|
| ⚫ Grau | ERP nicht konfiguriert |
| 🟡 Gelb | Konfiguriert, noch nicht getestet |
| 🟢 Grün | Letzte Verbindung erfolgreich |
| 🔴 Rot | Letzte Verbindung fehlgeschlagen |

### 11.2.1 Just.in Verbindungsstatus-Anzeige

Der Punkt neben „Just.in" in der Topbar zeigt den ERP-Verbindungsstatus:

| Farbe | Bedeutung |
|---|---|
| ⬤ Grau | ERP nicht konfiguriert |
| ⬤ Gelb | Konfiguriert, noch nicht getestet |
| ⬤ Grün | Letzte Verbindung erfolgreich |
| ⬤ Rot | Letzte Verbindung fehlgeschlagen |

Status wird beim Seitenstart automatisch geprüft. Test-Button in ERP-Link setzt Dot sofort.

### 11.3 SalesViewer
Automatischer Import von Website-Besuchern per E-Mail-Anhang (XLSX). Neue Firmen werden als Prospects angelegt, Besuche als Aktivitäten dokumentiert.

### 11.4 SoSS (Sales Offer Self Service)
Kundenportal für digitale Angebotsprozesse. Eigenes Cloudflare Worker Repo (`axelweichert/vonbusch-soss`).


## 12. Responsive Design & Mobile

### 12.1 Breakpoints

| Gerät | Breakpoint | Layout |
|---|---|---|
| Desktop | > 1100px | Sidebar (230px) + Content |
| Tablet | 769–1100px | Sidebar (200px) + Content |
| Mobile L | <= 768px | Sidebar als Drawer, Bottom Nav |
| Mobile S | <= 480px | Vollbild-Modals, Card-Listen |

### 12.2 Mobile Features

- **Bottom Navigation Bar:** Dashboard / Firmen / Aktivitäten / Deals / Mehr + Badges
- **Hamburger → X Animation:** 3 Balken morphen zu X
- **Swipe-Gesten:** Links-Swipe schließt Sidebar, Rechts-Swipe vom Rand öffnet
- **Mobile Suche:** Lupen-Icon → Blur-Overlay mit großem Suchfeld
- **iOS:** viewport-fit=cover, safe-area-inset, Momentum-Scrolling

---

## 13. Rollen & Berechtigungen

| Rolle | Reports | Marketing | Team-Daten | Ziele |
|---|---|---|---|---|
| readonly | Nein | Nein | Nein | Nein |
| support | Eigene | Nein | Nein | Nein |
| sales | Eigene | Ja | Nein | Eigene |
| sales_manager | Team | Ja | Eigenes Team | Team |
| admin | Alle | Ja | Alle | Alle |

---

## 14. Deployment

**Kein lokales CLI nötig.** Kein Terminal, kein Wrangler-CLI auf dem lokalen Rechner.

```
1. Dateien ändern

2. GitHub Upload  →  axelweichert/vonbuschos-cloud-crm
   (Drag & Drop in der GitHub Web-UI)

3. Cloudflare CI/CD baut automatisch

4. crm.vonbusch.app  →  live in ca. 1 Minute
```

### 14.1 Secrets (Cloudflare Workers)

| Secret | Zweck |
|---|---|
| ANTHROPIC_API_KEY | KI-Analyse (Claude Sonnet 4) |
| OPENAI_API_KEY | KI-Analyse (GPT-4o, parallel) |
| MS_CLIENT_ID | Azure AD App-ID (6ea1f736-cf3d-4232-b45d-96687e1e3679) |
| MS_TENANT_ID | Azure AD Tenant-ID (513ab9bc-04d1-4265-a9ad-107f3c13cdd0) |
| MS_CLIENT_SECRET | Azure AD App-Secret |
| WEBHOOK_SECRET | Microsoft Graph Webhook-Validierung |

### 14.2 Offene Azure AD Berechtigungen

| Permission | Auswirkung | Status |
|---|---|---|
| Calendars.ReadWrite | Outlook-Kalendereinträge aus Aktivitäten | ⏳ Ausstehend |
| Mail.Send | E-Mail-Benachrichtigung bei Aktivitäts-Teilnehmern | ⏳ Ausstehend |

---

## 15. Infrastruktur & Datenbank

### 15.1 CRM D1-Datenbank

**Name:** vonbusch-crm &nbsp;|&nbsp; **ID:** da1d7413-7552-41c2-986d-e1ab43de972d

**Tabellen:** users, companies, contacts, deals, activities, activity_attendees, tickets, contracts, documents, targets, ms_tokens, mail_subscriptions, sync_log, **products**

**Migrations:**

| Migration | Inhalt | Status |
|---|---|---|
| 0001_initial | Alle Basistabellen | Deployed |
| 0002_ai_summary | KI-Analyse Spalten in companies | Deployed |
| 0003_fax | Fax-Feld in companies | Deployed |
| 0004_documents | DMS-Tabelle + Archiv-Felder | Deployed |
| 0005_activities_v2 | Prio, Dauer, Mitarbeiternr., Attendees | Deployed |
| 0006_margin_targets | cost_value/margin in deals, targets-Tabelle | Direkt in D1 |
| 0007_archive_key | archive_r2_key in documents | Direkt in D1 |
| — | fin_data (JSON) in documents | Direkt in D1 ausgeführt |
| 0008_social_marketing | Social Media (companies+contacts), contact_marketing_tags | Direkt in D1 ausgeführt |
| 0009_webinars | webinars-Tabelle, webinar_contacts-Tabelle | Direkt in D1 ausgeführt |
| 0012_workflows | workflows-Tabelle, workflow_logs-Tabelle | Direkt in D1 ausgeführt |
| 0010_events | events-Tabelle, event_contacts-Tabelle, event_feedback-Tabelle | Direkt in D1 ausgeführt |
| 0011_selections | selections-Tabelle | Direkt in D1 ausgeführt |
| 0013_products | products-Tabelle (name, sku, price, purchase_price, unit, vat_rate, category, is_active) | Deployed |
| — | purchase_price Spalte | `ALTER TABLE products ADD COLUMN purchase_price REAL DEFAULT 0` — Direkt in D1 |
| — | stock Spalte (v2.4.6) | `ALTER TABLE products ADD COLUMN stock INTEGER NOT NULL DEFAULT 0` — Direkt in D1 ✅ |

### 15.2 SoSS D1-Datenbank

**Name:** vonbusch-soss &nbsp;|&nbsp; **ID:** 20c8ca7a-80ae-4df6-88eb-41c14ca6ebd2 &nbsp;|&nbsp; **Region:** EEUR

**Tabellen:**

| Tabelle | Inhalt |
|---|---|
| soss_sessions | Login-Sessions (Kundennr. + Angebotsnr., 48h TTL) |
| soss_orders | Bestellungen (Finanzierung, Rate, Unterschrift-Key, Status) |
| soss_credit_checks | Bonitätsprüfungs-Tracking |

### 15.3 R2 Object Storage

| Binding | Bucket-Name | Zweck | Bucket Lock |
|---|---|---|---|
| STORAGE | vonbusch-crm-docs | Normaler Dokumentenspeicher (bearbeitbar) | — |
| ARCHIVE | vonbusch-crm-archiv | Revisionssicheres Archiv (unveränderlich) | Indefinitely |

### 15.4 Zusätzliche D1-Datenbanken (Lead Magneten)

| Binding | DB-Name | Zweck |
|---|---|---|
| ZT_SHIELD_DB | zt-shield-db | Cloudflare MSSP Leads |
| SEC_CHECK_DB | security-check | Security Check Leads |

### 15.5 API-Routen

| Prefix | Datei | Inhalt |
|---|---|---|
| /api/companies | companies.ts | Firmen CRUD + KI-Analyse |
| /api/contacts | contacts.ts | Kontakte CRUD |
| /api/deals | deals.ts | Pipeline + Deals CRUD + Marge |
| /api/activities | activities.ts | Aktivitäten CRUD |
| /api/tickets | tickets.ts | Support-Tickets |
| /api/contracts | contracts.ts | Serviceverträge + MRR |
| /api/documents | documents.ts | DMS + revisionssicheres Archiv |
| /api/reports | reports.ts | Reports + Targets + Margin |
| /api/marketing | marketing.ts | Lead Magneten |
| /api/proposals | proposals.ts | KI-Angebots-Anschreiben generieren |
| /api/users | users.ts | Nutzer + Rollen |
| /api/calendar | calendar.ts | MS Graph Kalender |
| /api/mail | mail.ts | E-Mail Sync |
| /api/sync | sync.ts | JustIn Sync |
| /api/search | search.ts | Globale Suche |
| /api/soss | soss.ts | SoSS-Aufträge + Bestelldokument-Proxy |
| /api/webinars | webinars.ts | Webinare CRUD + Teilnehmer + KI-Mail |
| /api/contacts/:id/marketing | contacts.ts | Marketing-Aktionen pro Kontakt |
| /api/workflows | workflows.ts | Workflows CRUD + Run + Log |
| /api/events | events.ts | Veranstaltungen CRUD + Teilnehmer + KI + Feedback |
| /api/selections | selections.ts | Selektionen: Filter, KI-Selektion, CSV-Export, Webinar/Event-Einladung |

---

### ERP-Link (JustIn Anbindung)

| Tabelle | Inhalt |
|---|---|
| `erp_config` | Tunnel-URL, SQL-Server/-DB/-User/-Pass, Sync-Optionen, letzter Sync-Status |

**Konfiguration:** System & Tools → ERP-Link  
**Backend:** `/api/erp/config` (GET/POST), `/api/erp/test` (POST), `/api/erp/status` (GET)


## 16. Team & Mitarbeiter

### ITS (IT-Services) — inkl. AutoID

| MA-Nr | Name | Rolle |
|---|---|---|
| 120 | Axel Weichert | Sales Manager / ITS-Leitung |
| 189 | Henri Beckmann | Sales |
| 190 | Hannah Dehnke | Sales |
| 201 | Henning Brinker | Sales (AutoID = Teil von ITS) |
| 300 | Mario Hysa | Support |
| 311 | Sandro Ortega | Sales |

### POM (Print Output Management)

| MA-Nr | Name | Rolle |
|---|---|---|
| 223 | Katharina Franke | Leitung Vertrieb |
| 178 | Dennis Berger | Sales |
| 212 | Maik Murwig | Sales |
| 234 | Alexander Kuhl | Sales |

### Weitere Teams

| MA-Nr | Name | Team | Rolle |
|---|---|---|---|
| 167 | Leif Krahmüller | Robotik | Sales Manager |
| 267 | Ralf Busche | Digitaldruckerei | Sales |
| 245 | Claus Dueck | LFP | Sales |

### Management / Administration

| MA-Nr | Name | Bereich | Rolle |
|---|---|---|---|
| 101 | Victor von Busch | Management | Admin / GF |
| 102 | Stefan F.W. von Busch | Management | Admin / GF |
| 115 | Ziad Ferjani | Service | Sales Manager |
| 134 | Michael Burmeister | Einkauf | Sales Manager |
| 145 | Dirk Fuhrmann | Buchhaltung | Readonly |
| 156 | Arne Elges | Administration | Sales Manager |
| 256 | Claudia Eren | KAM | Sales |
| 278 | Peter Niemann | Dispatching | Support |
| 289 | Guido Prüßner | Dispatching | Support |
| 322 | Anchana Ravi | HR | Readonly |
| 333 | Lilian Weers | Marketing | Readonly |

---

## 17. Design & Branding

| Eigenschaft | Wert |
|---|---|
| Schrift | NonNaturalGrotesk (NNG) — Regular/Medium/Bold |
| Font-Einbettung | Base64 direkt in index.html (kein externer CDN-Aufruf) |
| Akzentfarbe | #00C2FF (Cyan) |
| Theme | Dark Mode (Standard) / Light Mode (umschaltbar) |
| Body-Schriftgröße | 15px |
| Nav-Schriftgröße | 14px |
| Tabellen-Schriftgröße | 13px |
| Labels | 12px |
| Branding Sidebar | vonBuschOS Cloud CRM |
| Branding Mobile Topbar | vonBuschOS Cloud CRM |

---

## 18. Offene Punkte & Roadmap

### Kurzfristig

| Punkt | Beschreibung |
|---|---|
| Azure AD Calendars.ReadWrite | Outlook-Kalenderintegration aktivieren (Dienstag nach Ostern) |
| Azure AD Mail.Send | E-Mail direkt aus CRM senden + Aktivitäts-Teilnehmer benachrichtigen |
| JustIn Rückkanal | CRM → JustIn (API-Format noch unbekannt) |
| GoToWebinar API-Sync | Registranten automatisch aus GoToWebinar importieren (API-Key nötig) |
| fin_data beim DMS-Upload | Finanzdaten direkt beim Angebots-Upload aus KI-Extraktion befüllen |

### Mittelfristig — Features 7–10

| Nr. | Punkt | Beschreibung |
|---|---|---|
| 7 | ~~Duplikat-Management / Merge~~ ✅ | Implementiert in v2.2.8: Kandidaten-Suche per Name+PLZ/E-Mail, Merge-Modal, Gewinner behält alle Datensätze. |
| 8 | ~~Produkt-/Leistungskatalog~~ ✅ | Implementiert in v2.3.2–v2.3.9: DB-Tabelle products, CRUD unter System & Tools, 📦-Button in Angebots-Generator, EK-Preis-Feld. v2.4.6: Kategorie-Statistiken, stock-Feld, vollständiger Hauptview, 2.500+ Produkte (Ubiquiti, Proxmox, DocuWare, JobRouter, Wortmann/TERRA, Canon, KonicaMinolta, Lexmark). |
| 9 | **Ziele & Quoten editierbar** | Ertrags- und Umsatzziele pro Mitarbeiter direkt in Einstellungen ändern (aktuell im Seed hardgecoded). |
| 10 | **Dokumentenvorlagen mit Variablen** | Brief-/Angebots-Templates die sich automatisch mit Kundendaten befüllen. |
| — | SoSS Bonitätsprüfung | Upload Refinanzierer-Dokument direkt im CRM |
| — | ~~CF MSSP Kalkulator~~ ✅ | Implementiert in v2.4.0–v2.4.2: ZTNA + Application Security, live USD/EUR-Kurs, Angebots-Integration. |
| — | SoSS Angebotsnummer vorausfüllen | Link mit Angebotsnummer aus CRM generieren |
| — | JustIn Status „Auftrag erteilt" | Automatischer Won-Deal via Sync-Ingest |
| — | Aktivitäten-Filter | In „Meine Aktivitäten" nach Typ filtern |

### Nice-to-have / Langfristig — Features 11–14

| Nr. | Punkt | Beschreibung |
|---|---|---|
| 11 | **WhatsApp-/SMS-Integration** | Kommunikation direkt aus dem CRM, für Vertrieb im Außendienst. |
| 12 | **Beziehungs-Graph** | Wer kennt wen? Netzwerk-Visualisierung: Kontakt A → arbeitet mit → Kontakt B. |
| 13 | **Competitive Intelligence** | Mitbewerber-Tracking pro Deal: Gegen wen verlieren wir häufig? In welchem Bereich? |
| 14 | **Custom Fields** | Nutzer können eigene Felder anlegen ohne Deploy — für branchenspezifische Daten. |
| — | JustIn EK-Sync | Einkaufspreise automatisch aus JustIn — Marge auto-berechnen |
| — | DOCX/XLSX Vorschau | Vollständiger In-Browser-Viewer |
| — | Teilnehmer-Anzeige | Im Aktivitäts-Detail-Modal alle Teilnehmer anzeigen |
| — | Browser Rendering (PDF) | Text-selektierbare PDFs via Cloudflare Puppeteer — wird isoliert in separatem Test-Worker entwickelt, erst dann ins CRM |

---

## Changelog

Vollständige Versionshistorie: [CHANGELOG.md](./CHANGELOG.md)

---

## 19. Changelog

> Der vollständige Versionsverlauf des vonBuschOS Cloud CRM.  
> Neueste Version immer oben. Wird bei jedem Deploy aktualisiert.

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
