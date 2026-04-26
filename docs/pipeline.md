# Viaticum KIS — Clinical Pipeline

End-to-end walkthrough of every step from raw audio to searchable medical record.
Use this document to run the full pipeline manually or to demo the system to the jury.

---

## Architecture

```
Audio (.wav)
    │
    ▼ Step 1 — STT
Gradium API (German, streaming)
    │  fallback → Parakeet Cloud Run (L4 GPU)
    │  fallback → stub
    │
    ▼ Step 2 — Transcript saved
data/transcripts/<timestamp>_gradium.{json,txt}
    │
    ▼ Step 3 — NER
Pioneer NER model (3ddb0553)
    │  extracts: medication, dosage, symptom, diagnosis, anatomy, procedure
    │
    ▼ Step 4 — SOAP
Pioneer SOAP model (e20877cf)
    │  fallback → stub note
    │
    ▼ Step 5 — Ingest
OpenSearch (knn_vector, dim=1024, BAAI/bge-m3)
    + Firestore (patient + consultation records)
    │
    ▼ Step 6 — RAG Search
POST /chat  →  relevant segments + citations
```

---

## Prerequisites

```bash
# 1. Start the stack
make up

# 2. Verify everything is healthy
curl http://localhost:8000/health
curl -sk -u admin:Medion!KIS2026 https://localhost:9200/_cluster/health | python3 -m json.tool
```

---

## Step 1 — Speech-to-Text (Gradium)

### Via pipeline endpoint (single file upload)

```bash
curl -X POST http://localhost:8000/transcribe \
  -F "audio=@/path/to/recording.wav" \
  | python3 -m json.tool
```

Response includes `dialogue` (clean Arzt/Patient text) and `segments` (with timestamps).

### Via standalone script (long recordings, auto-chunked)

```bash
set -a && source .env && set +a

python3 scripts/transcribe_wav.py /path/to/recording.wav
# Output → data/transcripts/<timestamp>_gradium.json
#           data/transcripts/<timestamp>_gradium.txt
```

### Providers

| Provider | Trigger | Notes |
|----------|---------|-------|
| Gradium | `STT_PROVIDER=gradium` | Primary, German streaming, auto-detects WAV/PCM |
| Parakeet Cloud Run | Gradium fails | `PARAKEET_URL` in `.env`, L4 GPU, 30-60s cold start |
| Stub | Both fail | Returns canned German transcript |

### Example output (`.txt` dialogue format)

```
Arzt: Guten Tag. Mein Name ist Dr. Ziegler.
Arzt: Ich würde gerne ein Anamnese-Gespräch mit Ihnen führen.
Arzt: Wie heißen Sie?
Patient: Ich heiße Ivana Slivovitz.
Patient: Die Schmerzen bestehen seit mehreren Monaten.
...
```

---

## Step 2 — Saved Transcript

Each transcription creates two files in `data/transcripts/`:

| File | Content |
|------|---------|
| `<ts>_gradium.json` | Full structured data: segments with timestamps, dialogue string, provider |
| `<ts>_gradium.txt` | Clean Arzt/Patient dialogue — ready for NER and SOAP prompts |

---

## Step 3 — Named Entity Recognition (Pioneer NER)

Model: `3ddb0553-08bf-4d62-bf7b-9a5779ad6e43`

```bash
curl -X POST http://localhost:8000/entities \
  -H "Content-Type: application/json" \
  -d "{\"text\": $(python3 -c "import json; print(json.dumps(open('data/transcripts/<ts>_gradium.txt').read()))")}" \
  | python3 -m json.tool
```

### Entity types extracted

| Type | Example |
|------|---------|
| `medication` | Penicillin, Paracetamol, Novalgin, Ibuprofen |
| `dosage` | Ibuprofen 400 |
| `symptom` | Schmerzen, Bauchschmerzen, Luftnot, Herzrasen |
| `diagnosis` | Durchfall, Verstopfung |
| `anatomy` | Nacken, Rücken, Oberkörper |
| `procedure` | Mandeloperation, Darmspiegelung, Laboruntersuchungen |

### Example response

```json
{
  "entities": [
    {"text": "Penicillin",    "type": "medication", "confidence": 0.957, "start": 9345, "end": 9355},
    {"text": "Mandeloperation","type": "procedure",  "confidence": 0.925, "start": 7833, "end": 7848},
    {"text": "Bauchschmerzen", "type": "symptom",    "confidence": 0.869, "start": 2951, "end": 2965}
  ],
  "provider": "pioneer"
}
```

---

## Step 4 — SOAP Note (Pioneer SOAP)

Model: `e20877cf-a0a4-44be-b14d-a7fa8bea112d`

```bash
curl -X POST http://localhost:8000/soap \
  -H "Content-Type: application/json" \
  -d "{\"transcript\": $(python3 -c "import json; print(json.dumps(open('data/transcripts/<ts>_gradium.txt').read()))")}" \
  | python3 -m json.tool
```

