# Diagram generation prompt

Copy the block below and send it to any capable LLM (Claude Opus, GPT-4o, Gemini Ultra).
It will produce a detailed system-architecture diagram in Mermaid, draw.io XML, or ASCII,
depending on what you ask for at the end.

---

## PROMPT — START COPYING HERE

I need a professional system-architecture diagram for a medical AI product called **Viaticum / Medion KIS**.
Please generate it as a **Mermaid flowchart** (top-to-bottom, `flowchart TD`). Use subgraphs to group related components.

Here is the complete system description. Render every component and every labelled data flow.

---

### System name
**Medion KIS** — AI-assisted SOAP documentation for German hospitals.
The AI assistant is named **Hakîm**, inspired by Islamic Golden Age physicians.

---

### Data flow (ordered, top to bottom)

**Step 1 — Audio capture**
- Physical device: **Omi wearable pin** (Nordic Semiconductor USB)
- Streams raw PCM-16 audio at 16 kHz, 80 ms frames
- Protocol: WebSocket `WS /transcribe/stream` to the FastAPI backend
- Fallback input: `omi_simulator.py` replays a `.wav` file with the same protocol

**Step 2 — Speech-to-Text (dual-redundant layer)**
- The backend's `ai_router.py` routes audio to one of two STT backends:
  - **Primary — Parakeet-DE-Med**: NeMo Parakeet model specialised for German medical speech.
    Runs on a dedicated GCE instance (`n1-standard-4` + NVIDIA T4 GPU).
    Called via HTTP POST to `PARAKEET_URL:8001/transcribe`.
  - **Fallback — Gradium API**: Cloud streaming ASR service (24 kHz, 80 ms frames).
    Activated when Parakeet is unavailable (`STT_PROVIDER=gradium`).
  - **Demo stub**: canned German transcript returned if both are offline.
- Both paths return the same output format: `{segments: [{speaker, text, start, end}]}`

**Step 3 — Medical NLP (Pioneer fine-tuned models)**
The transcript is processed by two models in parallel:

- **GLiNER2-DE-Med** (encoder, 205 M params, Pioneer fine-tuned):
  - Extracts medical entities: `medication`, `dosage`, `symptom`, `diagnosis`, `vital_sign`, `anatomy`, `procedure`
  - Also extracts relations: `prescribed_for`, `treats`, `indicates`, `measured_at`
  - Called via Pioneer OpenAI-compatible API (`POST /chat/completions`) with a structured entity-extraction schema
  - Model ID: `PIONEER_NER_MODEL_ID`

- **Gemma-3-4B-SOAP-DE** (decoder, 4 B params, LoRA fine-tuned, Pioneer):
  - Input: German transcript + extracted entities
  - System prompt in `backend/app/prompts/soap_de.txt`: instructs model to output strict JSON
  - Output: `{"S": "Subjektiv", "O": "Objektiv", "A": "Assessment", "P": "Plan"}`
  - Model ID: `PIONEER_SOAP_MODEL_ID`

**Pioneer fine-tuning cycle (offline, iterative):**
1. Generate 300 SOAP pairs + 500 NER examples using Pioneer synthetic data API (German medical domain, privacy-safe, no real patient data)
2. Manual QA: reject hallucinations, review entity labels
3. Fine-tune Gemma-3-4B with LoRA (3 epochs) → SOAP model
4. Fine-tune GLiNER2 (5 epochs) → NER model
5. Evaluate vs. GPT-4o baseline: BERTScore-DE, field-presence %, latency p50/p95
6. Iterate if metrics below threshold

**Step 4 — RAG ingestion**
- Embeddings: `BAAI/bge-m3` (768-dim multilingual SentenceTransformer)
- Production vector store: **OpenSearch 2.14** on GCE `e2-standard-2` with persistent disk
  - Index: `viaticum-transcripts` · k-NN cosine similarity · German text analyzer
  - Fields: `embedding (knn_vector, 768)`, `text`, `speaker`, `start`, `patient_id`, `session`
- Dev fallback: **ChromaDB** (local persistent)
- Switch: `VECTOR_STORE=opensearch|chroma` env var
- Ingestion endpoint: `POST /ingest {segments, soap, patient_id}` → bulk-indexed with SHA1 dedup IDs

**Step 5 — Persistence (Firestore)**
- Each consultation is saved to **Google Firestore** (native mode, `europe-west1`)
- Document path: `consultations/{consultation_id}`
- Fields: `patient_id`, `transcript`, `soap`, `entities`, `created_at`
- Patient records: `patients/{patient_id}` with demographics, diagnoses, allergies

**Step 6 — Hakîm AI companion (frontend agent)**
- Rendered in the KIS static React UI (`frontend_react/screens/companion.jsx`)
- Tamagotchi-style avatar with personality customisation (6 scholar names × 4 characters)
- Capabilities:
  - **SOAP editor** (`POST /soap`): pre-fills all 4 SOAP fields with confidence badges
  - **RAG chat** (`POST /chat`): doctor asks questions in natural German; Hakîm answers with timestamp citations from the transcript
  - **Entity tagger** (`POST /entities`): colour-coded chips (blue=medication, red=symptom, orange=diagnosis, purple=vital_sign)
  - **ICD-10 coder**: triggered on hover over the Assessment field
  - **Drug interaction checker**: live warning before prescribing
  - **Translation**: DE ↔ AR / EN / TR (planned)
  - **Omi memory** (`GET /omi/conversations`, `POST /omi/memory`): recalls past conversations from the wearable
  - **Web search** (planned v2, Tavily): Hakîm can look up current drug information or guidelines
  - **MCP tools** (planned v2): connects to EHR API, lab system, imaging PACS, drug database via Model Context Protocol

