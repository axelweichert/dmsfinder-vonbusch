# DMS Finder — von Busch GmbH
## Vollständige Setup-Anleitung

---

## Was ist das?

Eine vollständige Lead-Funnel-Webanwendung für das DMS-Angebot (DocuWare & JobRouter) der von Busch GmbH.  
Besucher durchlaufen einen **Gratis Digitalisierungs-Check** (6 Fragen, max. 42 Punkte), erhalten eine persönliche Empfehlung und können direkt eine Beratungsanfrage stellen.  
Leads landen in einer eigenen D1-Datenbank und können per Klick ins **vonBusch CRM** übertragen werden.

### Projektstruktur

```
dms-finder/
├── index.html                      ← Öffentliche Landing Page (Quiz + Kontaktformular)
├── admin/
│   └── index.html                  ← Admin-Dashboard (nur für von Busch Mitarbeiter)
├── worker.js                       ← Cloudflare Worker: alle API-Endpunkte + E-Mail
├── wrangler.toml                   ← Cloudflare Konfiguration
├── schema.sql                      ← Datenbankstruktur (einmalig ausführen)
├── package.json                    ← npm Abhängigkeiten
├── VER3-NonNatural-Grotesk-Inktrap-Bold-*.otf
├── VER3-Non-Natural-Grotesk-Inktrap-Medium-*.otf
├── VER3-Non-NaturalGrotesk-Inktrap-Regular-*.otf
└── .github/workflows/deploy.yml    ← Auto-Deploy bei jedem Git Push
```

---

## Design & Branding

- **Optik:** identisch zu zt-shield.vonbusch.app (gleiche Design-Sprache)
- **Akzentfarbe:** Lila `#7B5EA7` → `#A07CC5` (Gradient)
- **Dark/Light Mode:** Toggle-Button (🌙/☀️), `localStorage` persistiert, `data-theme` Attribut
- **Schriftart:** Non-Natural Grotesk Inktrap — Regular/Medium/Bold — als Base64 inline in `index.html` eingebettet (kein externes Laden)
- **Logo:** von Busch GmbH oben links im Nav, als Base64 eingebettet
- **Grid-Hintergrund:** nur im Dark Mode aktiv (identisch zu zt-shield)
- **Produkte:** DocuWare DMS + JobRouter Workflow
- **Responsive:** Vollständig mobil-optimiert

---

## Digitalisierungs-Check (6 Fragen)

| Frage | Thema | Punkte |
|---|---|---|
| 1 | Digitale Arbeitsplätze | 1/3/5/7 |
| 2 | Dokumentenverwaltung | 1/3/5/7 |
| 3 | Team-Zusammenarbeit | 1/3/5/7 |
| 4 | Prozessautomatisierung | 1/3/5/7 |
| 5 | Compliance & Archivierung | 1/3/5/7 |
| 6 | Unternehmensgröße | 1/3/5/7 |

**Maximale Punktzahl: 42**

| Score | Label |
|---|---|
| 6–14 | 💡 Einsteiger — Großes Potenzial wartet |
| 15–28 | 📈 Auf dem richtigen Weg |
| 29–35 | 🚀 Digitaler Vorreiter |
| 36–42 | 🏆 Digital Champion |

---

## Datenbank-Schema (D1)

```sql
leads (
  id, name, email, company, position, phone,
  employees, branche, current_system,
  dms_interest, budget, timeline, message,
  score_total, q1_answer … q6_answer,
  status, notes, created_at, updated_at
)
```

**Status-Werte:** `neu` → `bearbeitet` → `gewonnen` / `verloren`

---

## API-Endpunkte

| Methode | Route | Beschreibung |
|---|---|---|
| `POST` | `/api/contact` | Lead speichern + E-Mails senden |
| `GET` | `/api/admin/leads` | Alle Leads abrufen (CF Access) |
| `PATCH` | `/api/admin/leads/:id` | Status/Notizen updaten |
| `GET` | `/api/admin/export` | CSV Download (Excel-kompatibel) |

---

## Wie funktioniert es?

```
Besucher macht Digitalisierungs-Check (6 Fragen)
        │
        ▼
Besucher füllt 4-stufiges Kontaktformular aus
        │
        ▼
POST /api/contact  (worker.js)
        │
        ├──▶ Cloudflare D1 (dms-finder-db)  ← Lead mit Status "neu"
        ├──▶ E-Mail an Kunden               ← Bestätigung + Score-Ergebnis
        └──▶ E-Mail an von Busch            ← Interne Benachrichtigung

CRM Mitarbeiter öffnet Marketing → DMS Finder
        │
        ▼
GET /api/marketing/dms-finder      →  Leads aus DMS_FINDER_DB
PATCH /api/marketing/dms-finder/:id →  Status / Notiz
POST /api/marketing/dms-finder/:id/convert → Firma + Kontakt + Aktivität im CRM
```

