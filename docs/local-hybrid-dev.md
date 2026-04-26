# Local Hybrid Development Guide

Run the backend and frontend on your machine while connecting to the real GCP
services (Firestore, Parakeet STT on Cloud Run) and external APIs (Pioneer NER,
Pioneer SOAP). Verify everything works locally before doing a full GCP deploy.

---

## Architecture overview

```
Your machine
┌──────────────────────────────────────────────────────────────┐
│  frontend_react  ──►  backend (localhost:8000)                │
│                        │                                      │
│                        ├── OpenSearch (localhost:9200)        │
│                        │   Docker container, same as GCP      │
│                        │                                      │
│                        ├──► Firestore        (GCP)            │
│                        ├──► Pioneer NER/SOAP (Pioneer API)    │
│                        └──► Parakeet STT     (Cloud Run)      │
└──────────────────────────────────────────────────────────────┘
              │
              └── gcloud ADC (~/.config/gcloud/application_default_credentials.json)
```

OpenSearch runs locally in Docker — same image and config as GCP.
Everything else calls the real external services.

---

## Prerequisites

```bash
# gcloud CLI installed and authenticated
gcloud auth login
gcloud auth application-default login   # ← required for Firestore SDK

# Python 3.11+
python3 --version

# Docker + Docker Compose
docker --version
docker compose version
```

`gcloud auth application-default login` writes credentials to
`~/.config/gcloud/application_default_credentials.json`.
The Firestore SDK and the Docker Compose file both read from that path.

---

## Step 1 — Configure `.env`

```bash
cp .env.example .env
```

Set these values:

```bash
# ── GCP ───────────────────────────────────────────────────────────────────────
GCP_PROJECT_ID=your-gcp-project-id
GCP_REGION=europe-west1

# ── Vector store: opensearch ──────────────────────────────────────────────────
VECTOR_STORE=opensearch
OPENSEARCH_ADMIN_PASSWORD=Medion!KIS2026
OPENSEARCH_INDEX=viaticum-transcripts

# ── STT: stub for instant responses, parakeet for the real GPU model ──────────
STT_PROVIDER=stub
# STT_PROVIDER=parakeet
# PARAKEET_URL=https://kis-stt-2blt2fbqhq-ew.a.run.app   # URL printed by setup_gcp.sh

# ── Pioneer SLM ───────────────────────────────────────────────────────────────
PIONEER_API_KEY=pio_sk_...
PIONEER_NER_MODEL_ID=f9ebf6b0-6d63-4360-b8d3-82411760ae20
PIONEER_SOAP_MODEL_ID=your-soap-model-id
PIONEER_BASE_URL=https://api.pioneer.ai/v1
```

> **Parakeet URL:** after running `setup_gcp.sh` the URL is printed as
> `Parakeet STT (Cloud Run L4): https://kis-stt-....run.app`.
> Paste it into `PARAKEET_URL` and switch `STT_PROVIDER=parakeet` when you want
> real transcription.

---

## Step 2A — Docker Compose (recommended)

Starts OpenSearch, backend, and frontend together. The compose file mounts your
local gcloud credentials into the backend container so Firestore works.

```bash
make up
```

Or directly:

```bash
docker compose -f docker-compose.kis.yml up -d
```

Services:

| Container | URL |
|-----------|-----|
| Frontend (nginx) | http://localhost:3000 |
| Backend (FastAPI) | http://localhost:8000/docs |
| OpenSearch | https://localhost:9200 |

OpenSearch takes about 60 seconds to become healthy on first start. The backend
waits for it automatically before starting.

### Create the OpenSearch index (first time only)

After the stack is up, create the transcript index with k-NN mapping:

```bash
make opensearch-init
```

Expected output: `{"acknowledged": true, ...}`.
Safe to re-run — it's idempotent.

### Useful commands

```bash
make logs-backend          # tail backend logs
make logs-frontend         # tail nginx logs
make opensearch-status     # check OpenSearch cluster health

# Rebuild backend after code changes
docker compose -f docker-compose.kis.yml build backend
make up
```

---

## Step 2B — Direct Python (fastest iteration)

Run backend with hot-reload outside Docker. Start OpenSearch from Docker first.

### Start OpenSearch only

```bash
docker compose -f docker-compose.kis.yml up opensearch -d
```

Wait for it to be healthy (~60s):

```bash
docker compose -f docker-compose.kis.yml ps opensearch
# Status should show: healthy
```

Then create the index if you haven't yet:

```bash
make opensearch-init
```

### Run the backend

