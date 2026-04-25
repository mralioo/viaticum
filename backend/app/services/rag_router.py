"""
Selects the active RAG backend based on VECTOR_STORE env var.
  VECTOR_STORE=opensearch  → opensearch_rag (production / GCP)
  VECTOR_STORE=chroma      → rag (local dev fallback)
"""
import os

_store = os.getenv("VECTOR_STORE", "opensearch").lower()

if _store == "opensearch":
    from backend.app.services.opensearch_rag import ingest, retrieve
else:
    from backend.app.services.rag import ingest, retrieve  # type: ignore

__all__ = ["ingest", "retrieve"]
