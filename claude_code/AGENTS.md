# Medion KIS — Multi-Agent Claude Code Manifest

This directory tells Claude Code how to behave for each vertical of the Medion KIS build.

## Project overview (updated 2026-04-26)

**Medion KIS** is a German hospital information system demo that showcases AI-assisted SOAP documentation.
The architecture has evolved from the original AuraMed hackathon plan:

| Layer | Technology | Status |
|---|---|---|
| Frontend | Static React (nginx) — `frontend_react/` | ✅ Built |
| Backend | FastAPI — `backend/` | ✅ Built |
| Vector DB | OpenSearch 2.14 (local Docker / GCP GCE) | ✅ Wired |
| SLM (SOAP) | Pioneer fine-tuned Gemma-3-4b | 🔲 Pending model ID |
| STT | Stub → Parakeet-DE-Med / Whisper | 🔲 Stub only |
| Wearable | Omi MCP (simulator available) | 🔲 Optional |

## Key changes from original plan

- **Streamlit frontend is REMOVED.** The UI is now `frontend_react/` — a static site served by nginx in Docker.
- **ChromaDB is REPLACED** by OpenSearch as the primary vector store (env `VECTOR_STORE=opensearch`).
  ChromaDB is kept as a local fallback (`VECTOR_STORE=chroma`).
- **docker-compose.yml** now runs: `opensearch` + `backend` + `frontend_react`.
- **Makefile** at project root is the primary workflow tool (`make help`).
- **GCP deployment** uses Cloud Run (backend + frontend) + GCE e2-standard-2 (OpenSearch).
  Entry points: `scripts/setup_gcp.sh` (first run), `infra/cloud_run/deploy_kis.sh` (updates).

## Agent spawn order

| Pane | Agent spec | Responsibility |
|---|---|---|
| 1 | `pioneer_agent.md` | Fine-tune SLM on synthetic SOAP data |
| 2 | `backend_agent.md` | FastAPI endpoints + OpenSearch RAG |
| 3 | `frontend_agent.md` | KIS React static UI + Hakîm avatar |
| 4 | `omi_agent.md` | Omi MCP wearable integration |
| 5 | `integration_agent.md` | Docker, GCP deploy, docs |

## Communication contract

All agents share **only** these files:

- `backend/app/models/*.py` — Pydantic schemas, source of truth for data shapes
- `.env.example` — every env var any agent needs
- `claude_code/runbook.md` — append-only log of what each agent has shipped

## Anti-patterns (every agent must avoid)

- Do **not** recreate or import from `frontend/` — it is deleted. The UI lives in `frontend_react/`.
- Do **not** import `chromadb` directly in new code — use `rag_router.py` which picks the store via env var.
- Do **not** hardcode passwords or API keys.
- Do **not** merge to `main` without at least one passing happy-path test.
- Do **not** delete another agent's files. Write conflicts to `runbook.md`.