---

## Voraussetzungen

- [ ] **Cloudflare Account** `vonbuschthree60` mit Domain `vonbusch.app`
- [ ] **GitHub Account** — Repository `axelweichert/dmsfinder-vonbusch`
- [ ] **Node.js** installiert (LTS)

---

## SCHRITT 1 — GitHub Repository anlegen

1. https://github.com/new → Name: `dmsfinder-vonbusch` → **Private** → **Create repository**
2. ZIP-Inhalt in den Repo-Ordner entpacken
3. Commit: `Initial commit — DMS Finder v1.0.0` → **Push to main**

---

## SCHRITT 2 — Cloudflare API Token & Secrets

**GitHub Secrets** (Repo → Settings → Secrets and variables → Actions):

| Secret Name | Wert |
|---|---|
| `CLOUDFLARE_API_TOKEN` | CF API Token (Edit Workers) |
| `CLOUDFLARE_ACCOUNT_ID` | `6d2a1d5945f8b63047a1d59a9f94de21` |

---

## SCHRITT 3 — D1 Datenbank anlegen

1. Cloudflare → **Workers & Pages → D1 SQL Database → Create database**
2. Name: `dms-finder-db` · Location: **Europe (Western)**
3. **Database ID** kopieren → in `wrangler.toml` eintragen (beide Stellen: hier UND im CRM wrangler.toml)

**Schema einrichten (einmalig):**

D1 Dashboard → `dms-finder-db` → **Console** → Inhalt von `schema.sql` einfügen → **Execute**

---

## SCHRITT 4 — E-Mail Routing einrichten

1. Cloudflare → Domain `vonbusch.app` → **Email → Email Routing → Get started**
2. **Destination address:** `dmsfinder@vonbusch.digital` → Bestätigungsmail klicken
3. **Routing rules:** `dmsfinder` → **Send to a Worker** → `dms-finder`

---

## SCHRITT 5 — Worker Secrets & Bindings

**Workers & Pages → dms-finder → Settings → Variables and Secrets** (jeweils **Encrypt**):

| Variable | Wert |
|---|---|
| `NOTIFY_EMAIL` | `dmsfinder@vonbusch.digital` |
| `FROM_EMAIL` | `noreply@vonbusch.digital` |
| `RESEND_API_KEY` | Resend API Key (für Kunden-Bestätigung) |
| `ADMIN_SECRET` | Langer zufälliger Text (für Notfall) |

**Bindings → Add binding:**

| Type | Variable name | Wert |
|---|---|---|
| D1 Database | `DB` | `dms-finder-db` |
| Send Email | `SEND_EMAIL` | — |

---

## SCHRITT 6 — Custom Domain

Workers & Pages → dms-finder → **Settings → Domains & Routes → Add Custom Domain** → `dms-finder.vonbusch.app`

---

## SCHRITT 7 — Admin-Bereich mit Cloudflare Access absichern

1. **Zero Trust → Access → Applications → Add → Self-hosted**
2. Name: `DMS Finder Admin` · Domain: `dms-finder.vonbusch.app` · Path: `/admin`
3. Policy: **Allow** · Selector: **Emails ending in** → `@vonbusch.digital`

---

## SCHRITT 8 — CRM Integration aktivieren

**Im vonBusch CRM (`vonbuschos-cloud-crm`):**

### 8.1 wrangler.toml — DMS_FINDER_DB Binding eintragen

```toml
[[d1_databases]]
binding = "DMS_FINDER_DB"
database_name = "dms-finder-db"
database_id = "IHRE-D1-ID-HIER"  ← gleiche ID wie oben
```

(Bereits im mitgelieferten CRM wrangler.toml vorhanden — nur ID ersetzen)

### 8.2 CRM deployen

Nach Eintragen der D1-ID in CRM `wrangler.toml` → Commit → Push → Deploy

### 8.3 Testen

CRM → **Marketing → DMS Finder** → Leads erscheinen automatisch nach Formular-Ausfüllungen

---

## SCHRITT 9 — Deploy & Test

Nach jedem Push auf `main` deployt GitHub Actions automatisch.

**Testen:**
1. `https://dms-finder.vonbusch.app` → Quiz durchspielen → Formular absenden
2. D1 Console: `SELECT * FROM leads` → Lead vorhanden?
3. `https://dms-finder.vonbusch.app/admin` → Login mit `@vonbusch.digital` E-Mail
4. CRM → Marketing → DMS Finder → Lead erscheint mit Daten

---

## Alle Secrets & IDs