**Step 7 — KIS frontend (Medion KIS · 12 screens)**
- Static React 18 (CDN) + Babel standalone, served by nginx
- Screens: Tagesübersicht, Patientenliste, Patientenakte (8 tabs), Stationsübersicht, Intensivstation, OP-Planung, Bildgebung (DICOM), Medikamentenplan (BMP), Überweisungen, SOAP-Dokumentation, Einstellungen
- German specifics: eGK, ICD-10-GM, DRG, eAU/eRezept/ePA, KIM, TI-Konnektor, HBA-Signatur, LANR/BSNR, DSGVO

**Step 8 — KIS form filling**
- **Current (demo)**: AI suggests SOAP text; doctor clicks "Entwurf übernehmen" → populates form fields in the UI with a typewriter animation
- **Planned v2 (OMNI vision)**: OCR reads the active KIS window on-screen → maps SOAP sections to field coordinates → silently fills any KIS system without vendor API access

---

### Infrastructure

```
Local:  make up → opensearch:9200 + backend:8000 + frontend:3000
GCP:
  Cloud Run  → kis-backend  (FastAPI, 2 vCPU, 2 GB RAM)
  Cloud Run  → kis-frontend (nginx, 1 vCPU, 256 MB)
  GCE        → kis-opensearch (e2-standard-2, 20 GB persistent disk)
  GCE        → parakeet-stt (n1-standard-4 + T4 GPU)
  Firestore  → consultations + patients (europe-west1)
  Artifact Registry → Docker image store
  Secret Manager    → API keys + passwords
```

---

### Diagram instructions

Create a **Mermaid `flowchart TD`** diagram with these subgraph groups:

1. `AUDIO_INPUT` — Omi device + simulator
2. `STT_LAYER` — ai_router, Parakeet-DE-Med (GCE T4), Gradium API, stub
3. `NLP_LAYER` — GLiNER2 NER + Gemma SOAP (both via Pioneer API)
4. `PIONEER_TRAINING` — synthetic data → fine-tune → eval loop (shown as a side panel)
5. `RAG` — BAAI/bge-m3 embeddings → OpenSearch (prod) / ChromaDB (dev)
6. `PERSISTENCE` — Firestore
7. `HAKIM_AGENT` — companion avatar, all 7 capabilities
8. `KIS_FRONTEND` — nginx, 12 screens, form fill (current + v2 roadmap)
9. `GCP_INFRA` — Cloud Run × 2 + GCE × 2 + Firestore + Artifact Registry

Use colour classes:
- `classDef hardware fill:#1a3a3a,stroke:#38bdbd,color:#e7edf3`  → Omi hardware
- `classDef stt     fill:#0d3a2a,stroke:#2a9d6a,color:#e7edf3`  → STT components
- `classDef nlp     fill:#1a1a3a,stroke:#5b4cbf,color:#e7edf3`  → NLP / Pioneer
- `classDef rag     fill:#2a1a0d,stroke:#b97509,color:#e7edf3`  → RAG / embeddings
- `classDef store   fill:#1a2a3a,stroke:#2563a8,color:#e7edf3`  → storage
- `classDef agent   fill:#0d2a1a,stroke:#38bdbd,color:#66d4d4`  → Hakîm agent
- `classDef ui      fill:#1a1a1a,stroke:#7c8a9c,color:#e7edf3`  → KIS UI
- `classDef infra   fill:#2a2a1a,stroke:#a07a2c,color:#e7edf3`  → GCP infra
- `classDef planned stroke-dasharray: 5 5`                       → Planned / v2

Label all arrows with the data format or protocol being passed (e.g., "PCM-16 80ms frames", "JSON {S,O,A,P}", "768-dim embedding", "kNN top-5 segments").

## PROMPT — END COPYING HERE

---

## Variant prompts

### For a draw.io / Lucidchart XML diagram
Append to the prompt above:
> "Generate this as draw.io XML (mxGraph format) instead of Mermaid. Use the same subgraph groupings and colour scheme."

### For a clean slide graphic (minimal)
Replace the full prompt with:
> "Generate a minimal Mermaid flowchart (3 levels: Audio → AI Processing → Doctor) for a 60-second pitch slide about the Medion KIS AI pipeline. Show only: Omi pin, STT (Parakeet/Gradium), Pioneer models (NER + SOAP), OpenSearch RAG, Hakîm agent, KIS UI. Keep labels very short. Style: dark background, teal accents."

### For a sequence diagram (data flow)
Append:
> "Also generate a Mermaid `sequenceDiagram` showing one complete consultation: Doctor starts recording → Omi streams audio → backend transcribes → entities extracted → SOAP structured → ingested to OpenSearch → Hakîm displays draft → doctor approves → saved to Firestore."
