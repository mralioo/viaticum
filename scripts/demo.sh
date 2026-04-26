#!/usr/bin/env bash
# =============================================================================
#  Viaticum KIS — Demo runner
#  Usage: ./scripts/demo.sh [--fresh]
#
#  --fresh   Re-transcribe the WAV and re-ingest everything from scratch.
#            Without the flag the script skips steps already done.
# =============================================================================

set -euo pipefail
cd "$(dirname "$0")/.."

# ─── Colours ─────────────────────────────────────────────────────────────────
if [ -t 1 ]; then
  BOLD=$'\033[1m' CYAN=$'\033[36m' GREEN=$'\033[32m' YELLOW=$'\033[33m' RED=$'\033[31m' RESET=$'\033[0m'
else
  BOLD= CYAN= GREEN= YELLOW= RED= RESET=
fi

step()  { printf "\n${BOLD}${CYAN}▶ %s${RESET}\n" "$*"; }
ok()    { printf "  ${GREEN}✓ %s${RESET}\n" "$*"; }
warn()  { printf "  ${YELLOW}⚠ %s${RESET}\n" "$*"; }
die()   { printf "\n${RED}✗ %s${RESET}\n" "$*"; exit 1; }
banner(){ printf "\n${BOLD}${CYAN}%s${RESET}\n" "$(printf '═%.0s' $(seq 1 60))"; printf "${BOLD}  %s${RESET}\n" "$*"; printf "${BOLD}${CYAN}%s${RESET}\n" "$(printf '═%.0s' $(seq 1 60))"; }

BACKEND="http://localhost:8000"
FRESH="${1:-}"
DEMO_WAV="tmp/Fibromyalgie, Reizdarm & Angst komplette Anamnese – realistisch & prüfungstauglich - Fachleiter (128k).wav"

# ─── 1. Prerequisites ─────────────────────────────────────────────────────────
banner "Viaticum KIS — Demo Setup"

step "Checking prerequisites"
command -v docker   >/dev/null 2>&1 || die "docker not found"
command -v python3  >/dev/null 2>&1 || die "python3 not found"
command -v curl     >/dev/null 2>&1 || die "curl not found"
ok "docker, python3, curl found"

if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    warn ".env not found — copied from .env.example (add your API keys)"
  else
    die ".env file missing — create one (see docs/demo.md)"
  fi
else
  ok ".env found"
fi

# ─── 2. Start the stack ───────────────────────────────────────────────────────
step "Starting KIS stack (docker compose)"
docker compose -f docker-compose.kis.yml up -d 2>&1 | grep -E "Started|Running|healthy" || true

printf "  Waiting for backend"
for i in $(seq 1 30); do
  if curl -sf "$BACKEND/health" >/dev/null 2>&1; then
    echo ""
    ok "Backend healthy → $BACKEND/docs"
    break
  fi
  printf "."
  sleep 2
done
curl -sf "$BACKEND/health" >/dev/null 2>&1 || die "Backend did not start in 60s"

printf "  Waiting for OpenSearch"
for i in $(seq 1 20); do
  PASS="${OPENSEARCH_ADMIN_PASSWORD:-Medion!KIS2026}"
  if curl -sf -u "admin:$PASS" -k https://localhost:9200/_cluster/health >/dev/null 2>&1; then
    echo ""
    ok "OpenSearch healthy → https://localhost:9200"
    break
  fi
  printf "."
  sleep 3
done

