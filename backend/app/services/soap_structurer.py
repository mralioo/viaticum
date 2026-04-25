"""
SOAP structuring via Pioneer fine-tuned model.
Env vars: PIONEER_API_KEY, PIONEER_SOAP_MODEL_ID, PIONEER_BASE_URL
Prompt: backend/app/prompts/soap_de.txt
"""
import json
import logging
import os
from pathlib import Path
from typing import Any

import httpx

logger = logging.getLogger(__name__)

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "soap_de.txt"


async def structure_soap(transcript: str, entities: list[dict] | None = None) -> dict[str, Any]:
    """Return {"S": str, "O": str, "A": str, "P": str}."""
    api_key = os.environ.get("PIONEER_API_KEY", "")
    model_id = os.environ.get("PIONEER_SOAP_MODEL_ID", "")
    base_url = os.environ.get("PIONEER_BASE_URL", "https://api.pioneer.ai/v1")

    if not api_key or not model_id:
        raise RuntimeError("PIONEER_API_KEY and PIONEER_SOAP_MODEL_ID must be set")

    prompt = _PROMPT_PATH.read_text().replace("{transcript}", transcript)

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{base_url}/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            json={
                "model": model_id,
                "messages": [{"role": "user", "content": prompt}],
                "schema": {
                    "structures": {
                        "soap_note": {
                            "fields": [
                                {"name": "S", "dtype": "str"},
                                {"name": "O", "dtype": "str"},
                                {"name": "A", "dtype": "str"},
                                {"name": "P", "dtype": "str"},
                            ]
                        }
                    }
                },
            },
        )
    resp.raise_for_status()
    data = resp.json()

    # Prefer structured output
    structures = data.get("structures", {})
    if "soap_note" in structures:
        note = structures["soap_note"]
        if all(k in note for k in ("S", "O", "A", "P")):
            return note

    # Fallback: parse JSON from message content
    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    try:
        parsed = json.loads(content)
        if all(k in parsed for k in ("S", "O", "A", "P")):
            return parsed
    except json.JSONDecodeError:
        pass

    logger.warning("Pioneer SOAP response missing expected fields: %s", data)
    raise ValueError(f"Pioneer SOAP response did not contain S/O/A/P structure: {data}")
