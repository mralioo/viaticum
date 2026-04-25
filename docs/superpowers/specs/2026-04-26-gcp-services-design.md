# Viaticum — GCP Services & AI Integration Design Spec

**Date:** 2026-04-26  
**Status:** Approved — proceed to implementation

---

## Goal

Wire three real AI services into the Viaticum backend and deploy the full stack to GCP:

1. **Pioneer SLM** — medical NER (`gliner_extractor.py`) and SOAP structuring (`soap_structurer.py`) via the Pioneer chat completions API
2. **Parakeet-DE-Med STT** — `johannhartmann/parakeet_de_med` running on a GCE VM with T4 GPU, called over HTTP from Cloud Run
3. **Firestore** — GCP-native document store for patient records and consultation history

---

## Architecture

```
Internet
  │
  ├─ React Frontend (Cloud Run / nginx)
  │       │  REST → BACKEND_URL
  │
  ├─ FastAPI Backend (Cloud Run, 2 vCPU / 2 GiB)
  │       │
  │       ├── POST /transcribe ──────→ Parakeet STT VM  (VPC :8001)
  │       ├── POST /entities   ──────→ Pioneer API       (external HTTPS)
  │       ├── POST /soap       ──────→ Pioneer API       (external HTTPS)
  │       ├── POST /ingest     ──┬──→ OpenSearch VM      (VPC :9200)
  │       │                      └──→ Firestore          (managed)
  │       ├── GET  /chat       ──────→ OpenSearch VM      (VPC :9200)
  │       └── GET  /patients   ──────→ Firestore          (managed)
  │
  └─ Omi Device ──WS──→ /transcribe/stream
                              │
                              └──→ Parakeet STT VM

VPC (10.0.0.0/8)  europe-west1
  ├── opensearch-vm   n1-standard-4          port 9200  (existing)
  └── parakeet-stt    n1-standard-4 + T4 GPU port 8001  (new)

GCP Managed
  ├── Firestore        (default database, native mode)
  ├── Secret Manager   PIONEER_API_KEY, OPENSEARCH_PASSWORD
  └── Artifact Registry  europe-west1-docker.pkg.dev/<project>/kis-docker
```

---

## Component 1 — Pioneer NER (`gliner_extractor.py`)

**API call:**
```
POST https://api.pioneer.ai/v1/chat/completions
Authorization: Bearer $PIONEER_API_KEY
Content-Type: application/json

{
  "model": "$PIONEER_NER_MODEL_ID",
  "messages": [{"role": "user", "content": "<German transcript text>"}],
  "schema": {
    "entities": ["medication","dosage","symptom","diagnosis","vital_sign","anatomy","procedure"],
    "relations": ["prescribed_for","treats","indicates","measured_at"],
    "include_confidence": true,
    "include_spans": true
  }
}
```

**Response mapping** — Pioneer returns `entities` array; map to existing `Entity` model:
```
pioneer.entities[i] → {text, type, confidence, start (from spans), end (from spans)}
```

**Env vars:** `PIONEER_API_KEY`, `PIONEER_NER_MODEL_ID`

**Fallback:** if `PIONEER_NER_MODEL_ID` is empty → return stub entities (existing behaviour)

**Router gate change:** the entities router currently checks `STT_PROVIDER == "stub"` — this must be changed to check `PIONEER_NER_MODEL_ID` instead, so NER can run live independently of STT mode.

---

## Component 2 — Pioneer SOAP (`soap_structurer.py`)

**API call:** same endpoint + key, different model ID and schema:
```json
{
  "model": "$PIONEER_SOAP_MODEL_ID",
  "messages": [{"role": "user", "content": "<German transcript>"}],
  "schema": {
    "structures": {
      "soap_note": {
        "fields": [
          {"name": "S", "dtype": "str"},
          {"name": "O", "dtype": "str"},
          {"name": "A", "dtype": "str"},
          {"name": "P", "dtype": "str"}
        ]
      }
    }
  }
}
```

**Response mapping:** `response.structures.soap_note` → `SOAPNote(S, O, A, P)`