| Wo | Name | Was |
|---|---|---|
| **GitHub Secrets** | `CLOUDFLARE_API_TOKEN` | CF API Token |
| **GitHub Secrets** | `CLOUDFLARE_ACCOUNT_ID` | CF Account ID |
| **wrangler.toml** | `database_id` | D1 Database ID |
| **CF Worker Secrets** | `NOTIFY_EMAIL` | `dmsfinder@vonbusch.digital` |
| **CF Worker Secrets** | `FROM_EMAIL` | `noreply@vonbusch.digital` |
| **CF Worker Secrets** | `RESEND_API_KEY` | Resend API Key |
| **CF Worker Bindings** | `DB` | D1 `dms-finder-db` |
| **CF Worker Bindings** | `SEND_EMAIL` | Email Routing |
| **CRM wrangler.toml** | `DMS_FINDER_DB` | gleiche D1 `dms-finder-db` |

---

## Admin-Dashboard Funktionen

1. `https://dms-finder.vonbusch.app/admin` öffnen
2. Leads nach Status filtern (Alle / Neu / Bearbeitet / Gewonnen / Verloren)
3. Detail-Ansicht: Score, Quiz-Antworten, Kontakt, Unternehmen, Projektdetails
4. Status und Notizen direkt bearbeiten
5. **→ In CRM übertragen** — legt Firma, Kontakt und Lead-Aktivität an
6. **⬇ CSV Export** → direkt in Excel öffnen (BOM-kodiert)

---

## CRM Integration Detail

Neue Routen in `marketing.ts`:

| Route | Funktion |
|---|---|
| `GET /api/marketing/dms-finder` | Alle Leads aus `DMS_FINDER_DB` |
| `PATCH /api/marketing/dms-finder/:id` | Status/Notizen updaten |
| `POST /api/marketing/dms-finder/:id/convert` | Lead → Firma + Kontakt + Aktivität (Typ: Lead) |

CRM-Ansicht: **Marketing → Lead Magneten → DMS Finder**

---

## Häufige Probleme

**„Worker konnte nicht deployen"** → GitHub Secrets prüfen · Actions Tab → Fehlermeldung

**„E-Mail wird nicht gesendet"** → `FROM_EMAIL` in Email Routing verifiziert? · `SEND_EMAIL` Binding gesetzt?

**„Datenbankfehler"** → D1 Binding `DB` gesetzt? · Schema eingespielt? (`schema.sql` in D1 Console ausführen)

**„Admin-Login funktioniert nicht"** → Access Policy prüfen · E-Mail muss auf `@vonbusch.digital` enden

**„Leads erscheinen nicht im CRM"** → `DMS_FINDER_DB` Binding im CRM `wrangler.toml`? · D1-ID korrekt?

**„CSV öffnet sich falsch in Excel"** → Daten → Aus Text/CSV → Trennzeichen: Semikolon

---

## CHANGELOG

### v1.0.4 — 2026-04-08
- Fix: Footer 1:1 wie ZT Shield — max-width, Datenschutz·Impressum·vonbusch.digital·Built with ♥ rechts
- Fix: Light/Dark-Schalter entfernt — nur Dark Mode

### v1.0.2 — 2026-04-08
- **Fix Admin:** `event.target` TypeError in `loadLeads()` beim automatischen Seitenstart — Filter-Tabs nutzen jetzt `data-status` Attribut für aktives Highlighting; Lead-Liste lädt korrekt beim Öffnen des Admin-Bereichs

### v1.0.1 — 2026-04-08
- Design-Übernahme von zt-shield.vonbusch.app
- Akzentfarbe: Lila `#7B5EA7` (vorher Teal `#00C2A8`)
- Fonts: NNG Regular/Medium/Bold als Base64 direkt in `index.html` eingebettet
- Logo: von Busch GmbH oben links im Nav, Base64-eingebettet
- Dark/Light Mode: Toggle-Button (🌙/☀️), `localStorage`, `data-theme`-Attribut
- Admin: Akzentfarbe ebenfalls auf Lila aktualisiert (war noch Teal/Cyan)

### v1.0.0 — 2026-04-08
- Initiales Release
- Gratis Digitalisierungs-Check (6 Fragen, max. 42 Punkte)
- 4-stufiges Kontaktformular (Kontakt / Unternehmen / Projektdetails / Bestätigung)
- DocuWare & JobRouter Produktsektion
- Admin-Dashboard mit Statusverwaltung, Notizen, Detail-Modal, CSV-Export
- E-Mail-Benachrichtigung intern (CF Email Routing) + Kunden (Resend)
- CRM-Integration: DMS_FINDER_DB Binding + marketing.ts Routen
- CRM Frontend: v-lm-dms View vollständig aktiviert mit Leads, Filter, Detail-Modal, Convert-Funktion
- CF Access Schutz für `/admin`