# ─── 3. Ensure OpenSearch index exists ───────────────────────────────────────
step "OpenSearch index"
PASS="${OPENSEARCH_ADMIN_PASSWORD:-Medion!KIS2026}"
INDEX_STATUS=$(curl -sf -u "admin:$PASS" -k -o /dev/null -w "%{http_code}" https://localhost:9200/viaticum-transcripts 2>/dev/null || echo "000")
if [ "$INDEX_STATUS" != "200" ]; then
  warn "Index missing — creating it"
  make opensearch-init
else
  DOC_COUNT=$(curl -sf -u "admin:$PASS" -k https://localhost:9200/viaticum-transcripts/_count 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin).get('count',0))")
  ok "Index exists — $DOC_COUNT documents indexed"
fi

# ─── 4. Transcript ────────────────────────────────────────────────────────────
step "Transcript (Step 1 — STT)"

TRANSCRIPT_TXT=""
TRANSCRIPT_JSON=""

if [ "$FRESH" = "--fresh" ] && [ -f "$DEMO_WAV" ]; then
  warn "--fresh flag: re-transcribing WAV (this takes ~2 min)"
  set -a && source .env && set +a
  python3 scripts/transcribe_wav.py "$DEMO_WAV"
fi

TRANSCRIPT_TXT=$(ls -t data/transcripts/*.txt 2>/dev/null | head -1 || true)
TRANSCRIPT_JSON=$(ls -t data/transcripts/*.json 2>/dev/null | head -1 || true)

if [ -n "$TRANSCRIPT_TXT" ]; then
  LINES=$(wc -l < "$TRANSCRIPT_TXT")
  ok "Transcript ready: $(basename "$TRANSCRIPT_TXT") (${LINES} lines)"
else
  warn "No transcript found in data/transcripts/"
  if [ -f "$DEMO_WAV" ]; then
    warn "Transcribing demo WAV now (requires GRADIUM_API_KEY in .env)"
    set -a && source .env && set +a
    python3 scripts/transcribe_wav.py "$DEMO_WAV"
    TRANSCRIPT_TXT=$(ls -t data/transcripts/*.txt | head -1)
    TRANSCRIPT_JSON=$(ls -t data/transcripts/*.json | head -1)
    ok "Transcribed: $(basename "$TRANSCRIPT_TXT")"
  else
    warn "Demo WAV not found at: $DEMO_WAV"
    warn "Pipeline will use stub responses — NER/search won't return real data"
    TRANSCRIPT_TXT=""
    TRANSCRIPT_JSON=""
  fi
fi

# ─── 5. NER ───────────────────────────────────────────────────────────────────
step "Named Entity Recognition (Step 2 — Pioneer NER)"

if [ -n "$TRANSCRIPT_TXT" ]; then
  NER_JSON=$(curl -sf -X POST "$BACKEND/entities" \
    -H "Content-Type: application/json" \
    -d "{\"text\": $(python3 -c "import json,sys; print(json.dumps(open('$TRANSCRIPT_TXT').read()[:6000]))")}" 2>/dev/null || echo '{}')

  NER_COUNT=$(echo "$NER_JSON" | python3 -c "import json,sys; print(len(json.load(sys.stdin).get('entities',[])))" 2>/dev/null || echo 0)
  NER_PROVIDER=$(echo "$NER_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin).get('provider','?'))" 2>/dev/null || echo "?")

  if [ "$NER_COUNT" -gt 0 ] 2>/dev/null; then
    ok "$NER_COUNT entities extracted (provider: $NER_PROVIDER)"
    echo "$NER_JSON" | python3 -c "
import json, sys
ents = json.load(sys.stdin).get('entities', [])
by_type = {}
for e in ents:
    by_type.setdefault(e['type'],[]).append(e['text'])
for t, vals in sorted(by_type.items()):
    print(f'    {t:12s}: {\" · \".join(vals[:5])}')
" 2>/dev/null || true
  else
    warn "NER returned 0 entities (check PIONEER_NER_MODEL_ID and PIONEER_API_KEY in .env)"
  fi
else
  warn "Skipping NER — no transcript"
fi

# ─── 6. SOAP ──────────────────────────────────────────────────────────────────
step "SOAP Note (Step 3 — Pioneer SOAP)"

if [ -n "$TRANSCRIPT_TXT" ]; then
  SOAP_JSON=$(curl -sf -X POST "$BACKEND/soap" \
    -H "Content-Type: application/json" \
    -d "{\"transcript\": $(python3 -c "import json; print(json.dumps(open('$TRANSCRIPT_TXT').read()[:4000]))")}" 2>/dev/null || echo '{}')

  SOAP_PROVIDER=$(echo "$SOAP_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin).get('provider','?'))" 2>/dev/null || echo "?")
  ok "SOAP note generated (provider: $SOAP_PROVIDER)"
  echo "$SOAP_JSON" | python3 -c "
import json, sys
note = json.load(sys.stdin).get('note', {})
for k in ('S','O','A','P'):
    v = note.get(k, '')
    print(f'    {k}: {str(v)[:70]}…' if len(str(v)) > 70 else f'    {k}: {v}')
" 2>/dev/null || true
else
  warn "Skipping SOAP — no transcript"
fi

# ─── 7. Ingest ────────────────────────────────────────────────────────────────
step "Vector Ingest (Step 4 — OpenSearch)"

if [ -n "$TRANSCRIPT_JSON" ]; then
  DOC_COUNT_BEFORE=$(curl -sf -u "admin:$PASS" -k https://localhost:9200/viaticum-transcripts/_count 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin).get('count',0))" || echo 0)

  if [ "$DOC_COUNT_BEFORE" -gt 0 ] && [ "$FRESH" != "--fresh" ]; then
    ok "Already indexed — $DOC_COUNT_BEFORE documents (skip with --fresh to re-ingest)"
  else
    INGEST_JSON=$(python3 - <<PYEOF
import json, urllib.request
data = json.load(open("$TRANSCRIPT_JSON"))
payload = json.dumps({
    "segments": data["segments"],
    "soap": {},
    "entities": [],
    "patient_id": "patient-demo-001"
}, ensure_ascii=False).encode()
req = urllib.request.Request(
    "$BACKEND/ingest",
    data=payload,
    headers={"Content-Type": "application/json"},
    method="POST"
)
resp = json.loads(urllib.request.urlopen(req, timeout=120).read())
print(json.dumps(resp))
PYEOF
)
    CHUNKS=$(echo "$INGEST_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin).get('chunks_added',0))" 2>/dev/null || echo 0)
    ok "Ingested $CHUNKS chunks into OpenSearch"
  fi
else
  warn "Skipping ingest — no transcript JSON"
fi

# ─── 8. RAG Search ────────────────────────────────────────────────────────────
step "RAG Search (Step 5 — Semantic Query)"

QUERIES=(
  "Welche Symptome hat die Patientin geschildert?"
  "Welche Medikamente nimmt sie?"
  "Hat sie bekannte Allergien?"
)

for Q in "${QUERIES[@]}"; do
  RESULT=$(curl -sf -X POST "$BACKEND/chat" \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"$Q\"}" 2>/dev/null || echo '{}')

  ANSWER=$(echo "$RESULT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('answer','(no answer)'))" 2>/dev/null || echo "(error)")
  CITES=$(echo "$RESULT" | python3 -c "import json,sys; print(len(json.load(sys.stdin).get('citations',[])))" 2>/dev/null || echo 0)
  printf "  ${CYAN}Q:${RESET} %s\n  ${GREEN}A:${RESET} %.80s\n    (%s citations)\n\n" "$Q" "$ANSWER" "$CITES"
done

# ─── 9. Done ──────────────────────────────────────────────────────────────────
banner "Pipeline complete — ready for demo"

printf "\n${BOLD}Service URLs${RESET}\n"
printf "  ${CYAN}%-20s${RESET} %s\n" "KIS Frontend" "http://localhost:3000"
printf "  ${CYAN}%-20s${RESET} %s\n" "Backend API docs" "http://localhost:8000/docs"
printf "  ${CYAN}%-20s${RESET} %s\n" "OpenSearch" "https://localhost:9200"

printf "\n${BOLD}Demo flow (jury)${RESET}\n"
printf "  1. Open ${CYAN}http://localhost:3000${RESET}\n"
printf "  2. Login as Dr. Weber  →  click 'SOAP-Verlauf' in the sidebar\n"
printf "  3. Click the ${CYAN}Hakîm avatar${RESET} (bottom-right) to open the chat\n"
printf "  4. Ask: ${CYAN}Welche Symptome hat die Patientin?${RESET}\n"
printf "  5. Click ${CYAN}Alle Felder vorausfüllen${RESET} — watch NER + SOAP fill in live\n"
printf "  6. Ask: ${CYAN}Welche Medikamente nimmt sie?${RESET} — see citations with timestamps\n"

# Try to open browser (Linux/macOS)
if command -v xdg-open >/dev/null 2>&1; then
  printf "\n${GREEN}Opening browser…${RESET}\n"
  xdg-open "http://localhost:3000" 2>/dev/null || true
elif command -v open >/dev/null 2>&1; then
  open "http://localhost:3000" 2>/dev/null || true
fi

printf "\n"