**Env vars:** `PIONEER_API_KEY`, `PIONEER_SOAP_MODEL_ID`

---

## Component 3 — Parakeet STT (GCE VM + T4)

### GCE VM spec
| Field | Value |
|-------|-------|
| Name | `parakeet-stt` |
| Zone | `europe-west1-b` |
| Machine | `n1-standard-4` (4 vCPU, 15 GiB RAM) |
| GPU | 1× NVIDIA T4 |
| Boot disk | 50 GiB Debian 12 |
| Network tags | `parakeet-stt` |
| Startup | installs CUDA drivers, Docker, pulls and runs container |

### STT server (`stt_server/`)
New self-contained FastAPI app deployed as a Docker container on the VM:

```
stt_server/
  main.py          # FastAPI: POST /transcribe, GET /health
  Dockerfile       # nvidia/cuda:12.2-runtime-ubuntu22.04 base
  requirements.txt # nemo_toolkit[asr], fastapi, uvicorn, httpx
```

**`POST /transcribe`** input: multipart `audio` file (WAV bytes)  
**Response:**
```json
{
  "segments": [
    {"text": "...", "speaker": "SPEAKER_00", "start": 0.0, "end": 3.2}
  ],
  "duration_s": 3.2,
  "provider": "parakeet"
}
```

Model is loaded once at startup via `nemo_asr.models.ASRModel.from_pretrained("johannhartmann/parakeet_de_med")`.

### Updated `stt_parakeet.py` (Cloud Run backend)
Calls the VM over HTTP instead of loading the model locally:
```python
PARAKEET_URL = os.getenv("PARAKEET_URL", "")

async def transcribe(audio_bytes, sample_rate=16000):
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            PARAKEET_URL + "/transcribe",
            files={"audio": ("audio.wav", audio_bytes, "audio/wav")},
        )
    return resp.json()
```

### Firewall rule
`allow-parakeet-internal`: ingress TCP 8001, tag `parakeet-stt`, source 10.0.0.0/8

### Env var
`PARAKEET_URL=http://<parakeet-internal-ip>:8001`  
Added to Secret Manager as `kis-parakeet-url` and injected into Cloud Run.

---

## Component 4 — Firestore Patient Records

### Collections

**`patients`** (document ID = patient_id)
```json
{
  "id": "P001",
  "name": "Schneider, Maria",
  "dob": "1948-03-12",
  "room": "101",
  "bed": "A",
  "drg": "I21.4 NSTEMI",
  "ews": 4,
  "created_at": "2026-04-26T..."
}
```

**`consultations`** (document ID = auto UUID)
```json
{
  "patient_id": "P001",
  "transcript": [...segments...],
  "soap": {"S": "...", "O": "...", "A": "...", "P": "..."},
  "entities": [...],
  "created_at": "2026-04-26T..."
}
```

### New service: `backend/app/services/firestore_client.py`
```python
# functions: get_patient, list_patients, save_consultation, list_consultations
```

### New router: `backend/app/routers/patients.py`
```
GET  /patients                    → list all patients from Firestore
GET  /patients/{patient_id}       → single patient
GET  /patients/{patient_id}/consultations  → consultation history
```

### Updated `/ingest`
After writing to OpenSearch, also calls `firestore_client.save_consultation(...)`.

### Dependency
`google-cloud-firestore>=2.16` added to `backend/pyproject.toml`.

---

## Infrastructure Updates (`scripts/setup_gcp.sh`)

New steps added to existing script:

**Step A — Enable additional APIs**
`firestore.googleapis.com`, `notebooks.googleapis.com`

**Step B — Firestore database**
```bash
gcloud firestore databases create --location=europe-west1
```
(No-op if already exists.)

**Step C — Parakeet STT VM**
```bash
gcloud compute instances create parakeet-stt \
  --zone=europe-west1-b \
  --machine-type=n1-standard-4 \
  --accelerator=type=nvidia-tesla-t4,count=1 \
  --maintenance-policy=TERMINATE \
  --disk=size=50GB \
  --tags=parakeet-stt \
  --metadata=startup-script=<install CUDA + Docker + run container>
```

