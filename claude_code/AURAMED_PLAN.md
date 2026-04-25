# AuraMed — 48h Solo Hackathon Build Plan

**The Non-Invasive AI Scribe & Vision Assistant for German Hospitals**

> Captures audio on the edge (Omi pin) → transcribes German medical speech on-prem (Parakeet-DE-Med) → structures into SOAP notes (Pioneer-fine-tuned SLM) → fills legacy KIS via CV plugin (OMNI assistant) — all without touching a single hospital API.

---

## 0. North Star & 48h Scope Reality Check

You are **one person, two days**. The pitch is grand; the demo must be tight. Cut ruthlessly.

**Must-have for the demo (Tier 1 — build these or nothing else matters):**

1. A working end-to-end pipeline: **audio in → German SOAP note out**, even if audio is a pre-recorded `.wav` file instead of a live Omi stream.
2. A **Streamlit dashboard** that visually mimics the German KIS screenshots (the `Patientenorganizer` / `Verlaufsbericht` look) and shows the AI **pre-filling** the `Verlaufseintrag` text box.
3. **OMNI** floating assistant overlay (a Streamlit sidebar component is enough) with a chat box that hits a RAG over today's transcripts.
4. **One Pioneer fine-tuned model in the loop** doing one specific job better than GPT-4o. This is your 700€ side-prize lever.

**Nice-to-have (Tier 2 — only if Tier 1 is solid by end of Day 1):**

- Live Omi MCP integration pulling real conversation data.
- CV/OCR screen-scraping demo (use a screenshot, not a real KIS).
- Gradium STT as a fallback / comparison to Parakeet.
- MedGemma for clinical reasoning over the SOAP note.

**Hard cuts (do NOT attempt in 48h):**

- Real on-prem deployment, real GDPR audit, real PEFT training of Parakeet from scratch (the model already exists on HF — just use it).
- Multi-KIS computer-vision generalization. Pick ONE static screenshot and OCR it.
- Native iOS app. Streamlit only. (You said you want to learn iOS — do it after the hackathon.)

---

## 1. System Architecture

Three decoupled layers, each runnable independently so a failure in one doesn't kill the demo.

