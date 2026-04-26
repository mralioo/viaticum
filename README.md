# Viaticum — Medion KIS AI Scribe

> AI-assisted SOAP documentation for German hospitals.  
> Listens → Transcribes → Structures → Fills the KIS form — without the doctor touching a keyboard.

---

## Architecture

```mermaid
flowchart TD
    OmiPin["Omi Wearable Pin\nPCM-16 · 16 kHz · 80 ms frames"]
    OmiSim["omi_simulator.py\n.wav replay"]

    subgraph STT ["STT Layer (dual-redundant)"]
        Router["ai_router.py"]
        Parakeet["Parakeet-DE-Med\nGCE n1-standard-4 + T4 GPU"]
        Gradium["Gradium Streaming API\n24 kHz cloud ASR"]
        Stub["Demo stub\ncanned transcript"]
    end

    subgraph NLP ["NLP Layer — Pioneer fine-tuned models"]
        NER["GLiNER2-DE-Med\n205 M params · 7 medical labels"]
        SOAP["Gemma-3-4B-SOAP-DE\n4 B params · LoRA · JSON output"]
    end

    subgraph RAG ["RAG — OpenSearch 2.14"]
        Embed["BAAI/bge-m3\n1024-dim embeddings"]
        OS["OpenSearch index\nviaticum-transcripts\nk-NN cosine · German analyzer"]
    end

    subgraph Persist ["Persistence"]
        PG["PostgreSQL 16\npatients · chat history"]
        FS["Google Firestore\nconsultations · SOAP records"]
    end

    subgraph Hakim ["Hakîm AI Companion"]
        Chat["POST /chat\nRAG Q&A + citations"]
        SoapEP["POST /soap\nSOAP draft + confidence"]
        Entities["POST /entities\ncolour-coded chips"]
    end

    subgraph Frontend ["Medion KIS Frontend — nginx · React 18"]
        UI["12 KIS screens\nPatientenakte · SOAP · Bildgebung …"]
        FormFill["Entwurf übernehmen\ntype-writer form fill"]
    end

    OmiPin -->|"WebSocket PCM frames"| Router
    OmiSim -->|"WebSocket PCM frames"| Router

    Router --> Parakeet
    Router --> Gradium
    Router --> Stub

    Parakeet -->|"segments {speaker, text, start}"| NER
    Gradium  -->|"segments {speaker, text, start}"| NER
    Stub     -->|"segments {speaker, text, start}"| NER

    NER  -->|"entities []"| SOAP
    NER  -->|"entities []"| Entities
    SOAP -->|"JSON {S, O, A, P}"| SoapEP
    SOAP -->|"JSON {S, O, A, P}"| FS

    NER  --> Embed
    SOAP --> Embed
    Embed -->|"1024-dim vectors"| OS

    OS -->|"top-k segments + scores"| Chat
    PG -->|"patient context"| Chat

    Chat    --> UI
    SoapEP  --> UI
    Entities --> UI

    UI --> FormFill
    FormFill --> PG

    classDef hardware fill:#1a3a3a,stroke:#38bdbd,color:#e7edf3
    classDef stt     fill:#0d3a2a,stroke:#2a9d6a,color:#e7edf3
    classDef nlp     fill:#1a1a3a,stroke:#5b4cbf,color:#e7edf3
    classDef rag     fill:#2a1a0d,stroke:#b97509,color:#e7edf3
    classDef store   fill:#1a2a3a,stroke:#2563a8,color:#e7edf3
    classDef agent   fill:#0d2a1a,stroke:#38bdbd,color:#66d4d4
    classDef ui      fill:#1a1a1a,stroke:#7c8a9c,color:#e7edf3

    class OmiPin,OmiSim hardware
    class Router,Parakeet,Gradium,Stub stt
    class NER,SOAP nlp
    class Embed,OS rag
    class PG,FS store
    class Chat,SoapEP,Entities agent
    class UI,FormFill ui
```

---

## Quick start

```bash
cp .env.example .env   # fill in API keys
./start.sh             # builds images, starts OpenSearch + Postgres + backend + frontend
```

| Service    | URL                          |
|------------|------------------------------|
| KIS UI     | http://localhost:3000        |
| Backend    | http://localhost:8000/health |
| OpenSearch | https://localhost:9200       |

For a full end-to-end demo (STT → NER → SOAP → ingest → RAG):

```bash
./scripts/demo.sh
```

---

## Stack

| Layer            | Technology                          |
|------------------|-------------------------------------|
| Wearable         | Omi dev kit (Nordic Semiconductor)  |
| STT primary      | Parakeet-DE-Med (NeMo · GCE T4)     |
| STT fallback     | Gradium streaming API               |
| NER              | Pioneer GLiNER2-DE-Med (fine-tuned) |
| SOAP generation  | Pioneer Gemma-3-4B (LoRA)           |
| Embeddings       | BAAI/bge-m3 · 1024-dim              |
| Vector search    | OpenSearch 2.14 k-NN                |
| Persistence      | PostgreSQL 16 + Google Firestore    |
| Backend          | FastAPI · Python 3.11               |
| Frontend         | React 18 + nginx                    |
| Infra            | GCP Cloud Run + GCE                 |
| AI companion     | Hakîm (custom avatar agent)         |

---

## Docs

- [`docs/pipeline.md`](docs/pipeline.md) — step-by-step pipeline walkthrough
- [`docs/PIPELINE_OVERVIEW.md`](docs/PIPELINE_OVERVIEW.md) — component deep-dive
- [`docs/demo.md`](docs/demo.md) — jury demo guide
- [`docs/gcp-setup-guide.md`](docs/gcp-setup-guide.md) — GCP provisioning
- [`docs/local-hybrid-dev.md`](docs/local-hybrid-dev.md) — local dev setup
