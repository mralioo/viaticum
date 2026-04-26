"""
OpenSearch k-NN RAG — drop-in replacement for rag.py (ChromaDB).

Env vars:
  OPENSEARCH_URL      default https://localhost:9200
  OPENSEARCH_USER     default admin
  OPENSEARCH_PASSWORD default Medion!KIS2026
  OPENSEARCH_INDEX    default viaticum-transcripts
  EMBEDDING_MODEL     default BAAI/bge-m3
"""
import hashlib
import logging
import os
from datetime import date
from typing import Any

logger = logging.getLogger(__name__)

OPENSEARCH_URL = os.getenv("OPENSEARCH_URL", "https://localhost:9200")
OPENSEARCH_USER = os.getenv("OPENSEARCH_USER", "admin")
OPENSEARCH_PASSWORD = os.getenv("OPENSEARCH_PASSWORD", "Medion!KIS2026")
OPENSEARCH_INDEX = os.getenv("OPENSEARCH_INDEX", "viaticum-transcripts")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-m3")
VECTOR_DIM = 768

_client = None
_embedder = None


def _get_client():
    global _client
    if _client is None:
        from opensearchpy import OpenSearch
        _client = OpenSearch(
            hosts=[OPENSEARCH_URL],
            http_auth=(OPENSEARCH_USER, OPENSEARCH_PASSWORD),
            use_ssl=True,
            verify_certs=False,
            ssl_show_warn=False,
        )
        _ensure_index(_client)
    return _client


def _get_embedder():
    global _embedder
    if _embedder is None:
        from sentence_transformers import SentenceTransformer
        _embedder = SentenceTransformer(EMBEDDING_MODEL)
        logger.info("Embedder loaded: %s", EMBEDDING_MODEL)
    return _embedder


def _ensure_index(client) -> None:
    if client.indices.exists(index=OPENSEARCH_INDEX):
        return
    body = {
        "settings": {"index": {"knn": True, "knn.space_type": "cosinesimil"}},
        "mappings": {
            "properties": {
                "embedding":  {"type": "knn_vector", "dimension": VECTOR_DIM},
                "text":       {"type": "text", "analyzer": "german"},
                "speaker":    {"type": "keyword"},
                "start":      {"type": "float"},
                "patient_id": {"type": "keyword"},
                "session":    {"type": "keyword"},
                "doc_date":   {"type": "date", "format": "yyyy-MM-dd"},
            }
        },
    }
    client.indices.create(index=OPENSEARCH_INDEX, body=body)
    logger.info("Created OpenSearch index: %s", OPENSEARCH_INDEX)


def _doc_id(text: str, start: float) -> str:
    return hashlib.sha1(f"{text}:{start}".encode()).hexdigest()[:16]


async def ingest(
    segments: list[dict],
    soap_note: dict | None = None,
    patient_id: str | None = None,
) -> int:
    """Embed and bulk-index segments into OpenSearch. Returns chunk count."""
    if not segments:
        return 0
    client = _get_client()
    embedder = _get_embedder()
    texts = [s["text"] for s in segments]
    embeddings = embedder.encode(texts).tolist()
    session = date.today().isoformat()
    bulk_body: list[dict] = []
    for seg, emb in zip(segments, embeddings):
        doc_id = _doc_id(seg["text"], seg.get("start", 0.0))
        bulk_body.append({"index": {"_index": OPENSEARCH_INDEX, "_id": doc_id}})
        bulk_body.append({
            "text":       seg["text"],
            "speaker":    seg.get("speaker", ""),
            "start":      float(seg.get("start", 0.0)),
            "patient_id": patient_id or seg.get("patient_id", ""),
            "session":    session,
            "doc_date":   session,
            "embedding":  emb,
        })
    response = client.bulk(body=bulk_body, refresh=True)
    errors = [item for item in response["items"] if "error" in item.get("index", {})]
    if errors:
        logger.warning("OpenSearch bulk errors: %s", errors[:3])
    return len(segments) - len(errors)


async def count_patient_docs(patient_id: str) -> int:
    """Return number of OpenSearch docs for a given patient_id."""
    try:
        client = _get_client()
        resp = client.count(
            index=OPENSEARCH_INDEX,
            body={"query": {"term": {"patient_id": patient_id}}},
        )
        return resp.get("count", 0)
    except Exception:
        return 0


async def migrate_empty_patient_id(patient_id: str) -> int:
    """Assign *patient_id* to all docs that currently have an empty patient_id field."""
    try:
        client = _get_client()
        resp = client.update_by_query(
            index=OPENSEARCH_INDEX,
            body={
                "query": {"term": {"patient_id": ""}},
                "script": {
                    "source": "ctx._source.patient_id = params.pid",
                    "lang": "painless",
                    "params": {"pid": patient_id},
                },
            },
            refresh=True,
        )
        return resp.get("updated", 0)
    except Exception as exc:
        logger.warning("OpenSearch migrate_empty_patient_id failed: %s", exc)
        return 0


async def retrieve(
    query: str,
    n_results: int = 5,
    patient_id: str | None = None,
) -> list[dict[str, Any]]:
    """k-NN vector search over today's (or patient's) segments."""
    client = _get_client()
    embedder = _get_embedder()
    qemb = embedder.encode([query]).tolist()[0]
    knn_query: dict = {
        "size": n_results,
        "query": {
            "knn": {
                "embedding": {
                    "vector": qemb,
                    "k": n_results,
                }
            }
        },
    }
    if patient_id:
        knn_query["query"] = {
            "bool": {
                "must": [knn_query["query"]],
                "filter": [{"term": {"patient_id": patient_id}}],
            }
        }
    response = client.search(index=OPENSEARCH_INDEX, body=knn_query)
    hits = response["hits"]["hits"]
    return [
        {
            "text":    h["_source"]["text"],
            "speaker": h["_source"].get("speaker", ""),
            "start":   h["_source"].get("start", 0.0),
            "score":   h["_score"],
        }
        for h in hits
    ]
