# Viaticum KIS — Jury Demo Guide

One page for everything: setup, the story to tell, UI walkthrough, and fallbacks.

---

## Quick start (30 seconds)

```bash
# Make sure .env has your API keys, then:
./scripts/demo.sh
```

The script starts the full stack, verifies every service, runs the backend
pipeline (STT → NER → SOAP → Ingest → RAG search), prints results in the
terminal, and opens `http://localhost:3000` in your browser.

```bash
# Re-transcribe from the WAV and re-ingest from scratch:
./scripts/demo.sh --fresh
```

---

## What the script does

| Step | What happens | Time |
|------|-------------|------|
| 1 | `docker compose up` — starts backend, frontend, OpenSearch | ~10 s |
| 2 | Waits for all three services to report healthy | ~30 s |
| 3 | Creates the `viaticum-transcripts` k-NN index if missing | instant |
| 4 | Checks for an existing transcript in `data/transcripts/`; runs Gradium STT if `--fresh` | 0 / ~2 min |
| 5 | Calls `POST /entities` — Pioneer NER extracts medical entities | ~3 s |
| 6 | Calls `POST /soap` — Pioneer SOAP generates note (stub fallback if model is down) | ~5 s |
| 7 | Calls `POST /ingest` — embeds transcript chunks into OpenSearch (skips if already done) | ~20 s |
| 8 | Runs three sample RAG queries and prints answers with citation counts | ~5 s |
| 9 | Prints demo URLs and opens browser | instant |

---

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| Docker ≥ 24 with Compose plugin | `docker compose version` |
| `python3` in PATH | used by the script for inline JSON processing |
| `.env` with API keys | copy `.env.example` if missing |

**Minimum `.env` values for a full live demo:**

```bash
STT_PROVIDER=gradium
GRADIUM_API_KEY=<your key>
PIONEER_NER_MODEL_ID=3ddb0553-08bf-4d62-bf7b-9a5779ad6e43
PIONEER_API_KEY=<your key>
PIONEER_SOAP_MODEL_ID=e20877cf-a0a4-44be-b14d-a7fa8bea112d   # currently broken on Pioneer's side
VECTOR_STORE=opensearch
```

The demo works without `PIONEER_SOAP_MODEL_ID` — SOAP falls back to a
medically realistic stub note (`provider: stub-fallback`).

---

## The story to tell (narrative)

> "A doctor finishes an intake conversation with a patient. Instead of spending
> 15 minutes typing notes, she opens Medion KIS. Hakîm — her AI companion —
> has already listened to the conversation, extracted every medication,
> symptom, and diagnosis, and drafted a complete SOAP note ready for her
> review. She asks a question in plain German; the system answers with exact
> quotes from the recording, timestamped."

---

## UI walkthrough — step by step

### 1. Login screen (`http://localhost:3000`)

- Shows the **Medion KIS** brand panel with Hakîm's tagline
- Two login methods: **eHBA card** (default) and **Benutzer & PIN**
- Click **"Anmelden & Schicht beginnen"**
- A welcome animation plays, then the app opens on the SOAP screen

### 2. Dashboard → SOAP-Verlauf

The sidebar has:

| Item | What to show |
|------|-------------|
| Tagesübersicht | Patient overview, vitals, ward activity |
| Patienten | Patient list with severity badges |
| **SOAP-Verlauf** | ← start here for the demo |

### 3. SOAP screen — main demo

The screen shows four editable text areas: **S · O · A · P**.

**Companion dock (bottom-right):**

- A floating avatar (Hakîm) with a speech bubble
- Click it to open the **live chat**

#### 3a. Chat — real RAG search

Type or click one of the sample queries:

| Query | What to show |
|-------|-------------|
| `Welche Symptome hat die Patientin?` | Answer from indexed transcript + 3–5 timestamped citations |
| `Welche Medikamente nimmt sie?` | Medications like Ibuprofen 400, Novalgin, Paracetamol |
| `Hat sie bekannte Allergien?` | Penicillin allergy from the dialogue |
| `Welche Diagnosen wurden gestellt?` | Fibromyalgie, Reizdarm, Angststörung |