```
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER A — EDGE CAPTURE                                             │
│  Omi pin (or laptop mic fallback) → 16kHz mono audio                │
│  Audio file or WebSocket stream → Layer B                           │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼  (audio bytes / Omi MCP)
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER B — ON-PREMISE BACKEND (FastAPI on localhost / GCP VM)       │
│                                                                     │
│  ┌──────────────┐   ┌─────────────────┐   ┌──────────────────────┐  │
│  │ STT Service  │ → │ Note Structurer │ → │ RAG / Vector Store   │  │
│  │ Parakeet-DE- │   │ Pioneer SLM +   │   │ ChromaDB local       │  │
│  │ Med (primary)│   │ MedGemma        │   │ embeddings: BGE-M3   │  │
│  │ Gradium      │   │ (SOAP JSON out) │   │                      │  │
│  │ (fallback)   │   │                 │   │                      │  │
│  └──────────────┘   └─────────────────┘   └──────────────────────┘  │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Pioneer GLiNER2 — Medical Entity Extraction                 │    │
│  │ Extracts: drug names, dosages, ICD codes, vitals, symptoms  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                      │
└──────────────────────────────┼──────────────────────────────────────┘
                               ▼  (REST: /transcribe, /soap, /chat, /entities)
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER C — FRONTEND (Streamlit)                                     │
│                                                                     │
│  ┌──────────────────────────┐    ┌─────────────────────────────┐    │
│  │ KIS Mock Dashboard       │    │ OMNI Assistant (sidebar)    │    │
│  │ - Patient list           │    │ - Floating chat box         │    │
│  │ - Vitals / labs panels   │    │ - "Pre-fill this field"     │    │
│  │ - Verlaufseintrag editor │ ←─ │   button → simulates CV+    │    │
│  │ - OCR'd screenshot demo  │    │   keystroke autofill        │    │
│  └──────────────────────────┘    └─────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

**Why this shape works for a solo dev:**
- Each layer is a separate process. You can demo Layer C against a mocked Layer B if anything blows up.
- All "AI" calls go through one internal `ai_router.py` with timeouts and fallbacks. If Parakeet won't load, swap to Gradium API in one line.

---

## 2. Tech Stack — Concrete Picks & Why

| Concern | Pick | Why this, why not the alternatives |
|---|---|---|
| **STT (German medical)** | `johannhartmann/parakeet_de_med` via NeMo, locally | 3.28% WER on Arztbriefe — beats anything generic. Sponsor-aligned (the .md file you gave me). Runs on a single GPU. |
| **STT fallback** | Gradium `stt_realtime` | Sponsor. Cloud, fast, German support, easy `client.stt_stream(...)`. Use as backup if NeMo install fails (it sometimes does). |
| **Note structuring (SOAP)** | **Pioneer fine-tuned Gemma-3 4B** | This is your 700€ play. Fine-tune on synthetic doctor-patient → SOAP pairs generated by Pioneer's synthetic-data tool. Beat GPT-4o on structured German SOAP output. |
| **Entity extraction** | **Pioneer GLiNER2 (205M, fine-tuned)** | Deterministic, structured output, 20-min fine-tunes. Extract drugs/dosages/symptoms/ICD with confidence scores. *This is the second 700€ bonus point.* |
| **Clinical reasoning** | MedGemma 4B (via Pioneer or HF) | Optional Tier 2. Use to answer "What did the patient say about pain?" against the day's transcripts. |
| **Embeddings (RAG)** | `BAAI/bge-m3` (multilingual, German-strong) | Better German than OpenAI embeddings, free, runs locally. |
| **Vector DB** | **ChromaDB** (local, file-backed) | Zero setup. `pip install chromadb`, done. Pinecone is overkill for a 48h demo. |
| **Wearable backend** | Omi MCP | Use the hosted Omi MCP server as a tool — you do NOT need to self-host the full Omi backend in 48h. Pull conversations via `search_conversations` and `get_conversation_by_id`. |
| **Self-hosted Omi backend** | **Skip in 48h** | The full Omi setup needs Firebase, Pinecone, Deepgram, OAuth, Ngrok, and ~2 hours just to wire env vars. Use the hosted MCP instead. If the wearable isn't on stage, mock the audio with a `.wav`. |
| **Backend framework** | FastAPI + Uvicorn | Async, WebSocket-ready, you already know Python. |
| **Frontend** | Streamlit | Fastest path to a demo UI. Not pretty, but the screenshots you uploaded show that German hospital UIs aren't pretty either — that's almost an aesthetic match. |
| **OCR for KIS screenshot** | `pytesseract` + a static screenshot | Tier 2. Don't try to OCR a live screen in 48h. |
| **Cloud / Infra** | Google Cloud (sponsor) | One `e2-standard-4` VM running Docker Compose. Free credits cover the hackathon. Upload the Streamlit demo to Cloud Run for the judges' link. |
| **Audio capture (laptop)** | `sounddevice` + `soundfile` | When Omi pin isn't around, record with your MacBook mic. Same 16kHz mono format. |

---

## 3. Repo Layout

```
auramed/
├── README.md
├── docker-compose.yml               # one-shot startup of all services
├── .env.example
│
├── backend/
│   ├── pyproject.toml
│   ├── app/
│   │   ├── main.py                  # FastAPI entrypoint
│   │   ├── routers/
│   │   │   ├── transcribe.py        # POST /transcribe (file or WS)
│   │   │   ├── soap.py              # POST /soap (transcript → SOAP JSON)
│   │   │   ├── entities.py          # POST /entities (GLiNER2 extraction)
│   │   │   ├── chat.py              # POST /chat (RAG over today's notes)
│   │   │   └── omi.py               # GET /omi/conversations (MCP proxy)
│   │   ├── services/
│   │   │   ├── stt_parakeet.py
│   │   │   ├── stt_gradium.py
│   │   │   ├── ai_router.py         # picks STT/SLM, handles fallback
│   │   │   ├── soap_structurer.py   # Pioneer fine-tuned model client
│   │   │   ├── gliner_extractor.py
│   │   │   ├── rag.py               # Chroma + bge-m3
│   │   │   └── omi_mcp_client.py
│   │   ├── models/                  # Pydantic schemas: SOAPNote, Entity, Segment
│   │   └── prompts/
│   │       ├── soap_de.txt
│   │       └── chat_de.txt
│   └── tests/
│
├── frontend/
│   ├── streamlit_app.py             # main entrypoint
│   ├── pages/
│   │   ├── 1_Patientenorganizer.py  # mimics EHR-example2 PDF
│   │   ├── 2_ZNA_Triage.py          # mimics EHR-example1 PDF
│   │   └── 3_Live_Consultation.py   # the magic page: audio → SOAP → KIS
│   └── components/
│       ├── omni_assistant.py        # the "Clippy" chat sidebar
│       └── kis_mockup.css
│
├── pioneer/
│   ├── 01_generate_synthetic_data.py    # Pioneer synthetic data API
│   ├── 02_finetune_gemma.py             # fine-tune SLM for SOAP
│   ├── 03_finetune_gliner.py            # fine-tune GLiNER2 for medical NER
│   ├── 04_evaluate.py                   # eval against GPT-4o baseline
│   ├── datasets/
│   │   ├── soap_pairs.jsonl
│   │   └── medical_ner.jsonl
│   └── README.md
│
├── data/
│   ├── sample_conversations/        # the .wav files you'll provide
│   ├── sample_screenshots/          # the EHR PDFs as PNGs for OCR
│   └── chroma_db/                   # vector store, gitignored
│
└── claude_code/
    ├── AGENTS.md                    # the multi-agent prompt manifest
    ├── agent_specs/
    │   ├── backend_agent.md
    │   ├── frontend_agent.md
    │   ├── pioneer_agent.md
    │   ├── omi_agent.md
    │   └── integration_agent.md
    └── runbook.md                   # how to invoke each agent