```bash
cd /path/to/viaticum

# Install once
pip install -e backend/

# Source .env
set -a && source .env && set +a

# OPENSEARCH_URL points to localhost because we're outside Docker
OPENSEARCH_URL=https://localhost:9200 \
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

> Inside Docker the backend uses `OPENSEARCH_URL=https://opensearch:9200`
> (Docker service name). Outside Docker use `https://localhost:9200` instead.

### Run the frontend

Option A — open the HTML file directly:

```bash
xdg-open "frontend_react/Medion KIS.html"
```

Option B — serve it with Python (same behaviour as nginx):

```bash
cd frontend_react
python3 -m http.server 3000
# → http://localhost:3000
```

> The frontend talks to the backend at `http://localhost:8000`. If you change
> the port, search for `localhost:8000` in `frontend_react/Medion KIS.html`
> and update it.

---

## Step 3 — Verify services

Run these checks in order to confirm each integration works.

### Backend health

```bash
curl http://localhost:8000/health
```

Expected:

```json
{
  "status": "ok",
  "models_loaded": {
    "stt": "stub",
    "soap": "pioneer",
    "ner": "pioneer",
    "omi": "stub"
  }
}
```

### OpenSearch cluster health

```bash
curl -sk -u admin:Medion!KIS2026 https://localhost:9200/_cluster/health \
  | python3 -m json.tool
```

Expected: `"status": "green"` or `"yellow"` (single-node is always yellow — that's fine).

### Firestore — list patients

```bash
curl http://localhost:8000/patients
```

Expected: `[]` on a fresh project, or seeded patient records.
If you get `403` or `500`, run `gcloud auth application-default login` again.

### Pioneer NER

```bash
curl -s -X POST http://localhost:8000/entities \
  -H "Content-Type: application/json" \
  -d '{"text": "Patient hat Diabetes mellitus und nimmt Metformin 500mg täglich."}' \
  | python3 -m json.tool
```

Expected: list of entities with `type`, `text`, `confidence`, `start`, `end`.

### Pioneer SOAP

```bash
curl -s -X POST http://localhost:8000/soap \
  -H "Content-Type: application/json" \
  -d '{"transcript": "Patient klagt über Kopfschmerzen seit 3 Tagen. Blutdruck 140/90."}' \
  | python3 -m json.tool
```

Expected: `{"S": "...", "O": "...", "A": "...", "P": "..."}`.

### Parakeet STT (only if `STT_PROVIDER=parakeet`)

```bash
# Health check on the Cloud Run service
curl https://kis-stt-2blt2fbqhq-ew.a.run.app/health
```

Expected: `{"status": "ok", "model_loaded": false, "stub_mode": false}`.
`model_loaded` becomes `true` after the first `/transcribe` call (30-60s cold start).

Warmup to pre-load the model:

```bash
curl -X POST https://kis-stt-2blt2fbqhq-ew.a.run.app/warmup
```

---

## What runs where

| Component | Local (this guide) | Full GCP deploy |
|-----------|--------------------|-----------------|
| Frontend | localhost:3000 | Cloud Run |
| Backend | localhost:8000 | Cloud Run |
| OpenSearch | localhost:9200 (Docker) | GCE VM (persistent disk) |
| STT | stub or Cloud Run Parakeet | Cloud Run L4 GPU |
| Firestore | real GCP (same project) | real GCP (same project) |
| Pioneer NER | real Pioneer API | real Pioneer API |
| Pioneer SOAP | real Pioneer API | real Pioneer API |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Backend starts but OpenSearch errors | Wait for `make opensearch-status` to show `green`/`yellow`, then restart backend |
| `index_not_found_exception` | Run `make opensearch-init` |
| `Firestore 403 / permission denied` | `gcloud auth application-default login` |
| `Firestore project not found` | Check `GCP_PROJECT_ID` in `.env` |
| Pioneer returns `401 Unauthorized` | Check `PIONEER_API_KEY` starts with `pio_sk_` |
| Pioneer returns empty entities | Check `PIONEER_NER_MODEL_ID` is `f9ebf6b0-...` |
| Parakeet `/transcribe` times out | Cold start — call `/warmup` first and wait 60s |
| `PARAKEET_URL not set` | Add `PARAKEET_URL=https://...run.app` to `.env` |
| Frontend shows blank / CORS error | Backend not running, or wrong port in the HTML |
| Direct Python: `connection refused :9200` | Use `OPENSEARCH_URL=https://localhost:9200` (not the Docker hostname) |
| OpenSearch TLS cert error | Use `-sk` flag in curl, or set `OPENSEARCH_VERIFY_CERTS=false` |

---

## When everything is green → deploy to GCP

```bash
chmod +x scripts/setup_gcp.sh
./scripts/setup_gcp.sh
```

See [gcp-setup-guide.md](gcp-setup-guide.md) for the full deployment walkthrough.
