# Medion KIS — AI Pipeline Overview

> **Viaticum** · Intelligent SOAP documentation assistant for German hospitals  
> Status: Demo / Proof-of-concept · April 2026

---

## One-sentence pitch

A non-invasive AI scribe that listens to a German clinical consultation via a wearable pin, transcribes it with a medical-grade speech model, extracts structured entities with a fine-tuned NER model, generates a complete SOAP note with a fine-tuned language model, and — through a calm, avatar-driven UI — helps the doctor fill the KIS documentation form without touching a keyboard.

---

## End-to-end pipeline

```
Omi wearable pin
     │  PCM audio · WebSocket frames
     ▼
┌─────────────────────────────────────────────────────┐
│  STT LAYER  (dual-redundant)                        │
│                                                     │
│  Primary ────► Parakeet-DE-Med (NeMo)               │
│                GCE n1-standard-4 + NVIDIA T4        │
│                endpoint: PARAKEET_URL:8001           │
│                                                     │
│  Fallback ───► Gradium Streaming API                │
│                cloud, 24 kHz, 80 ms frames           │
│                env: STT_PROVIDER=gradium            │
└─────────────────────┬───────────────────────────────┘
                      │  segments [{speaker, text, start, end}]
                      ▼
┌─────────────────────────────────────────────────────┐
│  NLP LAYER  (Pioneer fine-tuned models)             │
│                                                     │
│  NER ────────► Pioneer GLiNER2 (205 M encoder)      │
│                fine-tuned on 500 German medical      │
│                synthetic examples                   │
│                labels: medication · dosage ·        │
│                  symptom · diagnosis ·              │
│                  vital_sign · anatomy · procedure   │
│                                                     │
│  SOAP ───────► Pioneer Gemma-3-4B (LoRA, 3 ep.)     │
│                fine-tuned on 300 German dialogue     │
│                → SOAP pairs                         │
│                output: JSON {S, O, A, P}            │
└─────────────────────┬───────────────────────────────┘
                      │
          ┌───────────┴────────────┐
          │                        │
          ▼                        ▼
┌─────────────────┐    ┌──────────────────────────────┐
│  RAG / VECTOR   │    │  PERSISTENCE (Firestore)     │
│  STORE          │    │                              │
│                 │    │  consultations/{id}:         │
│  BAAI/bge-m3    │    │   · patient_id               │
│  768-dim embed. │    │   · transcript segments      │
│                 │    │   · soap {S,O,A,P}           │
│  OpenSearch 2.14│    │   · entities []              │
│  (GCE, prod)    │    │   · created_at               │
│  ChromaDB (dev) │    │                              │
│                 │    │  patients/{patient_id}       │
│  k-NN cosine,   │    │   · name, dob, insurance     │
│  German analyzer│    │   · primary / secondary dx   │
└────────┬────────┘    └──────────────────────────────┘
         │
         │  RAG retrieval
         ▼
┌─────────────────────────────────────────────────────┐
│  HAKÎM — AI COMPANION AVATAR                        │
│  (frontend_react/screens/companion.jsx)             │
│                                                     │
│  Personality: choice of 6 names (Ibn Sînâ,         │
│    Al-Râzî, Zahrâwî …) × 4 characters ×            │
│    6 colour themes · level/XP/bond tracking        │
│                                                     │
│  Capabilities:                                      │
│  ┌─ SOAP editor  ── /soap  → pre-fills S/O/A/P     │
│  ├─ RAG chat     ── /chat  → answers with          │
│  │                           timestamp citations   │
│  ├─ Entity tags  ── /entities → coloured chips     │
│  ├─ ICD-10 coder ── on hover over Diagnose field   │
│  ├─ Drug checker ── live interaction warning       │
│  ├─ Translator   ── DE ↔ AR / EN / TR              │
│  └─ Omi memory   ── /omi/conversations             │
└─────────────────────┬───────────────────────────────┘
                      │  structured SOAP + entities
                      ▼
┌─────────────────────────────────────────────────────┐
│  MEDION KIS FRONTEND  (nginx · static React)        │
│  12 screens incl. SOAP Verlauf · Patientenakte ·    │
│  Intensivstation · OP-Planung · Bildgebung …        │
│                                                     │
│  KIS FORM FILLING:                                  │
│  ● Current (demo):  mocked — AI suggests text,      │
│    doctor clicks "Entwurf übernehmen"               │
│  ● Roadmap (v2):    OCR reads active KIS window     │
│    → OMNI vision maps fields → fills silently       │
└─────────────────────────────────────────────────────┘
```

---

## Component-by-component detail

### 1 · Omi wearable (audio capture)

| Property | Detail |
|---|---|
| Hardware | Omi dev kit · USB 2fe3:0100 (Nordic Semiconductor) |
| Protocol | WebSocket `WS /transcribe/stream` · binary PCM16 frames |
| Frame size | 80 ms · 16 kHz · mono |
| Fallback | `tools/omi_simulator.py` — streams a `.wav` file as if it were the device |
| API | `GET /omi/health` · `GET /omi/conversations` · `POST /omi/memory` |
| Status | ✅ Simulator built · 🔲 Live Omi API pending `OMI_API_KEY` |

