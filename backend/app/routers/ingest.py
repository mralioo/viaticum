from fastapi import APIRouter
from pydantic import BaseModel

from backend.app.services.rag_router import ingest

router = APIRouter(prefix="/ingest", tags=["ingest"])


class IngestRequest(BaseModel):
    segments: list[dict]
    soap: dict | None = None
    patient_id: str | None = None


class IngestResponse(BaseModel):
    chunks_added: int
    store: str


@router.post("", response_model=IngestResponse)
async def ingest_conversation(req: IngestRequest):
    """Ingest transcript segments into the active vector store (OpenSearch or ChromaDB)."""
    import os
    store = os.getenv("VECTOR_STORE", "opensearch")
    count = await ingest(req.segments, req.soap, req.patient_id)
    return IngestResponse(chunks_added=count, store=store)