Each response includes **citation chips** showing the exact quote, timestamp,
and whether it was said by Arzt or Patient.

#### 3b. "Alle Felder vorausfüllen" button

Shown in the Hakîm speech bubble on first load. Clicking it:

1. Calls `POST /soap` with the real patient transcript → fills S/O/A/P
2. Calls `POST /entities` → shows colour-coded entity tags in the sidebar:
   - 🔵 Medication · 🟣 Dosage · 🟡 Symptom · 🔴 Diagnosis · 🟢 Anatomy · 🩷 Procedure

The SOAP provider label appears below the fields:
- **"Pioneer AI"** — real model output
- **"Demo-Vorlage"** — stub (shown when Pioneer SOAP is unavailable)

#### 3c. Hover-suggestions

Hover over any S/O/A/P field for 300 ms → a suggestion card slides in with
the AI-drafted text, a confidence %, and source note. Options: Verwerfen /
Bearbeiten / Übernehmen.

### 4. Companion configuration

Click the ⚙ icon in the chat header:

- Change the companion's **name** (Hakîm, Sînâ, Râzî, …)
- Change **character** (Gelehrt & präzise / Warmherzig / Knapp / Neugierig)
- Choose **colour theme**
- Toggle **tasks** (Transkription, SOAP, ICD-10, Wechselwirkungen, …)

---

## Manual pipeline verification

Run each API endpoint directly if you want to show the backend live:

```bash
# Health
curl http://localhost:8000/health | python3 -m json.tool

# Latest transcript
curl http://localhost:8000/transcribe/latest \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['provider'], len(d['segments']), 'segments')"

# NER — first 3000 chars of transcript
TRANSCRIPT=$(ls -t data/transcripts/*.txt | head -1)
curl -X POST http://localhost:8000/entities \
  -H "Content-Type: application/json" \
  -d "{\"text\": $(python3 -c "import json; print(json.dumps(open('$TRANSCRIPT').read()[:3000]))")}" \
  | python3 -m json.tool

# SOAP
curl -X POST http://localhost:8000/soap \
  -H "Content-Type: application/json" \
  -d "{\"transcript\": $(python3 -c "import json; print(json.dumps(open('$TRANSCRIPT').read()[:4000]))")}" \
  | python3 -m json.tool

# RAG chat
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Welche Medikamente nimmt die Patientin?"}' \
  | python3 -m json.tool
```

---

## Service URLs

| Service | Local URL |
|---------|-----------|
| Frontend (KIS) | http://localhost:3000 |
| Backend API docs | http://localhost:8000/docs |
| OpenSearch | https://localhost:9200 |
| Parakeet STT (Cloud Run) | https://kis-stt-519370311055.europe-west1.run.app |

---

## Known issues for demo day

| Issue | Impact | Workaround |
|-------|--------|------------|
| Pioneer SOAP model returns empty content | SOAP fields show stub note | Tell jury: "Pioneer's model has a known issue; our fallback ensures the workflow still completes" |
| Parakeet Cloud Run: segfault on startup | STT fallback unavailable | Gradium is primary; if Gradium is down, transcription falls back to stub |
| OpenSearch `yellow` cluster status | Single-node, no replicas | Expected for local dev — all queries work normally |
| Frontend Docker health check "unhealthy" | Cosmetic only | nginx is serving; the health probe hits an unreachable port inside the container |

---

## Makefile shortcuts

```bash
make up              # Start everything
make down            # Stop everything
make health          # Check all service health
make logs-backend    # Stream backend logs
make opensearch-init # Re-create the vector index
make restart-backend # Hot-reload backend code changes
make restart-frontend # Rebuild + restart nginx frontend
```

---

## Resetting for a clean demo

```bash
# Wipe transcript files and re-run from the WAV
rm data/transcripts/*.json data/transcripts/*.txt 2>/dev/null || true
./scripts/demo.sh --fresh
```

```bash
# Wipe and re-create the OpenSearch index (deletes all vectors)
curl -X DELETE -u admin:Medion!KIS2026 -k https://localhost:9200/viaticum-transcripts
make opensearch-init
```