---

### 2 · Speech-to-Text layer (dual-redundant)

#### 2a — Parakeet-DE-Med (primary)

| Property | Detail |
|---|---|
| Model | NeMo Parakeet-DE-Med (German medical ASR, CTC-based) |
| Hosting | GCE `n1-standard-4` + NVIDIA T4 GPU · `parakeet-stt` instance |
| API | HTTP `POST :8001/transcribe` — multipart WAV → JSON segments |
| Timeout | 120 s |
| Config | `PARAKEET_URL=http://<internal-ip>:8001` |
| Status | ✅ Client wired · 🔲 VM creation in `setup_gcp.sh` |

#### 2b — Gradium (failover)

| Property | Detail |
|---|---|
| Type | Streaming cloud STT API |
| Frame format | 80 ms PCM, resampled to 24 kHz |
| Trigger | `STT_PROVIDER=gradium` env var, or if Parakeet VM is down |
| Status | 🔲 Interface stubbed · implementation pending |

**Redundancy logic** (`ai_router.py`): The backend tries Parakeet first; on connection error or timeout it falls back to Gradium; if both fail it returns a clearly-labelled stub transcript so the rest of the pipeline stays up for the demo.

---

### 3 · Pioneer fine-tuned models

Both models are trained on **fully synthetic** German medical data — no real patient data ever enters the training pipeline.

#### 3a — GLiNER2-DE-Med (medical NER · encoder, 205 M params)

| Property | Detail |
|---|---|
| Base model | `gliner2-205m` |
| Fine-tuning | Full fine-tune · 5 epochs · Pioneer playground |
| Training data | 500 synthetic German dialogue → entity span pairs |
| Labels | `medication`, `dosage`, `symptom`, `diagnosis`, `vital_sign`, `anatomy`, `procedure` |
| Relations | `prescribed_for`, `treats`, `indicates`, `measured_at` |
| Output | `[{text, type, confidence, start, end}]` |
| Pioneer script | `pioneer/03_finetune_gliner.py` |
| Status | 🔲 Fine-tune pending · stub returns `[]` |

#### 3b — Gemma-3-4B-SOAP-DE (SOAP structuring · decoder, 4 B params)

| Property | Detail |
|---|---|
| Base model | `gemma-3-4b-it` |
| Fine-tuning | LoRA · 3 epochs · Pioneer playground |
| Training data | 300 synthetic German dialogue → SOAP JSON pairs |
| Prompt | `backend/app/prompts/soap_de.txt` — system instruction in German |
| Output | `{"S": "…", "O": "…", "A": "…", "P": "…"}` (strict JSON) |
| Pioneer script | `pioneer/02_finetune_gemma.py` |
| Eval | vs. GPT-4o baseline on 50 held-out examples (`pioneer/04_evaluate.py`) |
| Status | 🔲 Fine-tune pending · stub returns canned SOAP note |

**Synthetic data iteration cycle:**
```
Real clinical examples (de-identified) 
  → Pioneer synthetic data API
  → Manual QA (reject hallucinations)
  → Training JSONL
  → Pioneer fine-tune job
  → Eval: BERTScore-DE, field-presence, latency
  → Iterate if metrics < threshold
```

---

### 4 · RAG system (OpenSearch)

| Property | Detail |
|---|---|
| Embedding model | `BAAI/bge-m3` · 768-dim · multilingual |
| Production store | OpenSearch 2.14 on GCE `e2-standard-2` with persistent disk |
| Dev fallback | ChromaDB (local) — switched by `VECTOR_STORE=chroma` |
| Index | `viaticum-transcripts` · k-NN cosine, German text analyzer |
| Document fields | `embedding`, `text`, `speaker`, `start`, `patient_id`, `session`, `doc_date` |
| Ingest | `POST /ingest {segments, soap, patient_id}` — bulk-indexed with SHA1 dedup IDs |
| Retrieve | k-NN search, optional `patient_id` filter — returns top-N with scores |
| Pre-seeded data | `data/patients/transcripts.jsonl` (35 segments) + `data/patients/soap_history.jsonl` (20 SOAP sections) |
| Seed script | `scripts/seed_opensearch.py` |

The RAG retrieval powers Hakîm's `/chat` endpoint: the doctor types a question like *"Was hat die Patientin über Schmerzen gesagt?"* and the agent retrieves the most relevant transcript segments with speaker labels and timestamps, returns them as citations.

---

### 5 · Hakîm AI companion avatar

Hakîm is a Tamagotchi-style AI assistant embedded in the KIS UI. Named after Islamic Golden Age physicians (Avicenna, Al-Râzî, etc.) to reflect the project's heritage.

**Personality system:**
- 6 scholar name identities
- 4 character modes: *Gelehrt & präzise* / *Warmherzig & geduldig* / *Knapp & klinisch* / *Neugierig & fragend*
- XP / bond / energy tracking per session
- Greeting language: German + Arabic salutation

**Active capabilities (demo):**

