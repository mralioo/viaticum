"""
ChromaDB RAG with BAAI/bge-m3 embeddings.
Collection per day: today_YYYY_MM_DD
Env vars: CHROMA_PATH (default ./data/chroma_db), EMBEDDING_MODEL (default BAAI/bge-m3)
"""
import logging
import os
from datetime import date
from typing import Any

logger = logging.getLogger(__name__)
CHROMA_PATH = os.getenv("CHROMA_PATH", "./data/chroma_db")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-m3")

_client = None
_embedder = None


def _get_client():
    global _client
    if _client is None:
        import chromadb
        _client = chromadb.PersistentClient(path=CHROMA_PATH)
    return _client


def _get_embedder():
    global _embedder
    if _embedder is None:
        from sentence_transformers import SentenceTransformer
        _embedder = SentenceTransformer(EMBEDDING_MODEL)
        logger.info("Embedder loaded: %s", EMBEDDING_MODEL)
    return _embedder


def _collection_name() -> str:
    return f"today_{date.today().strftime('%Y_%m_%d')}"


async def ingest(segments: list[dict], soap_note: dict | None = None) -> int:
    """Embed and store segments in today's ChromaDB collection. Returns chunk count."""
    client = _get_client()
    embedder = _get_embedder()
    col = client.get_or_create_collection(_collection_name())
    docs = [s["text"] for s in segments]
    if not docs:
        return 0
    ids = [f"seg_{i}_{abs(hash(s['text']))}" for i, s in enumerate(segments)]
    metas = [{"speaker": s.get("speaker", ""), "start": s.get("start", 0.0)} for s in segments]
    embeddings = embedder.encode(docs).tolist()
    col.add(ids=ids, embeddings=embeddings, documents=docs, metadatas=metas)
    return len(docs)


async def retrieve(query: str, n_results: int = 5) -> list[dict[str, Any]]:
    """Retrieve top-n segments for query from today's collection."""
    client = _get_client()
    embedder = _get_embedder()
    col = client.get_or_create_collection(_collection_name())
    qemb = embedder.encode([query]).tolist()
    results = col.query(query_embeddings=qemb, n_results=n_results)
    output = []
    for i, doc in enumerate(results["documents"][0]):
        meta = results["metadatas"][0][i]
        output.append({
            "text": doc,
            "speaker": meta.get("speaker", ""),
            "start": meta.get("start", 0.0),
            "distance": results["distances"][0][i],
        })
    return output