**Step D — Firewall**
```bash
gcloud compute firewall-rules create allow-parakeet-internal \
  --direction=INGRESS --action=ALLOW --rules=tcp:8001 \
  --target-tags=parakeet-stt --source-ranges=10.0.0.0/8
```

**Step E — Inject PARAKEET_URL into Cloud Run backend**
After VM is created, get internal IP and update Cloud Run env vars.

---

## Updated `.env.example`

New keys added:
```
# Parakeet STT VM (set after GCE VM is created)
PARAKEET_URL=http://<internal-ip>:8001

# Pioneer (fill in to activate real NER + SOAP)
PIONEER_API_KEY=pio_sk_...
PIONEER_NER_MODEL_ID=f9ebf6b0-6d63-4360-b8d3-82411760ae20
PIONEER_SOAP_MODEL_ID=<soap-model-id>

# Firestore — uses GCP_PROJECT_ID (no extra var needed)
```

---

## File Change Summary

| File | Action |
|------|--------|
| `backend/app/services/gliner_extractor.py` | **Implement** Pioneer NER call |
| `backend/app/services/soap_structurer.py` | **Implement** Pioneer SOAP call |
| `backend/app/services/stt_parakeet.py` | **Implement** HTTP call to STT VM |
| `backend/app/services/firestore_client.py` | **Create** Firestore CRUD helpers |
| `backend/app/routers/patients.py` | **Create** patients + consultations endpoints |
| `backend/app/routers/ingest.py` | **Modify** to also write to Firestore |
| `backend/app/main.py` | **Modify** include patients router |
| `backend/pyproject.toml` | **Modify** add `google-cloud-firestore` |
| `stt_server/main.py` | **Create** FastAPI NeMo server |
| `stt_server/Dockerfile` | **Create** CUDA-based container |
| `stt_server/requirements.txt` | **Create** NeMo + FastAPI deps |
| `scripts/setup_gcp.sh` | **Modify** add Parakeet VM + Firestore steps |
| `.env.example` | **Modify** add new vars |

---

## Deployment Walkthrough (step-by-step)

### Prerequisites
```bash
# 1. Fill in .env
cp .env.example .env
# Set: GCP_PROJECT_ID, GCP_REGION, PIONEER_API_KEY,
#      PIONEER_NER_MODEL_ID, PIONEER_SOAP_MODEL_ID, OPENSEARCH_ADMIN_PASSWORD

# 2. Authenticate
gcloud auth login
gcloud auth application-default login   # for Firestore SDK in local dev
docker login
```

### Deploy
```bash
# Full GCP setup (idempotent — safe to re-run)
chmod +x scripts/setup_gcp.sh
./scripts/setup_gcp.sh

# The script will print:
#   Frontend  : https://kis-frontend-xxxx-ew.a.run.app
#   Backend   : https://kis-backend-xxxx-ew.a.run.app/docs
#   Parakeet  : http://10.x.x.x:8001  (internal)
#   OpenSearch: https://10.x.x.x:9200 (internal)
```

### Verify services
```bash
# Backend health
curl https://kis-backend-xxxx-ew.a.run.app/health
# Expected: {"status":"ok","models_loaded":{"stt":"parakeet","soap":"pioneer","ner":"pioneer",...}}

# Pioneer NER (local test with real key)
STT_PROVIDER=pioneer PIONEER_API_KEY=... PIONEER_NER_MODEL_ID=f9ebf6b0-... \
  .venv/bin/pytest backend/tests/test_entities.py -v

# STT VM health (from inside GCP VPC or via IAP tunnel)
curl http://<parakeet-internal-ip>:8001/health
```

---

## Out of Scope

- HTTPS/TLS on the STT VM internal endpoint (stays HTTP within VPC)
- Authentication on the patients API (demo mode, no auth)
- STT speaker diarisation (segments returned with placeholder SPEAKER_00/01)
- Frontend wiring to `/patients` endpoints (separate frontend task)
