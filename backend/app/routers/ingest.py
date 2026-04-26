import logging
import os

from fastapi import APIRouter
from pydantic import BaseModel

from backend.app.services.rag_router import ingest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ingest", tags=["ingest"])


class IngestRequest(BaseModel):
    segments: list[dict]
    soap: dict | None = None
    entities: list[dict] | None = None
    patient_id: str | None = None


class IngestResponse(BaseModel):
    chunks_added: int
    store: str
    consultation_id: str | None = None


@router.post("", response_model=IngestResponse)
async def ingest_conversation(req: IngestRequest):
    """Ingest transcript into vector store (OpenSearch/ChromaDB) and Firestore."""
    store = os.getenv("VECTOR_STORE", "opensearch")
    count = await ingest(req.segments, req.soap, req.patient_id)

    consultation_id = None
    if req.patient_id and os.getenv("GCP_PROJECT_ID"):
        try:
            from backend.app.services.firestore_client import save_consultation
            consultation_id = await save_consultation(
                patient_id=req.patient_id,
                transcript=req.segments,
                soap=req.soap,
                entities=req.entities or [],
            )
        except Exception as exc:
            logger.warning("Firestore write failed (non-fatal): %s", exc)

    return IngestResponse(chunks_added=count, store=store, consultation_id=consultation_id)
