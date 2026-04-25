"""
Medical NER via Pioneer fine-tuned GLiNER2 (205M).
Env vars: PIONEER_API_KEY, PIONEER_NER_MODEL_ID
Labels: medication, dosage, symptom, diagnosis, vital_sign, anatomy, procedure
"""
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)
PIONEER_NER_MODEL_ID = os.getenv("PIONEER_NER_MODEL_ID", "")


async def extract_entities(text: str) -> list[dict[str, Any]]:
    """Return [{"text": str, "type": str, "confidence": float, "start": int, "end": int}]."""
    raise NotImplementedError(
        "GLiNER extractor not implemented. Requires PIONEER_NER_MODEL_ID."
    )