```

---

## 4. Multi-Agent Claude Code Strategy

The trick with a 48-hour solo build is that **you become the orchestrator** and Claude Code becomes 5 specialised sub-developers. Each agent owns a vertical slice, has its own context, and you (the human) stitch their outputs together.

Use `claude` in your terminal with `/agents` to spawn each one in its own session, OR use one Claude Code session and switch sub-agents via the `Task` tool. I'd recommend **separate terminal panes** (tmux/VS Code splits) — easier to debug.

### Agent 1 — `backend-agent` (the FastAPI builder)

**Owns:** `backend/` directory. Nothing else.
**Mission:** Build the FastAPI service with all 4 routers, both STT services, and the AI router with fallbacks.
**Stop conditions:** All endpoints return valid responses to a `curl` test using the sample audio file. Pioneer/Parakeet calls happen via stub clients if the real models aren't loaded yet.
**Key prompt instructions:**
- Use `httpx.AsyncClient` for all external calls. 30s timeouts.
- Every route returns a Pydantic model, never a raw dict.
- Log every external API call to `backend/logs/` with timestamp + latency. The judges will love a "we measured" graph.
- Write `pytest` tests for each route using a stub audio file before asking the user (you) to run anything.

### Agent 2 — `frontend-agent` (the Streamlit + OMNI UI)

**Owns:** `frontend/` directory.
**Mission:** Build the 3-page Streamlit app that mimics the German KIS screenshots and renders OMNI as a sticky chat assistant.
**Stop conditions:** All 3 pages render against a fully-mocked backend (FastAPI returns canned JSON). The OMNI chat works against `/chat`. The "Pre-fill Verlaufseintrag" button works.
**Key prompt instructions:**
- Read `data/sample_screenshots/EHR-example2.png` and reproduce the **layout** in CSS (column headers, row colors, the green/red status icons). It doesn't need to be pixel-perfect; it needs to read as "this is a German hospital app".
- All German UI labels stay in German: `Patientenorganizer`, `Verlaufseintrag`, `Aufnahmediagnose`, etc.
- OMNI lives in `st.sidebar` with a custom CSS class that pins it to the bottom-right and gives it a Clippy-style speech bubble. No actual paperclip — use a stethoscope emoji 🩺 or a simple AI dot.
- Read `/mnt/skills/public/frontend-design/SKILL.md` before writing any CSS.

### Agent 3 — `pioneer-agent` (the fine-tuning specialist)

**Owns:** `pioneer/` directory.
**Mission:** Generate synthetic SOAP-pair training data, fine-tune a small Gemma on Pioneer, fine-tune GLiNER2 for medical NER, run an eval vs GPT-4o, save the model IDs to `.env`.
**Stop conditions:** Two model IDs (`PIONEER_SOAP_MODEL_ID`, `PIONEER_NER_MODEL_ID`) deployed and reachable via Pioneer's `/inference` endpoint, with eval numbers showing the fine-tunes beat (or match-cheaper) GPT-4o on the held-out test set.
**Key prompt instructions:**
- Generate **300 synthetic German doctor-patient → SOAP** pairs using Pioneer's synthetic data API. Schema in `pioneer/datasets/soap_pairs.jsonl` (chat SFT format).
- Generate **500 NER examples** with labels: `MEDICATION`, `DOSAGE`, `SYMPTOM`, `DIAGNOSIS`, `VITAL_SIGN`, `ANATOMY`, `PROCEDURE`. Include confidence-relevant edge cases (off-label drugs, rare conditions).
- Fine-tune for 3-5 epochs each. GLiNER2 takes ~20 min per the docs; Gemma will be longer — kick it off **first thing Day 1**.
- Eval script: F1 for NER, BERTScore + structured-field-match for SOAP. Save eval table as `pioneer/eval_results.md` for the demo slide.

### Agent 4 — `omi-agent` (the wearable integrator)

**Owns:** `backend/app/services/omi_mcp_client.py` and a tiny mobile-companion-app stub.
**Mission:** Connect to Omi's MCP server, expose its tools (`search_conversations`, `get_conversation_by_id`, `create_memory`) as internal Python helpers. If you have an actual Omi device by demo time — wire the live audio. If not, build a fake-Omi script that streams a `.wav` file as if it were the device.
**Stop conditions:** A function `omi_client.fetch_today_conversations(user_id)` returns a list of `Conversation` Pydantic objects. A second function `omi_client.simulate_live_stream(wav_path)` emits the same shape from a local file.
**Key prompt instructions:**
- Use the Omi MCP via `mcp` Python package or direct HTTP if MCP is too heavy.
- Document the **24-hour worst-case fallback**: if the MCP is rate-limited or you don't have an account by Day 1, ship the local-wav simulator only and label it "Omi simulator" in the demo. Be honest with the judges.
- Do NOT try to self-host the full Omi backend (Firebase + OAuth + Pinecone + Ngrok). It's a 4-hour rabbit hole. The MCP gives you everything you need from the cloud.

### Agent 5 — `integration-agent` (the glue & demo runner)

**Owns:** `docker-compose.yml`, `README.md`, the demo script, the Cloud Run deploy.
**Mission:** Wire everything together, write the README + 3-minute demo script, deploy to Cloud Run.
**Stop conditions:** `docker-compose up` brings up backend + frontend + chroma. A judge clones the repo, runs one command, and clicks through the demo.
**Key prompt instructions:**
- The README must include the **architecture diagram** (ASCII or Mermaid), the **30-second pitch**, the **eval numbers**, and a **"how each sponsor tech is used"** section. Sponsors LOVE seeing their logo — call out Omi, Pioneer, Gradium, Google Cloud explicitly.
- Demo script is a `.md` checklist: every click, every audio file, every expected output. You will be tired and nervous on stage; the script saves you.

### How to actually run them in parallel

```
# In claude_code/runbook.md, document this:

# Day 1, 09:00 — kick off all 5 agents in parallel terminal panes.
# Each agent gets its own scoped instruction file.

# Pane 1: Backend
cd auramed && claude --append-system-prompt "$(cat claude_code/agent_specs/backend_agent.md)"

# Pane 2: Frontend
cd auramed && claude --append-system-prompt "$(cat claude_code/agent_specs/frontend_agent.md)"

# Pane 3: Pioneer (longest job — start it first, let it cook)
cd auramed && claude --append-system-prompt "$(cat claude_code/agent_specs/pioneer_agent.md)"

# Pane 4: Omi (smallest, can run last on Day 1)
# Pane 5: Integration (kicks in Day 2)
```

---

## 5. 48-Hour Hour-by-Hour Plan

### Day 1 (Saturday)

| Time | Block | Output |
|---|---|---|
| 08:00–09:00 | **Setup**: GCP VM, repo skeleton, all `.env` keys (Pioneer, Omi, Gradium, OpenAI for GPT-4o baseline). Push `agent_specs/*.md` to the repo. | Empty repo, all credentials working. Run `curl https://api.pioneer.ai/...` and `curl https://api.gradium.ai/...` to confirm. |
| 09:00–10:00 | **Pioneer agent kickoff** (longest cook time). Generate synthetic data + start GLiNER2 fine-tune (~20 min). Start Gemma fine-tune in parallel (~1-2h). | Synthetic dataset committed. Two fine-tune jobs running. |
| 09:00–13:00 (parallel) | **Backend agent**: scaffold FastAPI, `/transcribe` with Parakeet (or fall back to Gradium if NeMo install eats >1h), `/soap` stub returning canned JSON. | `curl -F "audio=@sample.wav" localhost:8000/transcribe` returns German text. |
| 09:00–13:00 (parallel) | **Frontend agent**: 3 Streamlit pages, KIS visual mock, OMNI sidebar. Hits backend stub. | Streamlit shows the patient list, Verlaufseintrag editor, and OMNI bubble. |
| 13:00–14:00 | **Lunch + integration sync.** Connect frontend to real backend. Fix the things that don't match. | Live audio file → real transcript → mocked SOAP → rendered in UI. |
| 14:00–17:00 | **SOAP loop alive**: Pioneer Gemma should be done. Wire `/soap` to call Pioneer. Wire GLiNER2 to `/entities`. Build the "AI suggests these entities, doctor approves" UX in the Verlaufseintrag panel. | End-to-end demo works for the first time, even if rough. |
| 17:00–19:00 | **OMI integration**: hook MCP client. If Omi device is on hand, do a real recording test. If not, polish the wav-simulator. | One demo path uses real Omi MCP, fallback path uses local wav. |
| 19:00–21:00 | **RAG**: ingest today's transcripts into Chroma. Wire `/chat`. Test "What did the patient say about chest pain?" type queries. | OMNI chat answers questions about today's conversations. |
| 21:00–23:00 | **Pioneer eval**: run fine-tuned models vs GPT-4o on held-out test set. Save numbers. | `eval_results.md` with a clean table. |
| 23:00 | **Sleep**. Non-negotiable. A tired demo is a bad demo. | |

### Day 2 (Sunday)

| Time | Block | Output |
|---|---|---|
| 08:00–10:00 | **Polish pass 1**: every UI rough edge. German text everywhere it should be. Loading spinners. Error states. | UI feels real. |
| 10:00–12:00 | **OCR demo** (Tier 2): pytesseract on the EHR screenshot, highlight detected fields, show how AI maps SOAP fields → form fields. Static, but visually striking. | "Non-invasive CV plug-in" demo slide is real, not just claimed. |
| 12:00–13:00 | **Lunch + buffer for The Thing That Will Break**. Something always breaks. | |
| 13:00–15:00 | **Cloud Run deploy** + ngrok URL + final README. Architecture diagram. Eval table. Sponsor callouts. | Public URL judges can click. |
| 15:00–17:00 | **Demo script + dry run x3**. Time it. Cut anything that doesn't fit in 3 minutes. | A scripted 3-minute demo you can do half-asleep. |
| 17:00–19:00 | **Slide deck** (5 slides max): problem, solution, demo gif, sponsor stack, ask. | Slides ready. |
| 19:00 | **Submit + present.** | 🏆 |

---

## 6. Doctor-Patient Conversation Pipeline — End-to-End Flow

When you give me the sample conversations, here's exactly how each one will flow through the system:

```
                                            SAMPLE INPUT
                  ┌──────────────────────────────────────────────────┐
                  │ German doctor-patient dialogue (.wav, 16kHz mono)│
                  └──────────────────────────────────────────────────┘
                                       │
                                       ▼
            ┌─────────────────────────────────────────────────┐
            │ Step 1: Transcription                           │
            │ - Parakeet-DE-Med via NeMo                      │
            │ - Returns: List[Segment{speaker, text, t_start}]│
            │ - 3.28% WER target                              │
            └─────────────────────────────────────────────────┘
                                       │
                                       ▼
            ┌─────────────────────────────────────────────────┐
            │ Step 2: Speaker labeling                        │
            │ - Heuristic: longer formal sentences → Doctor   │
            │ - Or use Pioneer GLiNER2 classifier on segments │
            │ - Returns: same segments + role: 'doctor'/'pt'  │
            └─────────────────────────────────────────────────┘
                                       │
                                       ▼
            ┌─────────────────────────────────────────────────┐
            │ Step 3: Medical NER (Pioneer GLiNER2 fine-tune) │
            │ - Inputs: full transcript                       │
            │ - Outputs: structured entities w/ confidence    │
            │   {medication: [{name:"Ramipril", dose:"5mg"}], │
            │    symptom: [{name:"Brustschmerz", severity:?}],│
            │    vital: [{name:"Blutdruck", value:"160/95"}]} │
            └─────────────────────────────────────────────────┘
                                       │
                                       ▼
            ┌─────────────────────────────────────────────────┐
            │ Step 4: SOAP structuring (Pioneer Gemma FT)     │
            │ - Inputs: transcript + entities                 │
            │ - Prompt template: prompts/soap_de.txt          │
            │ - Output: strict JSON                           │
            │   {S: "...", O: "...", A: "...", P: "..."}      │
            │   in formal Arztbrief German                    │
            └─────────────────────────────────────────────────┘
                                       │
                                       ▼
            ┌─────────────────────────────────────────────────┐
            │ Step 5: Persist to RAG                          │
            │ - Chunk: per-segment + full SOAP                │
            │ - Embed: bge-m3                                 │
            │ - Store: ChromaDB collection 'today_<date>'     │
            └─────────────────────────────────────────────────┘
                                       │
                                       ▼
            ┌─────────────────────────────────────────────────┐
            │ Step 6: KIS pre-fill (the demo's WOW moment)    │
            │ - Frontend gets SOAP JSON                       │
            │ - Maps to Verlaufseintrag fields                │
            │ - OMNI bubble: "I drafted this — approve?"      │
            │ - One click → text appears in the form         │
            │   (simulating the keystroke autofill)           │
            └─────────────────────────────────────────────────┘
                                       │
                                       ▼
            ┌─────────────────────────────────────────────────┐
            │ Step 7: OMNI chat (always available)            │
            │ - User: "Was hat die Patientin zum Schmerz      │
            │          gesagt?"                               │
            │ - RAG retrieves matching segments               │
            │ - Pioneer SLM (or MedGemma) answers in German   │
            │   with citation: "[14:32, Patient: '...']"      │
            └─────────────────────────────────────────────────┘
```

---

## 7. Per-Technology Cheat Sheet

### Parakeet-DE-Med
```python
import nemo.collections.asr as nemo_asr
model = nemo_asr.models.ASRModel.from_pretrained("johannhartmann/parakeet_de_med")
# Make sure audio is 16kHz mono. If not, librosa.resample first.
result = model.transcribe(["consultation.wav"], return_hypotheses=True)
text, score = result[0].text, result[0].score
```
**Gotcha:** NeMo install can take 15+ minutes and break on M-series Macs. Have the Gradium fallback ready.

### Gradium (fallback STT)
```python
import gradium
client = gradium.client.GradiumClient(api_key=os.environ["GRADIUM_API_KEY"])
async with client.stt_realtime(model_name="default", input_format="pcm") as stt:
    for chunk in audio_chunks_24k_mono_pcm16:  # 1920 samples = 80ms
        await stt.send_audio(chunk)
    await stt.send_flush(flush_id=1)
    async for msg in stt:
        if msg["type"] == "text":
            print(msg["text"])
        elif msg["type"] == "flushed":
            break
```
**Gotcha:** Gradium wants 24kHz PCM, Parakeet wants 16kHz. Have a `resample()` helper.

### Pioneer (fine-tune + inference)
```python
import os, requests
PIONEER_KEY = os.environ["PIONEER_API_KEY"]  # starts with pio_sk_
HEADERS = {"X-API-Key": PIONEER_KEY, "Content-Type": "application/json"}

# 1. Generate synthetic data
r = requests.post("https://api.pioneer.ai/synthetic-data",
    headers=HEADERS,
    json={"task": "chat", "description": "German doctor-patient dialogue → SOAP note JSON",
          "num_samples": 300, "language": "de"})

# 2. Fine-tune
r = requests.post("https://api.pioneer.ai/felix/training-jobs",
    headers=HEADERS,
    json={"base_model": "gemma-3-4b-it", "dataset_id": "<id from step 1>",
          "method": "lora", "epochs": 3})

# 3. Inference
r = requests.post("https://api.pioneer.ai/inference",
    headers=HEADERS,
    json={"model_id": "<deployed_id>", "task": "chat",
          "messages": [{"role": "user", "content": transcript}]})
soap_json = r.json()
```
**Gotcha:** Use the OpenAI-compatible endpoint (`/v1/chat/completions` with `base_url=https://api.pioneer.ai/v1`) if you want to drop into existing OpenAI SDK code with one line.

### Pioneer GLiNER2 (medical NER)
```python
# After fine-tuning a GLiNER2 on your medical_ner.jsonl
from gliner import GLiNER  # or use Pioneer hosted /inference

extractor = GLiNER.from_pretrained("<your-finetuned-id>")
schema = (extractor.create_schema()
    .entities({
        "medication": "Drug names, e.g. Ramipril, Pantoprazol",
        "dosage":     "Strength + frequency, e.g. 5mg 1-0-1",
        "symptom":    "Patient-reported complaints",
        "vital_sign": "Blood pressure, heart rate, temperature",
        "diagnosis":  "ICD-relevant findings",
    })
    .classification("urgency", ["routine", "urgent", "emergency"])
    .relations(["dose_of", "treats"]))

results = extractor.extract(transcript, schema)
```

### Omi MCP
```python
# Two paths — pick the simpler one for the hackathon

# Path A: HTTP directly (recommended for speed)
import httpx
omi_client = httpx.AsyncClient(
    base_url="https://api.omi.me",
    headers={"Authorization": f"Bearer {os.environ['OMI_API_KEY']}"})

async def search_today(uid: str, query: str):
    r = await omi_client.post("/v1/conversations/search",
        json={"uid": uid, "query": query, "limit": 20})
    return r.json()

# Path B: Real MCP via the python-mcp client
# Documented at https://docs.omi.me/doc/developer/mcp/setup
# Heavier to wire up. Skip unless you have time.
```

### Gemma / MedGemma via Pioneer
Pioneer hosts Gemma-class models. After fine-tuning, MedGemma is also available via Pioneer's model catalog (check `/llms-full.txt#available-models`). Use the OpenAI-compatible endpoint to keep code simple.

### Google Cloud setup (10-minute version)
```bash
gcloud auth login
gcloud config set project auramed-hack
# Create VM
gcloud compute instances create auramed-vm \
  --machine-type=e2-standard-4 --image-family=debian-12 \
  --image-project=debian-cloud --boot-disk-size=50GB
# SSH and install Docker
gcloud compute ssh auramed-vm --command='curl -fsSL https://get.docker.com | sh'
# For the demo URL, use Cloud Run with the prebuilt Streamlit container.
```

### ChromaDB (local, file-backed)
```python
import chromadb
from sentence_transformers import SentenceTransformer

client = chromadb.PersistentClient(path="./data/chroma_db")
embedder = SentenceTransformer("BAAI/bge-m3")

col = client.get_or_create_collection("today_2026_04_25")
col.add(
    ids=[f"seg_{i}" for i in range(len(segments))],
    embeddings=embedder.encode([s.text for s in segments]).tolist(),
    documents=[s.text for s in segments],
    metadatas=[{"speaker": s.speaker, "t": s.t_start} for s in segments],
)
```

---

## 8. The OMNI Assistant — Concrete Behavior

OMNI is the demo's emotional hook. It's the thing that makes a judge say "oh, that's nice." Spec it carefully.

**Visual:** Bottom-right floating chat bubble in Streamlit. Two states:
- **Idle:** small circular avatar (use a stethoscope SVG or a soft glowing dot). Pulses gently.
- **Active:** expands to a 320×480 chat panel.

**Three behaviors to demo, in order:**

1. **Proactive pre-fill** — when the doctor opens a patient row, OMNI says (in German):
   > "Ich habe heute Morgen ein SOAP-Protokoll aus Ihrem Gespräch um 09:14 Uhr entworfen. Soll ich es in den Verlaufseintrag einfügen?"
   ("I drafted a SOAP note from your 09:14 conversation. Shall I insert it into the progress note?")
   Buttons: `Einfügen` / `Anzeigen` / `Verwerfen`.

2. **Field-aware help** — when the doctor clicks the `Diagnose` field, OMNI suggests:
   > "Aus dem Gespräch erkannt: 'Akute respiratorische Insuffizienz, anderorts nicht klassifiziert' (J96.0, Konfidenz 0.92). Übernehmen?"
   The ICD code comes from GLiNER2's structured output.

3. **Free chat / RAG** — doctor types: *"Was hat die Patientin über ihren Sturz gesagt?"* → OMNI cites the exact segment with timestamp.

**Implementation:**
- Custom HTML/CSS injected via `st.markdown(unsafe_allow_html=True)` for the floating bubble.
- A `st.chat_input` inside an `st.sidebar` for the conversation.
- All three behaviors hit `/chat` with different `mode` params (`prefill`, `field_assist`, `free_chat`).

---

## 9. Pitch Talking Points (memorize these)

When the judges ask "why is this not just another medical scribe?":

1. **Non-invasive integration.** Every other German medical AI startup is stuck negotiating API access with KIS vendors. We bypass that with computer vision. Deployment in days, not quarters.
2. **On-premise + GDPR.** The transcription model runs locally. Data sovereignty is built-in, not bolted-on.
3. **The fine-tuned SLM is faster, cheaper, and more accurate** for German SOAP notes than GPT-4o. Show the eval table. (This is your Pioneer prize moment.)
4. **DRG revenue protection.** Every hospital exec understands: undocumented = unbilled. We capture every detail.
5. **44% of the day back.** That's the German benchmark. The story is "give doctors their afternoons back."

When asked about competitors (DeepScribe, Suki, Abridge):
> "All US-trained, all English-first, all cloud-only. None of them speak Arztbrief German. None of them solve the KIS interop problem. We're built for German hospitals from the ground up."

---

## 10. Risk Register (and the mitigation for each)

| Risk | Likelihood | Mitigation |
|---|---|---|
| NeMo / Parakeet won't install | Medium | Gradium fallback wired before you even try Parakeet |
| Pioneer fine-tune queues for hours | Medium | Start at 09:00 Day 1. Have GPT-4o-with-prompt as inference fallback if model isn't ready by demo |
| Omi device not delivered / not working | High | Wav-file simulator from day zero. Demo works without the device |
| GCP VM costs spike | Low | Use Cloud Run (scale to zero) for the public URL, only spin VM for development |
| Streamlit too slow with audio uploads | Medium | Pre-load 3 demo audio files. Don't let the judges upload anything live |
| Live demo crashes | High | Pre-record a backup video. Yes, really. Run it if anything fails |
| You burn out | High | Sleep at 23:00 Day 1. No exceptions. A tired demo loses |

---

## 11. What I Need From You Next

To make this concrete, send me:

1. **The sample doctor-patient conversation(s)** as `.wav` or `.mp3` (or a transcript if no audio).
2. **Whether the Omi device is in your hands** by tomorrow morning, or whether we go pure-simulator.
3. **Pioneer API key** confirmation — promo code `BERLIN2026` redeemed.
4. **Your GCP project ID** so I can write the deploy commands precisely.

Once you give me the conversations, I'll generate:
- The exact `prompts/soap_de.txt` template tuned to that dialogue style
- The labeled NER dataset seed (the first ~30 examples to bootstrap synthetic generation)
- A test fixture so we know "input X → expected SOAP Y" before you even fine-tune

Then we light it up.
