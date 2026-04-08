#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# vonBusch CRM – Vollautomatisches Setup
# 
# Voraussetzungen:
#   - Node.js 20+ installiert
#   - Wrangler installiert: npm install -g wrangler
#   - Einmalig authentifiziert:  wrangler login
#
# Ausführen:
#   chmod +x setup.sh
#   ./setup.sh
# ═══════════════════════════════════════════════════════════════

set -e

BOLD='\033[1m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${CYAN}▶ $1${NC}"; }
ok()   { echo -e "${GREEN}✓ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
err()  { echo -e "${RED}✗ $1${NC}"; exit 1; }

echo ""
echo -e "${BOLD}═══════════════════════════════════════${NC}"
echo -e "${BOLD}  vonBusch CRM – Automatisches Setup   ${NC}"
echo -e "${BOLD}═══════════════════════════════════════${NC}"
echo ""

# ── Prüfungen ──────────────────────────────────────────────────
log "Prüfe Voraussetzungen …"

command -v node    >/dev/null 2>&1 || err "Node.js nicht gefunden. Bitte installieren: https://nodejs.org"
command -v wrangler >/dev/null 2>&1 || err "Wrangler nicht gefunden. Bitte installieren: npm install -g wrangler"

NODE_VER=$(node -e "process.exit(parseInt(process.versions.node) < 20 ? 1 : 0)" 2>&1) || \
  err "Node.js 20+ benötigt. Aktuelle Version: $(node --version)"

# Wrangler Login prüfen
if ! wrangler whoami >/dev/null 2>&1; then
  warn "Nicht bei Cloudflare angemeldet."
  echo ""
  echo "  Bitte jetzt anmelden:"
  echo ""
  wrangler login || err "Login fehlgeschlagen."
fi

ACCOUNT=$(wrangler whoami 2>/dev/null | grep -i "account" | head -1 || true)
ok "Cloudflare: $ACCOUNT"

# ── npm install ────────────────────────────────────────────────
log "Installiere Abhängigkeiten (npm install) …"
npm install --silent
ok "npm install abgeschlossen"

# ── D1 Datenbank anlegen ──────────────────────────────────────
log "Lege D1 Datenbank 'vonbusch-crm' an …"

# Prüfen ob bereits vorhanden
D1_EXISTING=$(wrangler d1 list 2>/dev/null | grep "vonbusch-crm" | awk '{print $NF}' || true)

if [ -n "$D1_EXISTING" ]; then
  D1_ID="$D1_EXISTING"
  warn "D1 Datenbank existiert bereits – ID: $D1_ID"
else
  D1_OUTPUT=$(wrangler d1 create vonbusch-crm 2>&1)
  D1_ID=$(echo "$D1_OUTPUT" | grep "database_id" | sed 's/.*database_id = "\(.*\)".*/\1/' | tr -d '"' | tr -d ' ')
  
  if [ -z "$D1_ID" ]; then
    # Fallback: ID direkt aus der List holen
    D1_ID=$(wrangler d1 list 2>/dev/null | grep "vonbusch-crm" | awk '{print $NF}' || true)
  fi
  
  [ -z "$D1_ID" ] && err "D1 Datenbank konnte nicht angelegt werden. Output:\n$D1_OUTPUT"
  ok "D1 Datenbank angelegt – ID: $D1_ID"
fi

# ── D1 ID in wrangler.toml eintragen ─────────────────────────
log "Trage D1-ID automatisch in wrangler.toml ein …"
sed -i.bak "s/REPLACE_WITH_YOUR_D1_ID/$D1_ID/" wrangler.toml
rm -f wrangler.toml.bak
ok "wrangler.toml aktualisiert (database_id = \"$D1_ID\")"

# ── R2 Bucket anlegen ─────────────────────────────────────────
log "Lege R2 Bucket 'vonbusch-crm-docs' an …"

R2_EXISTING=$(wrangler r2 bucket list 2>/dev/null | grep "vonbusch-crm-docs" || true)
if [ -n "$R2_EXISTING" ]; then
  warn "R2 Bucket existiert bereits – wird verwendet"
else
  wrangler r2 bucket create vonbusch-crm-docs >/dev/null 2>&1 || \
    warn "R2 Bucket konnte nicht angelegt werden (möglicherweise bereits vorhanden)"
  ok "R2 Bucket 'vonbusch-crm-docs' angelegt"
fi

# ── D1 Schema migrieren ───────────────────────────────────────
log "Führe D1 Migrationen aus (Schema anlegen) …"
wrangler d1 migrations apply vonbusch-crm --remote 2>&1 | tail -5
ok "D1 Schema migriert"

# ── Seed-Daten laden ──────────────────────────────────────────
log "Lade Seed-Daten (Mitarbeiter, Beispielfirmen, Serviceverträge) …"
wrangler d1 execute vonbusch-crm --remote --file=migrations/seed.sql 2>&1 | tail -3
ok "Seed-Daten geladen"

# ── Worker deployen ───────────────────────────────────────────
log "Deploye Worker nach crm.vonbusch.app …"
echo ""
wrangler deploy 2>&1
echo ""
ok "Worker deployed!"

# ── Fertig ────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}═══════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  ✓ Setup abgeschlossen!               ${NC}"
echo -e "${BOLD}═══════════════════════════════════════${NC}"
echo ""
echo -e "  CRM:  ${CYAN}https://crm.vonbusch.app${NC}"
echo ""
echo -e "${YELLOW}  Nächste Schritte:${NC}"
echo -e "  1. Cloudflare Access konfigurieren:"
echo -e "     Zero Trust → Access → Applications → crm.vonbusch.app"
echo -e "     Identity Provider: Azure AD · Policy: @vonbusch.digital"
echo ""
echo -e "  2. Für automatisches Deploy bei Git-Push:"
echo -e "     GitHub → Settings → Secrets → Actions:"
echo -e "     CLOUDFLARE_API_TOKEN  (CF API Token)"
echo -e "     CLOUDFLARE_ACCOUNT_ID (Cloudflare Account ID)"
echo ""
