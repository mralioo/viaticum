"""
Medical NER via Pioneer fine-tuned GLiNER2 (205M).
Env vars: PIONEER_API_KEY, PIONEER_NER_MODEL_ID, PIONEER_BASE_URL
"""
import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)

_ENTITY_LABELS = [
    "medication", "dosage", "symptom", "diagnosis",
    "vital_sign", "anatomy", "procedure",
]
_RELATION_LABELS = ["prescribed_for", "treats", "indicates", "measured_at"]


async def extract_entities(text: str) -> list[dict[str, Any]]:
    """Return [{"text", "type", "confidence", "start", "end"}]. Empty list if unconfigured."""
    api_key = os.environ.get("PIONEER_API_KEY", "")
    model_id = os.environ.get("PIONEER_NER_MODEL_ID", "")
    base_url = os.environ.get("PIONEER_BASE_URL", "https://api.pioneer.ai/v1")

    if not api_key or not model_id:
        logger.info("Pioneer NER not configured — returning empty entity list")
        return []

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{base_url}/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            json={
                "model": model_id,
                "messages": [{"role": "user", "content": text}],
                "schema": {
                    "entities": _ENTITY_LABELS,
                    "relations": _RELATION_LABELS,
                    "include_confidence": True,
                    "include_spans": True,
                },
            },
        )
    resp.raise_for_status()
    data = resp.json()

    result = []
    for entity in data.get("entities", []):
        span = entity.get("span", {})
        result.append({
            "text": entity.get("text", ""),
            "type": entity.get("type", ""),
            "confidence": float(entity.get("confidence", 0.9)),
            "start": int(span.get("start", 0)),
            "end": int(span.get("end", len(entity.get("text", "")))),
        })
    return result
