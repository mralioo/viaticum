from fastapi import APIRouter
from pydantic import BaseModel

from backend.app.services.rag import ingest

router = APIRouter(prefix="/ingest", tags=["ingest"])


class IngestRequest(BaseModel):
    segments: list[dict]
    soap: dict | None = None


class IngestResponse(BaseModel):
    chunks_added: int


@router.post("", response_model=IngestResponse)
async def ingest_conversation(req: IngestRequest):
    """Ingest transcript segments into ChromaDB for RAG queries."""
    count = await ingest(req.segments, req.soap)
    return IngestResponse(chunks_added=count)
