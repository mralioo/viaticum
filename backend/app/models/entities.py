from enum import Enum

from pydantic import BaseModel


class EntityType(str, Enum):
    MEDICATION = "medication"
    DOSAGE = "dosage"
    SYMPTOM = "symptom"
    DIAGNOSIS = "diagnosis"
    VITAL_SIGN = "vital_sign"
    ANATOMY = "anatomy"
    PROCEDURE = "procedure"


class Entity(BaseModel):
    """Example: {"text": "Ramipril", "type": "medication", "confidence": 0.95, "start": 42, "end": 50}"""
    text: str
    type: EntityType
    confidence: float
    start: int
    end: int


class EntityResponse(BaseModel):
    """Example: {"entities": [...], "provider": "stub"}"""
    entities: list[Entity]
    provider: str = "stub"
