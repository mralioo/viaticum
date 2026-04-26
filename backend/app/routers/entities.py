import os

from fastapi import APIRouter
from pydantic import BaseModel

from backend.app.models.entities import Entity, EntityResponse, EntityType

router = APIRouter(prefix="/entities", tags=["entities"])


class EntityRequest(BaseModel):
    text: str


_STUB_ENTITIES = [
    Entity(text="Ramipril", type=EntityType.MEDICATION, confidence=0.97, start=0, end=8),
    Entity(text="5mg 1-0-0", type=EntityType.DOSAGE, confidence=0.94, start=9, end=18),
    Entity(text="Brustschmerzen", type=EntityType.SYMPTOM, confidence=0.99, start=40, end=54),
    Entity(text="160/95 mmHg", type=EntityType.VITAL_SIGN, confidence=0.96, start=60, end=71),
    Entity(text="NSTEMI", type=EntityType.DIAGNOSIS, confidence=0.92, start=80, end=86),
]


@router.post("", response_model=EntityResponse)
async def extract_entities(req: EntityRequest):
    """Extract medical entities from German text using Pioneer NER."""
    if not os.getenv("PIONEER_NER_MODEL_ID"):
        return EntityResponse(entities=_STUB_ENTITIES, provider="stub")
    from backend.app.services.gliner_extractor import extract_entities as _extract
    raw = await _extract(req.text)
    entities = [Entity(**e) for e in raw] if raw else _STUB_ENTITIES
    return EntityResponse(entities=entities, provider="pioneer")