| Feature | API call | Notes |
|---|---|---|
| SOAP draft | `POST /soap` | Per-field with confidence score |
| Free chat / RAG | `POST /chat` | Returns answer + `[HH:MM, Speaker]` citations |
| Entity extraction | `POST /entities` | Colour-coded chips |
| ICD-10 suggestion | Local (companion.jsx) | Triggered on Assessment field hover |
| Drug interaction check | Local (companion.jsx) | Pre-loaded interaction list |
| Translation DE↔AR/EN/TR | Planned | Interface exists, backend stub |
| Omi conversation recall | `GET /omi/conversations` | Requires `OMI_API_KEY` |

---

### 6 · KIS form filling (current: mocked · roadmap: OCR)

**Current behaviour (demo):**
1. Hakîm generates a SOAP draft from the transcript
2. Doctor reviews suggestions inline (S / O / A / P fields with confidence badges)
3. Click "Entwurf übernehmen" → text populates the KIS form fields in the UI

**Planned v2 — OMNI vision module:**
1. Screen-capture overlay detects the active KIS window (any vendor)
2. OCR identifies form fields by label proximity
3. OMNI maps SOAP sections → field coordinates
4. Simulates keystrokes to fill the form silently
5. Works without KIS API access — vendor-agnostic

---

### 7 · Data persistence

| Store | Purpose | Stack |
|---|---|---|
| OpenSearch (GCE) | Transcript + SOAP embeddings for RAG | opensearch-py · k-NN |
| Firestore (GCP) | Consultation records per patient | google-cloud-firestore |
| ChromaDB (local dev) | Same as OpenSearch, no Docker needed | chromadb |
| Disk | Raw audio files, logs | Docker volume `./data` |

---

### 8 · Infrastructure & deployment

```
Local dev:    make up  →  opensearch:9200 + backend:8000 + frontend:3000
GCP prod:     scripts/setup_gcp.sh
              ├─ GCE e2-standard-2    → OpenSearch (persistent disk)
              ├─ GCE n1-standard-4+T4 → Parakeet STT server
              ├─ Cloud Run            → kis-backend  (FastAPI, 2 vCPU / 2 GB)
              └─ Cloud Run            → kis-frontend (nginx, 1 vCPU / 256 MB)
Re-deploy:    infra/cloud_run/deploy_kis.sh [--backend-only|--frontend-only]
```

---

### 9 · What is real vs. simulated in the demo

| Component | Status | Detail |
|---|---|---|
| Omi wearable stream | 🟡 Simulated | `tools/omi_simulator.py` streams a `.wav` |
| Parakeet STT | 🔲 Pending VM | Client wired, GCE VM not yet provisioned |
| Gradium STT | 🔲 Stub | Interface defined, SDK not integrated |
| GLiNER2 NER | 🔲 Stub | Returns `[]` until `PIONEER_NER_MODEL_ID` is set |
| Gemma SOAP | 🔲 Stub | Returns canned SOAP until `PIONEER_SOAP_MODEL_ID` is set |
| OpenSearch RAG | ✅ Built | Live with `make up` |
| Hakîm avatar | ✅ Built | Full UI, calls backend |
| KIS form filling | 🟡 Mocked | UI animation only, no real KIS |
| Firestore | ✅ Built | Live when `GCP_PROJECT_ID` is set |
| GCP deploy | ✅ Built | `setup_gcp.sh` ready, needs credentials |

---

### 10 · Planned extensions (v2)

- **Tavily web search** — Hakîm can search PubMed / current drug info live
- **MCP tools** — Hakîm agent connects via Model Context Protocol to: EHR API, lab system, imaging PACS, drug database (ABDA)
- **Real OCR screen fill** — OMNI vision replaces the mocked form animation
- **Live Omi API** — replace simulator with real device stream via `OMI_API_KEY`
- **Evaluation dashboard** — track Pioneer model quality over fine-tune iterations

---

## Tech stack summary (for slides)

| Layer | Technology | Purpose |
|---|---|---|
| Wearable | **Omi dev kit** | Captures ambient clinical audio |
| STT primary | **Parakeet-DE-Med** (NeMo / GCE T4) | German medical ASR |
| STT fallback | **Gradium API** | Cloud streaming fallback |
| NER | **Pioneer GLiNER2** (fine-tuned) | Medical entity extraction |
| SOAP generation | **Pioneer Gemma-3-4B** (LoRA) | Dialogue → structured SOAP |
| Embeddings | **BAAI/bge-m3** | 768-dim multilingual vectors |
| Vector search | **OpenSearch 2.14** (k-NN) | RAG retrieval |
| Persistence | **Google Firestore** | Consultation records |
| Backend | **FastAPI** (Python 3.11) | REST + WebSocket API |
| Frontend | **React 18** + nginx | Medion KIS 12-screen UI |
| Infra | **GCP Cloud Run** + GCE | Container hosting |
| Agent | **Hakîm** (custom) | AI companion in the KIS UI |
| Fine-tuning | **Pioneer playground** | Iterative SLM training |
| Synthetic data | **Pioneer synthetic API** | Privacy-safe training data |