### Expected response

```json
{
  "note": {
    "S": "Subjektiv — Beschwerden und Anamnese",
    "O": "Objektiv — Befunde und Messwerte",
    "A": "Assessment — Diagnose mit ICD",
    "P": "Plan — weitere Maßnahmen"
  },
  "provider": "pioneer"
}
```

> **Note:** The Pioneer SOAP model currently returns empty content (bug on Pioneer's infrastructure).
> The endpoint falls back to a stub note with `"provider": "stub-fallback"`.
> Contact Pioneer about model `e20877cf-a0a4-44be-b14d-a7fa8bea112d`.

---

## Step 5 — Ingest into Vector Store + Firestore

```bash
curl -X POST http://localhost:8000/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "segments": [...],
    "soap":     {"S":"...", "O":"...", "A":"...", "P":"..."},
    "entities": [...],
    "patient_id": "patient-001"
  }' \
  | python3 -m json.tool
```

### Expected response

```json
{
  "chunks_added": 184,
  "store": "opensearch",
  "consultation_id": "abc123"
}
```

### OpenSearch index

| Setting | Value |
|---------|-------|
| Index | `viaticum-transcripts` |
| Embedding model | `BAAI/bge-m3` (multilingual) |
| Dimension | 1024 |
| Similarity | cosinesimil |
| Analyzer | German |

Re-create index manually if needed:

```bash
make opensearch-init
```

---

## Step 6 — RAG Search

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Was für Medikamente nimmt die Patientin? Welche Allergien hat sie?"}' \
  | python3 -m json.tool
```

### Example response

```json
{
  "answer": "...",
  "citations": [
    {"timestamp": "08:05", "speaker": "Patient", "text": "Haben Sie bekannte Allergien ..."},
    {"timestamp": "07:51", "speaker": "Arzt",    "text": "Nehmen Sie noch andere Medikamente?"}
  ]
}
```

---

## Full pipeline — one script

Run all steps in sequence from the repo root:

```bash
set -a && source .env && set +a

WAV="tmp/Fibromyalgie, Reizdarm & Angst komplette Anamnese – realistisch & prüfungstauglich - Fachleiter (128k).wav"

# 1. Transcribe
python3 scripts/transcribe_wav.py "$WAV"

# Set the latest transcript
TRANSCRIPT_TXT=$(ls -t data/transcripts/*.txt | head -1)
TRANSCRIPT_JSON=$(ls -t data/transcripts/*.json | head -1)

# 2 & 3. NER on full dialogue
curl -s -X POST http://localhost:8000/entities \
  -H "Content-Type: application/json" \
  -d "{\"text\": $(python3 -c "import json; print(json.dumps(open('$TRANSCRIPT_TXT').read()))")}" \
  | python3 -m json.tool

# 4. SOAP
curl -s -X POST http://localhost:8000/soap \
  -H "Content-Type: application/json" \
  -d "{\"transcript\": $(python3 -c "import json; print(json.dumps(open('$TRANSCRIPT_TXT').read()))")}" \
  | python3 -m json.tool

# 5. Ingest
python3 - <<PYEOF
import json, urllib.request
data = json.load(open("$TRANSCRIPT_JSON"))
payload = json.dumps({"segments": data["segments"], "soap": {}, "entities": []}, ensure_ascii=False).encode()
req = urllib.request.Request("http://localhost:8000/ingest", data=payload, headers={"Content-Type":"application/json"}, method="POST")
print(json.loads(urllib.request.urlopen(req, timeout=120).read()))
PYEOF

# 6. Search
curl -s -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Welche Symptome hat die Patientin geschildert?"}' \
  | python3 -m json.tool
```

---

## Service URLs

| Service | Local | GCP |
|---------|-------|-----|
| Frontend | http://localhost:3000 | Cloud Run |
| Backend API | http://localhost:8000/docs | Cloud Run |
| OpenSearch | https://localhost:9200 | GCE VM |
| Parakeet STT | — | https://kis-stt-519370311055.europe-west1.run.app |
| Pioneer NER | https://api.pioneer.ai/v1 | same |
| Pioneer SOAP | https://api.pioneer.ai/v1 | same |
| Gradium STT | wss://api.gradium.ai | same |

---

## Known issues

| Issue | Status | Workaround |
|-------|--------|------------|
| Pioneer SOAP model returns empty content | ❌ Pioneer-side bug | Stub fallback active (`provider: stub-fallback`) |
| Parakeet Cloud Run segfaults on NeMo load | ❌ CUDA 12.2 vs L4 mismatch | Fix: update to `nvidia/cuda:12.4.0-runtime-ubuntu22.04` |
| Speaker diarization uses punctuation only | ⚠️ No real speaker separation | Accurate for structured Q&A; may flip mid-conversation |
| Gradium timestamps reset per chunk | ⚠️ | Timestamps are absolute (chunk offset applied) |
