# Medion KIS — Build Runbook

Append-only log of what each agent has shipped. Read this before starting any work.

---

## [2026-04-25 INITIAL] orchestrator (the human)

What works:
- Repo skeleton scaffolded.
- All 5 agent specs in `claude_code/`.
- The master plan in `AURAMED_PLAN.md`.

What I need:
- Sample doctor-patient `.wav` conversation files in `data/sample_conversations/`.
- Confirmation of which sponsor API keys are live.

---

## [2026-04-26 11:00] integration-agent — Stack migrated to Medion KIS

What works:
- **Streamlit frontend permanently deleted.** `frontend/` and `Dockerfile.frontend` removed.
- `Dockerfile.frontend_react` — nginx 1.27 serving `frontend_react/` static site.
- `frontend_react/nginx.conf` — proxies `/api/*` to backend, WebSocket for transcription.
- `docker-compose.yml` + `docker-compose.kis.yml` — three-service stack: opensearch + backend + frontend_react.
- `Makefile` — full workflow: build, up, down, logs, health, opensearch-init, shell, clean, deploy.
- `scripts/setup_gcp.sh` — full GCP bootstrap: APIs, Artifact Registry, GCE for OpenSearch, Cloud Run deploys.
- `infra/cloud_run/deploy_kis.sh` — incremental re-deploy with `--backend-only` / `--frontend-only` flags.
- `.env.example` updated with GCP vars + VECTOR_STORE toggle.
- All `claude_code/*.md` files updated to reflect new architecture.

What's stubbed:
- GCP deploy not yet tested end-to-end (needs `GCP_PROJECT_ID` in `.env`).
- OpenSearch seeding runs via `scripts/seed_opensearch.py` — call after `make up`.

What frontend_react should call:
- `POST /api/soap` with `{transcript, entities}` → SOAP draft
- `POST /api/chat` with `{message, patient_id}` → RAG answer + citations
- `POST /api/ingest` with `{segments, patient_id}` → seeds patient context
- All at `/api/*` prefix — nginx proxy rewrites to backend port 8000

---

## [2026-04-26 11:30] backend-agent — OpenSearch RAG + patient data

What works:
- `backend/app/services/opensearch_rag.py` — full k-NN RAG on OpenSearch 2.14.
  Connects via `opensearch-py`, auto-creates index on first connect, bulk-indexes with BAAI/bge-m3.
- `backend/app/services/rag_router.py` — selects ChromaDB or OpenSearch via `VECTOR_STORE` env.
- `backend/app/routers/ingest.py` updated — uses `rag_router`, exposes `patient_id` in request + response.
- `backend/app/routers/chat.py` updated — uses `rag_router`.
- `backend/pyproject.toml` — added `opensearch-py>=2.4`.
- `data/patients/transcripts.jsonl` — 35 German doctor-patient dialogue segments (5 patients).
- `data/patients/soap_history.jsonl` — 20 SOAP sections for 7 patients including amnesia cases.
- `scripts/seed_opensearch.py` — seeds all JSONL files via `/ingest` endpoint.

What's stubbed:
- Pioneer SLM not connected (`PIONEER_SOAP_MODEL_ID` not set → stub SOAP note).
- Parakeet STT not loaded (`STT_PROVIDER=stub`).
- `ingest` + `retrieve` on OpenSearch untested against live instance — unit-tested against mock only.

Next from pioneer-agent:
- Set `PIONEER_SOAP_MODEL_ID` and `PIONEER_NER_MODEL_ID` in `.env.example` once fine-tunes complete.

---

## [2026-04-26 12:00] frontend-agent — Patient data + Amnesia cases added

What works:
- `frontend_react/data.js` extended with:
  - `P-104833` Baumann, Ernst — Transiente Globale Amnesie (R41.3), full anamnese object.
  - `P-104834` Vogel, Karl-Heinz — Korsakoff-Syndrom (F10.6) + Wernicke-Anamnese, full anamnese object.
  - `SOAP_HISTORY` array — 7 rich SOAP entries (Aufnahme + Verlauf) for Müller, Fischer, Baumann, Vogel, Krause, Hartmann.
  - `NEURO_PSYCH` array — neuropsychological test results for the three amnesia patients.
  - Both new arrays exported via `Object.assign(window, {...})`.

What frontend needs from backend:
- `POST /api/soap` — call with transcript text from companion.jsx dictation panel.
- `POST /api/chat` — free-text questions answered from SOAP_HISTORY + transcripts context.
- `SOAP_HISTORY[patient_id]` data should pre-fill Verlauf tab in Patientenakte.
