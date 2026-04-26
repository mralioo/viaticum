"""
Medical NER via Pioneer fine-tuned GLiNER2 (205M).
Env vars: PIONEER_API_KEY, PIONEER_NER_MODEL_ID, PIONEER_BASE_URL
"""
import json
import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)

_ENTITY_LABELS = [
    "medication", "dosage", "symptom", "diagnosis",
    "vital_sign", "anatomy", "procedure",
]


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
                "X-API-Key": api_key,
            },
            json={
                "model": model_id,
                "messages": [{"role": "user", "content": text}],
                "schema": {
                    "entities": _ENTITY_LABELS,
                    "include_confidence": True,
                },
            },
        )
    resp.raise_for_status()
    data = resp.json()

    # Pioneer NER returns entities as JSON string in choices[0].message.content
    # Format: {"entities": {"medication": [{"text": ..., "confidence": ..., "start": ..., "end": ...}], ...}}
    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    try:
        parsed = json.loads(content)
    except (json.JSONDecodeError, TypeError):
        logger.warning("Pioneer NER: could not parse content as JSON: %s", content)
        return []

    result = []
    for entity_type, entities in parsed.get("entities", {}).items():
        for entity in entities:
            result.append({
                "text": entity.get("text", ""),
                "type": entity_type,
                "confidence": float(entity.get("confidence", 0.9)),
                "start": int(entity.get("start", 0)),
                "end": int(entity.get("end", len(entity.get("text", "")))),
            })
    return result
