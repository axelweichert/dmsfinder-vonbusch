# vonBuschOS Cloud CRM

> 🌍 **Das weltweit erste und einzige Cloud-native CRM, das vollständig ohne Server im globalen Edge-Netzwerk von Cloudflare läuft.**  
> Kein klassisches Hosting. Kein Server zu betreiben. Keine Downtime. Globale Verfügbarkeit in Millisekunden — von jedem Edge-Standort weltweit.
>
> Gebaut auf Cloudflare Workers · D1 · R2 · Hono.js · Microsoft 365

**Version:** v3.0.7 &nbsp;|&nbsp; **Live:** https://crm.vonbusch.app &nbsp;|&nbsp; **Repo:** axelweichert/vonbuschos-cloud-crm

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
11. [Dokumentenvorlagen](#11-dokumentenvorlagen)
12. [Beziehungs-Graph](#12-beziehungs-graph)
13. [Competitive Intelligence](#13-competitive-intelligence)
14. [Custom Fields](#14-custom-fields)
15. [WhatsApp & SMS Integration](#15-whatsapp--sms-integration)
29. [Compliance & Datenschutz (DSGVO, GoBD, HGB)](#29-compliance--datenschutz)
16. [Sidebar-Navigation](#16-sidebar-navigation)
17. [Einstellungen](#17-einstellungen)
18. [Microsoft Graph Integration (Outlook)](#18-microsoft-graph-integration-outlook)
19. [Integrationen](#19-integrationen)
20. [Responsive Design & Mobile](#20-responsive-design--mobile)
21. [Rollen & Berechtigungen](#17-rollen--berechtigungen)
22. [Deployment](#18-deployment)
23. [Infrastruktur & Datenbank](#19-infrastruktur--datenbank)
24. [Team & Mitarbeiter](#20-team--mitarbeiter)
25. [Design & Branding](#21-design--branding)
26. [Offene Punkte & Roadmap](#26-offene-punkte--roadmap)
27. [Projektmanagement](#27-projektmanagement)
28. [In-App Benachrichtigungen](#28-in-app-benachrichtigungen)

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

**Counter-Badge:** In der Sidebar zeigt ein Badge neben „Firmen" die Gesamtanzahl aller Firmen in der Datenbank.

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

**URL:** https://soss.vonbusch.app &nbsp;|&nbsp; **Repo:** axelweichert/vonbusch-soss &nbsp;|&nbsp; **Aktuelle Version v2.4.26

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

---

## 11. Dokumentenvorlagen

Erreichbar unter **System & Tools → 📄 Vorlagen**. Wiederverwendbare Brief- und E-Mail-Templates, die sich automatisch mit Kundendaten befüllen.

**Vorlagen-Typen:** Brief, E-Mail, Angebot, Allgemein

**Variablen (17):**

| Variable | Bedeutung |
|---|---|
| {{firma.name}} | Firmenname |
| {{firma.strasse}} | Straße + Hausnummer |
| {{firma.plz}} | PLZ |
| {{firma.ort}} | Ort |
| {{kontakt.volname}} | Vor- und Nachname |
| {{kontakt.vorname}} | Vorname |
| {{kontakt.nachname}} | Nachname |
| {{kontakt.position}} | Position |
| {{kontakt.email}} | E-Mail-Adresse |
| {{sender.name}} | Name des CRM-Nutzers |
| {{sender.email}} | E-Mail des CRM-Nutzers |
| {{datum}} | Heutiges Datum (DD.MM.YYYY) |
| {{datum_lang}} | Heutiges Datum ausgeschrieben |

**Verwendung:** Button „📄 Vorlage" in Kontakt-Detail, Firma-Detail und Aktivität-Formular. Modal zeigt Vorschau mit befüllten Variablen. Ausgabe: Kopieren / In Aktivität einfügen / Drucken & PDF.

**Technisch:** Tabelle `templates` (Migration 0018), API `/api/templates` (CRUD), View `v-templates`.

---

## 12. Beziehungs-Graph

Karte **🔗 Beziehungs-Graph** in der Kontakt-Detail-Ansicht (Spalte 2). Dokumentiert wer wen kennt — über Firmengrenzen hinweg.

**Beziehungstypen:**

| Typ | Beschreibung |
|---|---|
| kennt | Persönliche Bekanntschaft |
| Kollege/in | Aktuelle Kollegen |
| Geschäftspartner | Geschäftliche Partnerschaft |
| Beeinflusst Entscheidung | Indirekter Entscheidungseinfluss |
| Berichtet an | Hierarchische Linie |
| Ehemaliger Kollege | Frühere gemeinsame Arbeit |

**Ziel:** Kontakt A → kennt → Kontakt B (andere Firma). Netzwerk von Entscheidungsträgern sichtbar machen.

**Technisch:** Tabelle `relationships` (Migration 0019), API `/api/relationships` (GET/POST/DELETE), Live-Suche nach Kontakten & Firmen im Hinzufügen-Modal.

---

## 13. Competitive Intelligence

Erreichbar unter **System & Tools → 🎯 Competitive Intel**. Mitbewerber anlegen und pro Deal tracken, gegen wen wir angetreten sind — und wie es ausgegangen ist.

**Workflow:**
1. Mitbewerber anlegen (Name, Segment, Notiz)
2. Im Deal-Detail: Mitbewerber zuordnen + Ergebnis setzen
3. Report zeigt automatisch: Häufigster Gegner, Schwierigster Bereich, Verlustrate

**Segmente:** ITS, POM, LFP, Robotik, Digitaldruckerei, AutoID, eWLAN, DMS, Cloudflare

**Outcomes:** Gewonnen / Verloren / Offen

**Report-KPIs:**
- Häufigster Gegner (Name + Verluste + Verlustrate %)
- Schwierigster Bereich (Segment mit den meisten Verlusten)
- Tabelle: alle Mitbewerber mit Gewinn/Verlust-Statistik und Verlustrate-Balken

**Technisch:** Tabellen `competitors` + `deal_competitors` (Migration 0020), API `/api/competitive/*`, Route `competitive.ts`.

---

## 14. Custom Fields

Erreichbar unter **Einstellungen → ⚙️ Custom Fields**. Eigene Felder anlegen — ohne Deploy, sofort für alle Kontakte und Firmen verfügbar.

**Feldtypen:**

| Typ | Beschreibung |
|---|---|
| Text | Freitext-Eingabe |
| Zahl | Numerischer Wert |
| Datum | Datumsauswahl |
| Auswahl | Dropdown mit vordefinierten Optionen |
| Ja/Nein | Toggle-Checkbox |
| URL | Link mit klickbarem Protokoll |

**Entitäten:** Kontakt, Firma, Deal

**Anzeige:** Im Kontakt-Detail und Firma-Detail als Karte **⚙️ Custom Fields** — inline editierbar, Speicherung ohne Seitenreload.

**Technisch:** Tabellen `custom_field_defs` + `custom_field_values` mit UNIQUE-Constraint (Upsert) (Migration 0021), API `/api/custom-fields/defs` (CRUD) + `/api/custom-fields/values` (Upsert), Route `custom_fields.ts`.


---

---

## 15. WhatsApp & SMS Integration

Erreichbar direkt im Kontakt-Detail neben der Mobilnummer.

**Buttons:** 📱 WA + ✉ SMS — nur sichtbar wenn Mobilnummer beim Kontakt hinterlegt.

**WhatsApp-Flow:**
1. Kontakt öffnen → 📱 WA klicken
2. Optional: Vorlage auswählen → Variablen ({{firma.name}}, {{kontakt.vorname}} etc.) werden automatisch befüllt
3. „Öffnen & Senden" → `wa.me/{nummer}?text=...` öffnet WhatsApp Web oder App
4. Nachricht mit vorausgefülltem Text — Senden bestätigen

**SMS-Flow:** identisch, öffnet `sms:{nummer}?body=...` → iPhone/Android Nachrichten-App

**Activity-Log:** Checkbox „Als Aktivität speichern" (vorausgewählt) — Nachricht wird automatisch als Aktivität mit Status „erledigt" gespeichert.

**Technisch:** Keine eigene API — reiner Deeplink-Ansatz. Funktioniert überall ohne Zusatzkosten.

---

## 16. Sidebar-Navigation

Aktuelle Struktur der Seitennavigation:

### Übersicht
- Dashboard
- Mein Sales Jahr

### CRM
- Firmen *(mit Counter-Badge — Anzahl aller Firmen)*
- Kontakte *(Badge: Anzahl)*
- Deals *(Badge: Anzahl)*
- Aktivitäten *(Badge: offene)*
- Aufgaben *(Badge: offene)*
- ToDo Board
- Tickets *(Badge: offene)*
- Kalender
- Dokumente

### Auswertung *(Geschäftsbereiche integriert)*
- Übersicht
- Serviceverträge *(Badge: Anzahl)*
- Reports
- Workflows
- Selektionen
- Produktkatalog
- SoSS Aufträge *(Badge: offene)*

### Marketing
- Lead Magneten (→ Cloudflare MSSP, Security Check, DMS demnächst, Robotik demnächst)
- Webinare
- Veranstaltungen

### System & Tools
- Competitive Intel
- SalesViewer
- Cloudflare Kalkulator
- E-Mail Sync
- ERP-Link
- Einstellungen

---

## 17. Einstellungen

Erreichbar unter **System & Tools → Einstellungen**. 2-spaltiges Grid.

### Spalte 1

**🎨 Darstellung**
- Dark / Light Mode Toggle (wird im Browser gespeichert)
- Schriftgröße: Klein / Normal / Groß

**👤 Mein Profil**
- Profilfoto: hochladen (max. 200×200px, JPEG komprimiert), in localStorage gespeichert
- Wird beim App-Start automatisch geladen — auch im Sidebar-Avatar sichtbar
- Foto entfernen → Initialen als Fallback
- Rolle, Team, Mitarbeiternummer (read-only)

### Spalte 2

**📊 Dashboard Widgets** — ein/ausschaltbar:
- Meine Aktivitäten, Deal-Pipeline, Letzte Aktivitäten, Umsatz-Chart, KPI-Kacheln, 🎯 Mein Ertragsziel

**⚙️ Custom Fields** — Felder anlegen ohne Deploy:
- Feldtypen: Text, Zahl, Datum, Auswahl, Ja/Nein, URL
- Für: Kontakt, Firma, Deal
- Inline-Bearbeitung direkt in Kontakt/Firma-Detail

**ℹ️ Info**


## 18. Microsoft Graph Integration (Outlook)

### 15.1 Benötigte Berechtigungen (vollständiger Funktionsumfang)

**Azure AD → App Registrations → von Busch GmbH CRM → API Permissions → Delegierte Berechtigungen:**

| Berechtigung | Zweck | Status |
|---|---|---|
| **Mail.Read** | Eingehende Mails lesen + als Aktivität archivieren | ✅ aktiv |
| **Mail.ReadWrite** | Mails als gelesen markieren, Ordner verwalten | ✅ aktiv |
| **Mail.Send** | Mails direkt aus dem CRM versenden | ✅ implementiert |
| **Calendars.Read** | Kalender-Events lesen, Termine im CRM anzeigen | ✅ implementiert |
| **Calendars.ReadWrite** | Termine aus Aktivitäten + Aufgaben anlegen, Einladungen | ✅ implementiert |
| **Contacts.Read** | Outlook-Kontakte lesen für Abgleich | ✅ implementiert |
| **Contacts.ReadWrite** | CRM-Kontakte nach Outlook schreiben | ✅ implementiert |
| **User.Read** | Profilinfo des eingeloggten Users | ✅ implementiert |
| **offline_access** | Token-Refresh ohne erneuten Login | ✅ implementiert |

**⚠️ Wichtig:** Nach dem Hinzufügen der Berechtigungen muss der Azure AD Admin den Button **„Administratorzustimmung erteilen für von Busch GmbH"** klicken. Erst danach kann der OAuth-Flow starten.

### 15.2 OAuth-Flow

- **Technisch:** Separater Microsoft Graph OAuth-Flow — unabhängig von Cloudflare Access SSO
- **SCOPE:** `Calendars.Read Mail.Read Mail.ReadWrite User.Read offline_access`
- **Token-Speicherung:** D1-Tabelle `ms_tokens` (Access-Token + Refresh-Token, auto-erneuert)
- **Autorisierung starten:** `https://crm.vonbusch.app/api/calendar/auth` → Microsoft Consent-Dialog → Token in D1

### 15.3 Geplante Features nach Consent

**📧 Mail-Sync (E-Mail Sync — System & Tools)**
- Eingehende Mails von bekannten Kontakten → automatisch Aktivität bei der Firma
- Automatische DMS-Archivierung von Mail-Anhängen
- Domain-Matching: Unbekannte Absender über E-Mail-Domain der Firma zuordnen
- Interne `@vonbusch.digital` Mails werden ignoriert
- Manueller Import: .eml Drag & Drop bereits implementiert

**📅 Kalender (Calendars.ReadWrite)**
- Aktivität anlegen → automatisch Outlook-Termin erstellen
- Aufgabe mit Deadline → Ganztages-Termin in Outlook
- Einladungen an Aktivitäts-Teilnehmer direkt aus CRM versenden
- Kalender-View im CRM zeigt alle Outlook-Termine

**👥 Kontakt-Abgleich (Contacts.Read/Write)**
- Outlook-Kontakte mit CRM-Kontakten abgleichen
- Neue E-Mail-Kontakte (nicht im CRM) → automatisch vorschlagen
- CRM-Kontakte optional nach Outlook synchronisieren


## 19. Integrationen

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


### 11.2.2 JustIn Rückkanal — CRM → JustIn (ab v2.7.3)

Neue Firmen und Kontakte aus dem CRM werden automatisch in die **justin_queue** (D1) eingetragen und periodisch an den ERP-Bridge übertragen.

**Neue Bridge-Endpunkte (bridge.js v1.1.0):**

| Endpunkt | Methode | Beschreibung |
|---|---|---|
| `/customers` | POST | Neuen Kunden in `tKunden` anlegen |
| `/customers/:nr` | PUT | Kundenstamm in `tKunden` aktualisieren |
| `/contacts` | POST | Ansprechpartner in `tAnsprechpartner` anlegen |

**JustIn SQL-Mapping:**

| CRM-Feld | JustIn Spalte | Tabelle |
|---|---|---|
| company.name | Firma1 | tKunden |
| company.street | Strasse | tKunden |
| company.zip | PLZ | tKunden |
| company.city | Ort | tKunden |
| company.country | Land | tKunden |
| company.phone | Telefon | tKunden |
| company.email | EMail | tKunden |
| company.website | Homepage | tKunden |
| contact.last_name | Nachname | tAnsprechpartner |
| contact.first_name | Vorname | tAnsprechpartner |
| contact.position | Position | tAnsprechpartner |
| contact.email | EMail | tAnsprechpartner |
| contact.phone | Telefon | tAnsprechpartner |
| contact.mobile | Mobil | tAnsprechpartner |

**Queue-Verarbeitung:**
- Cron `*/15 * * * *`: automatisch alle 15 Minuten
- Manuell: ERP-Link → "▶️ Jetzt übertragen"
- Max. 3 Versuche, dann Status `error`
- Bei Neukunde: JustIn KundenNr wird als `erp_id` in CRM zurückgeschrieben

**Hinweis:** bridge.js auf dem Windows-Server muss auf v1.1.0 aktualisiert werden (enthält die neuen POST/PUT Endpunkte). Die neue `bridge.js` liegt im ZIP unter `vonbusch-crm-v2.7.4/bridge.js`.


### 11.2.3 JustIn ERP — Offene Sync-Punkte (⏳ ausstehend bis Bridge live)

> **Status:** Alle nachfolgenden Punkte sind konzipiert und werden sofort implementiert sobald der ERP-Bridge Tunnel (`erp.vonbusch.app`) mit SQL-Credentials live ist.

#### 11.2.3.1 Neue Bridge-Endpunkte (bridge.js Erweiterungen)

| Endpunkt | Methode | JustIn Tabelle | Beschreibung |
|---|---|---|---|
| `/tickets` | GET | `tServiceauftraege` o.ä. | Tickets/Störungen je Kunde (offen + abgeschlossen) |
| `/offers` | GET | `tAngebote` | Angebote je Kunde |
| `/invoices` | GET | `tRechnungen` | Rechnungen je Kunde |
| `/deliveries` | GET | `tLieferscheine` | Lieferscheine je Kunde |
| `/order-confirmations` | GET | `tAuftragsbestaetigungen` | Auftragsbestätigungen je Kunde |

> **Hinweis:** Exakte JustIn-Tabellennamen werden per `/schema` Endpunkt verifiziert sobald Bridge verbunden.

#### 11.2.3.2 Vollständiger Sync-Cron (JustIn → CRM)

Aktueller Cron `*/15 * * * *` synchronisiert: Kunden, Ansprechpartner, Mitarbeiter, Aufträge.

**Fehlend — wird ergänzt:**

| Datentyp | Sync-Richtung | Verhalten |
|---|---|---|
| Tickets / Störungen | JustIn → CRM | Offen + abgeschlossen, je Kunde zugeordnet |
| Angebote | JustIn → CRM | In Firmenkarte + Deal-Verknüpfung |
| Rechnungen | JustIn → CRM | In Firmenkarte anzeigen |
| Lieferscheine | JustIn → CRM | In Firmenkarte anzeigen |
| Auftragsbestätigungen (AB) | JustIn → CRM | In Firmenkarte anzeigen, Won-Deal Trigger |
| Artikel/Preise | JustIn → CRM | Produktkatalog live aus JustIn statt statisch |

#### 11.2.3.3 CRM UI-Erweiterungen (nach Bridge-Anbindung)

**Firmenkarte — neue Tabs:**
- 📋 **Angebote** — alle JustIn-Angebote der Firma, live oder gecacht
- 🧾 **Rechnungen** — offene und bezahlte Rechnungen
- 📦 **Lieferscheine** — alle Lieferungen
- ✅ **Auftragsbestätigungen** — ABs mit Betrag und Status
- 🔧 **Tickets/Störungen** — offene und abgeschlossene Serviceaufträge

**Ticket-View:**
- Bestehender CRM Ticket-View mit JustIn-Daten befüllen
- Sync: offene Tickets aus JustIn → CRM Tickets-Tabelle
- Abgeschlossene Tickets archivieren
- Neue Tickets im CRM anlegen → via Bridge in JustIn schreiben

#### 11.2.3.4 Rückkanal-Erweiterungen (CRM → JustIn)

Aktuell implementiert: Firmen (tKunden) + Kontakte (tAnsprechpartner).

**Noch offen:**
- Neue Tickets aus CRM → JustIn schreiben
- Kontaktänderungen (Update) → JustIn synchronisieren
- Angebots-Status aus CRM → JustIn zurückmelden (z.B. Deal gewonnen)

#### 11.2.3.5 Konfliktbehandlung: Neuer Kunde im CRM, noch nicht in JustIn

Aktuell implementiert via `justin_queue`:
1. Neuer Kunde im CRM → `justin_queue` Eintrag (status: `pending`)
2. Cron `*/15` ruft `processJustInQueue()` auf
3. Bridge `POST /customers` → schreibt in `tKunden`
4. JustIn `KundenNr` kommt zurück → wird als `erp_id` in CRM-Firma gespeichert
5. Ab jetzt: beidseitiger Abgleich möglich

**Noch zu implementieren:**
- Erkennung von Duplikaten (gleicher Name/Adresse bereits in JustIn)
- Merge-Dialog wenn CRM-Firma und JustIn-Kunde zusammengeführt werden sollen
- Manuelle Verknüpfung: CRM-Firma ↔ JustIn KundenNr

#### 11.2.3.6 Voraussetzungen (einmalig, durch Admin)

- [ ] SQL User mit Read-Write Rechten auf DB `justin` anlegen (für Rückkanal)
- [ ] SQL User mit Read-Only Rechten anlegen (für Sync-Cron, sicherere Option)
- [ ] `cloudflared` Tunnel auf `erp.vonbusch.app` aktivieren
- [ ] SQL-Credentials in ERP-Link Konfiguration hinterlegen
- [ ] Bridge-Verbindungstest erfolgreich (grüner Dot)
- [ ] Exakte JustIn-Tabellennamen via `/schema` verifizieren

### 11.3 SalesViewer
Automatischer Import von Website-Besuchern per E-Mail-Anhang (XLSX). Neue Firmen werden als Prospects angelegt, Besuche als Aktivitäten dokumentiert.

### 11.4 SoSS (Sales Offer Self Service)
Kundenportal für digitale Angebotsprozesse. Eigenes Cloudflare Worker Repo (`axelweichert/vonbusch-soss`).


## 20. Responsive Design & Mobile

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


### 7.3 Ziele & Quoten

Jeder Mitarbeiter mit Vertriebsrolle erhält ein persönliches **Jahresziel (Umsatz in €)**. Das System errechnet den Fortschritt automatisch aus gewonnenen Deals.

**Sichtbarkeitsregeln:**
| Rolle | Sieht |
|---|---|
| Admin (Victor, Stefan) | Alle Mitarbeiter aller Teams |
| Sales Manager ITS (Axel) | Alle ITS-Mitarbeiter |
| Sales Manager POM (Katharina) | Alle POM-Mitarbeiter |
| Alle anderen | Nur sich selbst |

**Ziele setzen:**
- Unter **System & Tools → 🎯 Ziele & Quoten** → Button „+ Ziel setzen"
- Admins und Sales Manager können Ziele für ihr Team setzen
- Jeder kann sein eigenes Ziel einsehen (nicht selbst setzen)

**Dashboard-Widget:**
- Auf dem Dashboard erscheint automatisch das eigene Jahresziel mit Fortschrittsbalken
- Prozentanzeige, erreichter Betrag, verbleibender Betrag
- Sparkline: monatlicher Verlauf Jan–Dez mit gestrichelter Ziellinie

**Fortschrittsanzeige:**
- 🟢 Grün: ≥ 100% erreicht
- 🔵 Cyan: ≥ 70%
- 🟡 Gelb: ≥ 40%
- 🔴 Rot: < 40%

**Technisch:**
- Daten: `targets`-Tabelle (type='user', period_type='year') — bereits in Migration 0006 angelegt
- Migration 0016: `won_at`-Feld in `deals` (exakter Zeitstempel bei Deal-Gewinn)
- API: `GET /api/quotas`, `GET /api/quotas/me`, `POST /api/quotas`
- `won_at` wird automatisch gesetzt wenn ein Deal auf Stage 'won' wechselt

## 21. Rollen & Berechtigungen

| Rolle | Reports | Marketing | Team-Daten | Ziele |
|---|---|---|---|---|
| readonly | Nein | Nein | Nein | Nein |
| support | Eigene | Nein | Nein | Nein |
| sales | Eigene | Ja | Nein | Eigene |
| sales_manager | Team | Ja | Eigenes Team | Team |
| admin | Alle | Ja | Alle | Alle |

---

## 22. Deployment

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

## 23. Infrastruktur & Datenbank

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
| 0010_events | events-Tabelle, event_contacts-Tabelle, event_feedback-Tabelle | Direkt in D1 ausgeführt |
| 0011_selections | selections-Tabelle | Direkt in D1 ausgeführt |
| 0012_workflows | workflows-Tabelle, workflow_logs-Tabelle | Direkt in D1 ausgeführt |
| 0013_products | products-Tabelle (name, sku, price, purchase_price, unit, vat_rate, category, is_active) | Deployed |
| 0014_tasks | tasks-Tabelle (Aufgaben-System) | Direkt in D1 ausgeführt |
| 0015_erp_config | erp_config-Tabelle (JustIn ERP-Anbindung) | Direkt in D1 ausgeführt |
| 0016_quotas | won_at in deals, targets aktualisiert | Direkt in D1 ausgeführt |
| 0017_fix_targets | Targets neu gesetzt (INSERT OR REPLACE) | Direkt in D1 ausgeführt |
| 0018_templates | templates-Tabelle (Dokumentenvorlagen) | Direkt in D1 ausgeführt |
| 0019_relationships | relationships-Tabelle (Beziehungs-Graph) | Direkt in D1 ausgeführt |
| 0020_competitive | competitors + deal_competitors Tabellen | Direkt in D1 ausgeführt |
| 0021_custom_fields | custom_field_defs + custom_field_values Tabellen | Direkt in D1 ausgeführt |
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
| /api/quotas | quotas.ts | Ziele & Quoten — GET/POST/DELETE, /me?year=YYYY |
| /api/templates | templates.ts | Dokumentenvorlagen — CRUD |
| /api/relationships | relationships.ts | Beziehungs-Graph — GET/POST/DELETE |
| /api/competitive | competitive.ts | Competitive Intelligence — Mitbewerber + Deal-Zuordnung + Report |
| /api/custom-fields | custom_fields.ts | Custom Fields — Definitionen + Werte (Upsert) |

---

### ERP-Link (JustIn Anbindung)

| Tabelle | Inhalt |
|---|---|
| `erp_config` | Tunnel-URL, SQL-Server/-DB/-User/-Pass, Sync-Optionen, letzter Sync-Status |

**Konfiguration:** System & Tools → ERP-Link  
**Backend:** `/api/erp/config` (GET/POST), `/api/erp/test` (POST), `/api/erp/status` (GET)


## 24. Team & Mitarbeiter

### ITS (IT-Services) — inkl. AutoID

**ITS Vertrieb / Leitung**

| MA-Nr | Name | Rolle |
|---|---|---|
| 120 | Axel Weichert | Sales Manager / ITS-Leitung |
| 189 | Henri Beckmann | Sales |
| 190 | Hannah Dehnke | Sales |
| 201 | Henning Brinker | Sales (AutoID = Teil von ITS) |
| 311 | Sandro Ortega | Sales |

**ITS Projektleitung DMS**

| MA-Nr | Name | Rolle |
|---|---|---|
| 465 | Christian Koke | Sales |
| 476 | Eva-Maria Hoffschneider | Sales |

**ITS Technik Infrastruktur**

| MA-Nr | Name | Rolle |
|---|---|---|
| 300 | Mario Hysa | Support |
| 344 | Marius Petrich | Support |
| 355 | Michael Walkenhorst | Support |
| 366 | Sven Schröder | Support |
| 377 | Uwe Plaß | Support |
| 388 | Alexander Dendja | Support |
| 399 | Damian Linnenschmidt | Support |

**ITS Technik DMS**

| MA-Nr | Name | Rolle |
|---|---|---|
| 410 | Tobias Westermann | Support |
| 421 | Enis Cicek | Support |
| 432 | Tim Fritze | Support |

**ITS Technik Print Management**

| MA-Nr | Name | Rolle |
|---|---|---|
| 443 | Björn Backhaus | Support |

**ITS Dispatching**

| MA-Nr | Name | Rolle |
|---|---|---|
| 454 | David Wiewel | Support |

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

## 25. Design & Branding

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

## 27. Projektmanagement

Projektmanagement ist als eigenständiger Bereich in das CRM integriert. Projekte können Firmen und Deals zugeordnet werden.

### 27.1 Funktionsumfang

- **Projektliste** — Kacheln mit Fortschrittsbalken, Farbmarkierung, Badges (NEU/ÜBERFÄLLIG/ERLEDIGT)
- **Projektstart + geplantes Ende** — eigene Datumsfelder, mit Pfeil-Anzeige in der Kachel
- **Mitglieder-Avatare** — gestapelt, async geladen, max. 6 + Überlauf-Counter
- **Kanban Board** — 4 Spalten: Offen → In Arbeit → Review → Erledigt (Drag & Drop)
- **Mitglieder verwalten** — Hinzufügen/Entfernen per Auswahl-Modal
- **Timeline/Gantt** — Aufgaben mit Fälligkeitsdatum als Balkendiagramm
- **Projektkarte in Firmenkarte** — verknüpfte Projekte direkt in der Firma sichtbar

### 27.2 Tabs im Projekt-Detail

| Tab | Inhalt |
|---|---|
| 📋 Kanban | Aufgaben-Board mit Drag & Drop + 📧 Extern versenden |
| 👥 Mitglieder | Mitarbeiter hinzufügen/entfernen |
| 📅 Timeline | Gantt-Balken nach Fälligkeitsdatum |
| ⏱ Zeiten | Zeiterfassung pro Projekt — Buchung, Ansicht, Tagessumme |

### 27.3 Benachrichtigungen aus Projekten

- Neue Aufgabe → alle Projektmitglieder werden benachrichtigt
- Aufgabe auf "Erledigt" → Projektleiter wird benachrichtigt
- Mitglied eingeladen → eingeladener User wird benachrichtigt

### 27.4 Datenbank

| Tabelle | Beschreibung |
|---|---|
| `projects` | Titel, Beschreibung, Farbe, start_date, due_date, company_id, owner_id |
| `project_tasks` | Aufgaben mit column_id, priority, due_date, assigned_to |
| `project_members` | Mitglieder je Projekt (user_id, role: owner/member) |

**Backend:** `/api/projects` (CRUD Projekte + Tasks + Members + Count + company_id Filter)

---

## 28. In-App Benachrichtigungen

### 28.1 Funktionsumfang

- **Glocken-Icon** (Topbar) mit rotem Badge für ungelesene Notifications
- **Zwei Tabs:** 📋 Aufgaben | 🔔 Neu
- **Polling** alle 60 Sekunden automatisch
- **Klick** auf Notification → navigiert direkt zum verknüpften Objekt

### 28.2 Trigger

| Ereignis | Empfänger |
|---|---|
| Neue Aufgabe im Projekt | Alle Projektmitglieder (außer Ersteller) |
| Aufgabe → Erledigt | Projektleiter (owner) |
| Mitglied zu Projekt eingeladen | Eingeladener User |

### 28.3 Datenbank

`notifications` Tabelle: id, user_id, title, body, entity_type, entity_id, link, is_read, created_at

**Backend:** `GET /api/notifications`, `/count`, `PUT /:id/read`, `PUT /read-all`

---

## 26. Offene Punkte & Roadmap

### Kurzfristig

| Punkt | Beschreibung | Status |
|---|---|---|
| **Microsoft Graph — Admin Consent** | Azure AD → App Registrations → von Busch GmbH CRM → API Permissions → „Administratorzustimmung erteilen" | ✅ Erledigt |
| **Mail.Read + Mail.ReadWrite** | E-Mail Sync aktivieren — eingehende Mails als Aktivität archivieren | ✅ aktiv |
| **Mail.Send** | Mails direkt aus CRM versenden | ✅ implementiert |
| **Calendars.ReadWrite** | Termine aus Aktivitäten + Aufgaben in Outlook anlegen, Einladungen | ✅ implementiert |
| **Contacts.Read/Write** | Outlook-Kontakte ↔ CRM-Kontakte abgleichen | ✅ implementiert |
| JustIn Rückkanal | CRM → JustIn via ERP-Bridge (Queue + processJustInQueue) | ✅ v2.7.4 |
| JustIn Tickets/Störungen | Sync offene + abgeschlossene Serviceaufträge | ⏳ Bridge ausstehend |
| JustIn Angebote | Angebote je Kunde in Firmenkarte anzeigen | ⏳ Bridge ausstehend |
| JustIn Rechnungen | Rechnungen je Kunde in Firmenkarte | ⏳ Bridge ausstehend |
| JustIn Lieferscheine | Lieferscheine je Kunde in Firmenkarte | ⏳ Bridge ausstehend |
| JustIn Auftragsbestätigungen | ABs + Won-Deal Trigger | ⏳ Bridge ausstehend |
| JustIn Artikel live | Produktkatalog direkt aus JustIn statt statisch | ⏳ Bridge ausstehend |
| Duplikat-Erkennung | Merge CRM-Firma ↔ JustIn-Kunde | ⏳ Bridge ausstehend |
| GoToWebinar API-Sync | Registranten automatisch aus GoToWebinar importieren (API-Key nötig) | ⏳ offen |
| ~~fin_data beim DMS-Upload~~ ✅ | Implementiert v2.8.5: KI extrahiert monthly_rate/contract_months/deal_value/one_time_costs → fin_data JSON automatisch gesetzt |

### Mittelfristig — Features 7–10

| Nr. | Punkt | Beschreibung |
|---|---|---|
| 7 | ~~Duplikat-Management / Merge~~ ✅ | Implementiert in v2.2.8: Kandidaten-Suche per Name+PLZ/E-Mail, Merge-Modal, Gewinner behält alle Datensätze. |
| 8 | ~~Produkt-/Leistungskatalog~~ ✅ | Implementiert in v2.3.2–v2.3.9: DB-Tabelle products, CRUD unter System & Tools, 📦-Button in Angebots-Generator, EK-Preis-Feld. v2.4.6: Kategorie-Statistiken, stock-Feld, vollständiger Hauptview, 2.500+ Produkte (Ubiquiti, Proxmox, DocuWare, JobRouter, Wortmann/TERRA, Canon, KonicaMinolta, Lexmark). |
| 9 | ~~Ziele & Quoten editierbar~~ ✅ | Implementiert in v2.8.0: Victor (alle), Katharina (POM), Axel (ITS) können Jahresziele direkt in Einstellungen setzen. |
| 10 | ~~Dokumentenvorlagen mit Variablen~~ ✅ | Implementiert in v2.4.35: templates-Tabelle, 4 Typen, 17 Variablen, Modal mit Vorschau, Button in Kontakt/Firma/Aktivität. |
| — | ~~SoSS Bonitätsprüfung~~ ✅ | Implementiert in v2.8.4: Upload Refinanzierer-Dokument im Bonitäts-Modal, landet im DMS der Firma |
| — | ~~CF MSSP Kalkulator~~ ✅ | Implementiert in v2.4.0–v2.4.2: ZTNA + Application Security, live USD/EUR-Kurs, Angebots-Integration. |
| — | ~~SoSS Angebotsnummer vorausfüllen~~ ✅ | Implementiert v2.8.3: Eingabefeld im Link-Generator, als URL-Parameter übergeben |
| — | JustIn Status „Auftrag erteilt" | Automatischer Won-Deal via Sync-Ingest |
| — | ~~Aktivitäten-Filter~~ ✅ | Implementiert v2.8.3: Angebot, Anruf ein/aus, Videocall, E-Mail, Besuch, Notiz, Wiedervorlage, AfterSales |

### Nice-to-have / Langfristig — Features 11–14

| Nr. | Punkt | Beschreibung |
|---|---|---|
| 11 | ~~WhatsApp-/SMS-Integration~~ ✅ | Implementiert in v2.4.54: 📱 WA + ✉ SMS Buttons neben Mobilnummer, Vorlagen-Integration, wa.me Deeplink, Activity-Log. |
| 12 | ~~Beziehungs-Graph~~ ✅ | Implementiert in v2.4.48: relationships-Tabelle, 6 Beziehungstypen, Live-Suche, Karte im Kontakt-Detail. |
| 13 | ~~Competitive Intelligence~~ ✅ | Implementiert in v2.4.49: competitors + deal_competitors, View unter System & Tools, Verlustanalyse-Report, Deal-Integration. |
| 14 | ~~Custom Fields~~ ✅ | Implementiert in v2.4.50: 6 Feldtypen (Text/Zahl/Datum/Auswahl/Ja/Nein/URL), Einstellungen-UI, Kontakt + Firma Detail. |
| — | ~~Zeiterfassung ITS~~ ✅ | Implementiert in v2.8.2: Tab "⏱ Zeiten" im Projekt-Detail, time_entries Tabelle, Buchung + Tagessumme |
| — | JustIn EK-Sync | Einkaufspreise automatisch aus JustIn — Marge auto-berechnen |
| — | ~~DOCX/XLSX Vorschau~~ ✅ | Implementiert: mammoth.js (DOCX→HTML) + SheetJS (XLSX→Tabelle) im Dokument-Modal |
| — | ~~Teilnehmer-Anzeige~~ ✅ | Implementiert v2.8.3: Immer sichtbar, leer-Zustand "Keine weiteren Teilnehmer" |
| — | Browser Rendering (PDF) | Text-selektierbare PDFs via Cloudflare Puppeteer — wird isoliert in separatem Test-Worker entwickelt, erst dann ins CRM |

---

## 29. Compliance & Datenschutz

> **Hinweis:** Dieses Kapitel ist eine technisch-sachliche Dokumentation. Es ersetzt keine Rechtsberatung. Für verbindliche Einschätzungen ist ein Datenschutzbeauftragter oder Fachanwalt zu konsultieren.

---

### 29.1 DSGVO (Datenschutz-Grundverordnung)

Das vonBuschOS Cloud CRM ist ein **internes Werkzeug** — ausschließlich von Mitarbeitern der von Busch GmbH genutzt, nicht von externen Kunden. Es verarbeitet personenbezogene Daten aus CRM-Vorgängen (Kontakte, Firmen, Deals, Aktivitäten) sowie Dokumente und Outlook-Daten.

#### Verarbeitete Datenkategorien

| Datenkategorie | Rechtsgrundlage | Bemerkung |
|---|---|---|
| Kundenkontakte (Name, E-Mail, Tel.) | Art. 6 Abs. 1 lit. b DSGVO | Vertragserfüllung / Vertragsanbahnung |
| Deals, Angebote, Aktivitäten | Art. 6 Abs. 1 lit. b DSGVO | Vertragserfüllung |
| Mitarbeiterdaten | Art. 6 Abs. 1 lit. b DSGVO | Beschäftigungsverhältnis |
| Outlook-Kalender, E-Mails | Art. 6 Abs. 1 lit. f DSGVO | Berechtigtes Interesse (Betrieb CRM) |
| KI-Analyse von Dokumenten | Art. 6 Abs. 1 lit. b / f DSGVO | Kundendaten in Angeboten/Verträgen |

#### Dienstleister & Auftragsverarbeitung (Art. 28 DSGVO)

| Dienstleister | Einsatz im CRM | Status AVV | Anmerkung |
|---|---|---|---|
| **Cloudflare** (Workers, D1, R2) | Infrastruktur, Datenbank, Speicher | ⚠️ **AVV abschließen** | US-Unternehmen, DPF-zertifiziert; AVV online verfügbar |
| **Anthropic Claude** (API) | Dokumentenanalyse, KI-Protokoll | ⚠️ **DPA abschließen** | US-Unternehmen; kein Training mit API-Daten; SCCs erforderlich |
| **OpenAI GPT-4o** (API) | Dokumentenanalyse (parallel) | ⚠️ **DPA abschließen** | US-Unternehmen; API = Business Terms; kein Training; SCCs erforderlich |
| **Microsoft Graph** (OAuth, Kalender) | Outlook-Kalender, E-Mail, Kontakte | ✅ Im M365-Vertrag enthalten | EU Data Boundary seit 2025; DPA in M365-Vertrag |
| **Cloudflare Access** | Authentifizierung | ⚠️ Im Cloudflare-AVV | Zugangskontrolle per SSO |

#### Offene Handlungsbedarfe DSGVO

1. **AVV mit Cloudflare** abschließen → [cloudflare.com/de-de/trust-hub/gdpr/](https://www.cloudflare.com/de-de/trust-hub/gdpr/)
2. **DPA mit Anthropic** unterzeichnen → API-Konto → Data Processing Agreement
3. **DPA mit OpenAI** unterzeichnen → [openai.com/policies/data-processing-addendum/](https://openai.com/policies/data-processing-addendum/)
4. **Transfer Impact Assessment (TIA)** für Anthropic + OpenAI dokumentieren
5. **Verfahrensverzeichnis (VVT)** nach Art. 30 DSGVO um CRM-Verarbeitungen erweitern
6. **Datenschutz-Folgenabschätzung (DSFA)** für KI-Dokumentenanalyse prüfen
7. Mitarbeiter darüber informieren, dass Kundendaten KI-analysiert werden können (Transparenz Art. 13/14 DSGVO)
8. Prüfen ob Intelligent Placement (aktiviert v2.9.8) Daten auf nicht-EU-Servern verarbeitet

#### KI-spezifische DSGVO-Beurteilung

| Feature | Datenmenge | Bewertung |
|---|---|---|
| Dokumentenanalyse (Angebote, ABs) | Hoch — Kundennamen, Adressen, Preise | ⚠️ Drittlandtransfer; DPA + SCCs zwingend |
| Smart-Protokoll (Diktat) | Mittel — Gesprächsinhalte, Kundenbezug | ⚠️ Drittlandtransfer; nur mit DPA |
| Competitive Intelligence | Gering — Firmennamen, öffentliche Infos | 🟡 Unkritisch |
| Kalender-Sync (Microsoft) | Mittel — Termindetails, Teilnehmer | ✅ Microsoft DPA greift |

---

### 29.2 GoBD (Grundsätze zur ordnungsmäßigen Führung und Aufbewahrung)

**Rechtsgrundlage:** BMF-Schreiben vom 28.11.2019, zuletzt angepasst 11.03.2024 (Az. IV D 2 – S 0316/21/10001:002)

Die GoBD regeln, wie steuerrelevante Daten digital gespeichert, archiviert und aufbewahrt werden müssen. Das CRM verarbeitet und archiviert steuerrelevante Dokumente (Angebote, Auftragsbestätigungen, Verträge).

#### Anforderungen & Umsetzung im CRM

| GoBD-Anforderung | Umsetzung im CRM | Status |
|---|---|---|
| **Unveränderbarkeit** — Dokumente nach Archivierung nicht änderbar | R2-Archiv (WORM-Prinzip): `archive_r2_key` unveränderlich gespeichert | ✅ Implementiert |
| **Vollständigkeit** — Alle steuerrelevanten Belege erfasst | DMS mit doc_type-Klassifikation (Angebot, AB, Rechnung, Vertrag) | ✅ Implementiert |
| **Nachvollziehbarkeit** — Jeder Geschäftsvorfall mit Beleg | Won-Deal verknüpft mit DMS-Dokument; Aktivitäten-Log | ✅ Implementiert |
| **Zeitgerechtigkeit** — Zeitnahe Erfassung | Dokument-Upload mit automatischem Datum-Stempel (`doc_date`, `created_at`) | ✅ Implementiert |
| **Ordnungsmäßigkeit** — Strukturierte Ablage, jederzeit auffindbar | DMS: company_id, doc_type, Volltext-Index, Tags | ✅ Implementiert |
| **Cloud erlaubt** (seit GoBD 2020) | Cloudflare R2 als Cloud-Speicher; GoBD-konform wenn AVV vorliegt | ✅ Erlaubt |
| **KI-Einsatz** (GoBD 2024) | KI darf eingesetzt werden, Ergebnisse müssen nachvollziehbar/prüfbar sein | ⚠️ Verfahrensdokumentation erforderlich |
| **Datenzugriff Finanzamt** (Z3 → Datenüberlassung) | Export-Funktion für D1-Daten vorhanden (Backup-API) | 🟡 Manuell möglich |
| **Revisionssichere E-Mails** | E-Mails werden als Aktivität archiviert (body in D1) | ⚠️ Vollständigkeit prüfen |

#### Aufbewahrungsfristen (§ 147 AO / GoBD 2025)

| Dokumententyp | Frist | Umsetzung |
|---|---|---|
| Handelsbücher, Jahresabschlüsse | 10 Jahre | Außerhalb CRM (Buchhaltung) |
| Buchungsbelege (Rechnungen, ABs) | **8 Jahre** (neu ab 2025) | R2-Archiv — **nicht löschen** |
| Geschäftsbriefe, Angebote | **6 Jahre** | R2-Archiv — **nicht löschen** |
| Sonstige Geschäftsunterlagen | 6 Jahre | R2-Archiv |

> ⚠️ **Wichtig:** Die Archiv-R2-Bucket (`vonbusch-crm-archiv`) darf nicht vor Ablauf der gesetzlichen Fristen bereinigt werden. Es gibt aktuell **keine automatische Sperrung** — manuelle Prüfung vor Löschung erforderlich.

#### GoBD-Handlungsbedarf

1. **Verfahrensdokumentation** erstellen — Pflicht für alle Unternehmen; beschreibt Buchführungs- und Archivierungsprozesse im CRM
2. **KI-Prozesse dokumentieren** — GoBD 2024: KI-Ergebnisse müssen nachvollziehbar/prüfbar sein → Audit-Log der KI-Analysen empfohlen
3. **E-Mail-Archivierung** prüfen — Geschäftlich relevante E-Mails müssen 6 Jahre aufbewahrt werden
4. **Lösch-Sperre** für Archiv-R2 einrichten — technische Unveränderbarkeit der Archiv-Buckets sicherstellen

---

### 29.3 HGB (Handelsgesetzbuch)

**Rechtsgrundlage:** §§ 238–241 HGB (Buchführungspflicht), § 257 HGB (Aufbewahrungspflicht)

Das HGB verpflichtet Kaufleute zur geordneten Buchführung und Aufbewahrung von Unterlagen.

| HGB-Anforderung | Paragraf | Umsetzung im CRM | Status |
|---|---|---|---|
| Aufbewahrung Handelsbücher, Bilanzen | § 257 Abs. 1 Nr. 1 HGB — 10 Jahre | Außerhalb CRM (Buchhaltung/DATEV) | ➡️ Nicht im CRM |
| Aufbewahrung Handelsbriefe (empfangen) | § 257 Abs. 1 Nr. 2 HGB — 6 Jahre | Angebote + Auftragsbestätigungen im DMS | ✅ Implementiert |
| Aufbewahrung Handelsbriefe (versendet) | § 257 Abs. 1 Nr. 3 HGB — 6 Jahre | Ausgehende Angebote im DMS | ✅ Implementiert |
| Buchungsbelege | § 257 Abs. 1 Nr. 4 HGB — 8 Jahre | Bestelldokumente, ABs im R2-Archiv | ✅ Implementiert |
| Lesbarkeit über gesamte Aufbewahrungsfrist | § 257 Abs. 3 HGB | R2-Objekte über PDF-Viewer direkt lesbar | ✅ Gewährleistet |
| Ordnungsgemäße Buchführung | § 238 HGB | CRM ist Vorsystem — Buchhaltung extern | ➡️ CRM = Vorsystem |

> Das CRM ist als **Vorsystem** zu verstehen — die eigentliche Buchführung (§ 238 ff. HGB) erfolgt extern (DATEV, Steuerberater). Das CRM liefert Belege und Vorgangsdaten.

---

### 29.4 Zusammenfassung & Sofortmaßnahmen

| Priorität | Maßnahme | Aufwand |
|---|---|---|
| 🔴 **Hoch** | AVV mit Cloudflare abschließen | 15 Min (Online-Formular) |
| 🔴 **Hoch** | DPA mit Anthropic unterzeichnen | 15 Min (API-Konto) |
| 🔴 **Hoch** | DPA mit OpenAI unterzeichnen | 15 Min (Online-Formular) |
| 🟡 **Mittel** | Verfahrensdokumentation GoBD erstellen | Einmalig 2–4 Std. |
| 🟡 **Mittel** | Transfer Impact Assessment (TIA) für US-KI-APIs | 1–2 Std. Dokumentation |
| 🟡 **Mittel** | DSFA für KI-Dokumentenanalyse prüfen | Mit DSB abstimmen |
| 🟡 **Mittel** | Lösch-Sperre Archiv-R2 technisch einrichten | Cloudflare R2 Object Lock |
| 🟢 **Niedrig** | VVT nach Art. 30 DSGVO aktualisieren | Mit DSB |
| 🟢 **Niedrig** | Mitarbeiter über KI-Einsatz informieren | Interne Kommunikation |


---

## Changelog

Vollständige Versionshistorie: [CHANGELOG.md](./CHANGELOG.md)

---

## 27. Changelog

> Der vollständige Versionsverlauf des vonBuschOS Cloud CRM.  
> Neueste Version immer oben. Wird bei jedem Deploy aktualisiert.

## v3.0.7 – 2026-04-08
### Fix: Dokumenten-Volltext-Extraktion für Suche

- Root Cause: Frontend extrahierte Volltext via PDF.js (bis 6.000 Zeichen, 5 Seiten), speicherte beim Upload aber nur docAnalysis.fulltext_preview (~200 Zeichen KI-Kurzantwort) → Suche fand nur Inhalte aus dem KI-Kurztext
- Fix: Neue globale Variable docExtractedText speichert den direkt extrahierten Rohtext beim Analyse-Schritt
- Beim Upload: fulltext = docExtractedText (Rohtext) ODER fulltext_preview als Fallback
- Backend speichert fulltext_idx = die ersten 10.000 Zeichen → volle Suchbarkeit in Dokumenteninhalten

## v3.0.6 – 2026-04-08
### Fix: Dokumenten-Volltextsuche — Firmennamen + archivierte Dokumente

- Root Cause 1: `co.name LIKE ?` fehlte in der Such-Query → Suche nach Firmennamen ("Nielsen") fand nichts
- Root Cause 2: `is_archived=0` in allen Queries → archivierte Dokumente komplett ausgeschlossen
- Fix: 4 separate Queries (subject, co.name, summary, fulltext_idx) ohne is_archived-Filter, Merge mit Dedup
- Architektur-Regel beachtet: keine `LIKE ? OR LIKE ?` → separate Queries pro Feld

## v3.0.5 – 2026-04-08
### Fix: Serviceverträge Mobile — Card-Layout statt horizontales Scrollen

- Root Cause: 8 Spalten in 430px Viewport — horizontales Scrollen ist keine akzeptable Mobile-UX
- Lösung: Card-Layout identisch zum Aktivitäten/Firmen-Ansatz — .th ausgeblendet, .tr als flex-wrap Card
- NR (volle Breite), FIRMA (groß, volle Breite), PRODUKT, BEREICH-Badge, LAUFZEIT-Balken, TYP, SLA, MTL.€ rechts
- Alte Scroll-Fixes (#v-sv .tbl overflow-x, .th min-width) entfernt — wurden durch Card-Layout ersetzt

## v3.0.4 – 2026-04-08
### Hotfix: Versionsnummer im HTML (Sidebar + Info) aktualisiert

- Versionsnummer hardcoded im HTML (Zeile 789 Sidebar-Footer, Zeile 4653 Info-Panel) war noch v2.9.9 — wurde bei keiner Version seit v3.0.0 aktualisiert
- Direktive ergänzt: Versionsnummer im HTML ist Pflicht bei jeder Lieferung

## v3.0.3 – 2026-04-08
### Hotfix: Serviceverträge overflow !important + Dokumente Archiv-Baum sichtbar

- Serviceverträge: `overflow-x:auto` hatte kein `!important` → globales `.tbl{overflow:hidden}` gewann → Tabelle scrollte nicht → `!important` ergänzt, min-width auf `.th` und `.tr` auf 540px !important
- Dokumente: `max-height:300px` auf linker Spalte zu klein (Upload-Zone ~200px, Archiv-Baum geclipt) → stattdessen `max-height:200px !important` direkt auf den Archiv-Panel-Container (div:last-child), linke Spalte ohne max-height

## v3.0.2 – 2026-04-08
### Pflege: (Feature X) Suffixe aus README entfernt

- Inhaltsverzeichnis: "(Feature 10/11/12/13/14)" hinter Kapitellinks entfernt
- Kapitelüberschriften 11–15: Suffixe entfernt
- Abschnitt 7.3: "(Feature 9)" entfernt
- Historische Changelog-Einträge unverändert

## v3.0.1 – 2026-04-08
### Hotfix: Serviceverträge .th + Dokumente Layout Mobile

- Serviceverträge: Header-Zeile (.th) hatte kein min-width → quetschte sich auf Mobile → min-width:520px auf .th und alle .tbl>div
- Dokumente: linke Spalte width:440px;flex-shrink:0 überschritt Mobile-Viewport → doc-layout Klasse → flex-direction:column auf ≤768px
- public/CHANGELOG.md: ab sofort synchron mit README Kap. 27 bei jeder Lieferung

## v3.0.0 – 2026-04-08
### Responsive: Weitere Fixes (Projekte, ToDo-Board, Serviceverträge)

**Ursachen & Fixes:**
- **Projekte** — `#proj-list: minmax(480px,1fr)` überschritt auf Mobile den Viewport (430px) → `1fr` auf ≤768px
- **ToDo-Board** — `#kb-board` Media-Queries setzten `repeat(4,minmax(180-200px,1fr))` = 720–800px Mindestbreite auf 430px Screen → Board scrollte unsichtbar nach rechts → `1fr` (1 Spalte) auf Mobile
- **ToDo-Board inneres Grid** — `kbRenderSection` renderte `repeat(4,1fr)` ohne responsive CSS-Klasse → neue Klasse `.kb-section-grid` → `repeat(2,1fr)` auf ≤768px
- **Serviceverträge** — `.tbl` ohne `overflow-x:auto` → Spalten gequetscht → overflow-x + min-width:600px
- **Null-Bug Projekte** — `p.description === "null"` (String) war truthy → wurde als "null" angezeigt → expliziter String-Check

## v2.9.9 – 2026-04-08
### Responsive: Vollständige Prüfung + Fixes (iPhone/iPad/PC)

**Getestet:** iPhone 17 Pro Max (430px), iPad Air 4 (820px), PC (1440px)

**Fixes:**
- ToDo Kanban (kb-board): repeat(4,1fr) → minmax(220px,1fr) + overflow-x:auto
- Webinare KPI-Grid: repeat(4,1fr) → 2 Spalten auf Mobil, 1 Spalte <480px
- Marketing Hub: repeat(3,1fr) → 2-spaltig auf Mobil, 1-spaltig <480px
- Events KPI: repeat(5,1fr) → 3-spaltig Mobil, 2-spaltig <480px
- Competitive Intel: CSS overflow-x:auto für JS-gerenderte Tabelle
- Projekt Kanban: kanban-col min-width 260px + overflow-x:auto
- Projekt Tabs: flex-wrap:wrap bereits vorhanden ✅

**Nicht kritisch (max-width begrenzt nur):** mail, sv-import, tk, wflow


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
### Bugfix: Kalender — executionCtx Fix + Error-Handling

- v2.9.4: c.executionCtx.waitUntil() TypeError → catch ohne events → leerer Kalender
- Fix (v2.9.5): safeWaitUntil, Cache-Miss synchron schreiben
- Fix (v2.9.6): Frontend zeigt Fehlermeldung wenn Backend error liefert
- Erster Load (Cache leer): einmalig 10-18s (Graph-API), danach < 100ms aus D1

## v2.9.6 – 2026-04-08
### Bugfix: Kalender — leerer Kalender bei Graph-API Fehler

- v2.9.4: c.executionCtx.waitUntil() → TypeError → catch ohne events → leer
- v2.9.5: waitUntil gefixt, aber catch-Block gab events:[] nicht mit
- v2.9.6: catch liefert immer events:[] → Frontend nie leer bei Fehler
- Frontend: Error-Banner (kal-err-banner) bei API-Fehler statt leerem Kalender
- console.error für Diagnose im Worker-Log

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

- Ausgeschlossen: Elges (Admin), Burmeister (Einkauf), Eren (KAM),
  Stefan von Busch (Management), Victor von Busch (Management), Ferjani (Service)
- Filterung via EXCLUDED_FROM_QUOTAS Liste in quotas.ts (user_id basiert)

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

**Version:** v3.0.7 &nbsp;|&nbsp; **Live:** https://crm.vonbusch.app &nbsp;|&nbsp; **Repo:** axelweichert/vonbuschos-cloud-crm

