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

    system_prompt = _PROMPT_PATH.read_text().replace("{transcript}", "")

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{base_url}/chat/completions",
            headers={
                "Content-Type": "application/json",
                "X-API-Key": api_key,
            },
            json={
                "model": model_id,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": transcript},
                ],
            },
        )
    resp.raise_for_status()
    data = resp.json()
    logger.info("Pioneer SOAP raw response: %s", data)

    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")

    # Strip markdown code fences if present
    content = content.strip()
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
        content = content.strip()

    try:
        parsed = json.loads(content)
        if all(k in parsed for k in ("S", "O", "A", "P")):
            return parsed
    except json.JSONDecodeError:
        pass

    logger.warning("Pioneer SOAP response missing expected fields. Raw: %s", content)
    raise ValueError(f"Pioneer SOAP response did not contain S/O/A/P structure: {content}")
