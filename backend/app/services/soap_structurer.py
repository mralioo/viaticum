"""
SOAP structuring via Pioneer fine-tuned Gemma-3-4B.
Endpoint: https://api.pioneer.ai/v1 (OpenAI-compatible)
Env vars: PIONEER_API_KEY, PIONEER_SOAP_MODEL_ID
Prompt: backend/app/prompts/soap_de.txt
Retries up to 2x if output is not valid JSON.
"""
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)
PIONEER_API_KEY = os.getenv("PIONEER_API_KEY", "")
PIONEER_SOAP_MODEL_ID = os.getenv("PIONEER_SOAP_MODEL_ID", "")


async def structure_soap(transcript: str, entities: list[dict] | None = None) -> dict[str, Any]:
    """Return {"S": str, "O": str, "A": str, "P": str}. Retries 2x on JSON parse failure."""
    raise NotImplementedError(
        "SOAP structurer not implemented. Requires PIONEER_API_KEY + PIONEER_SOAP_MODEL_ID."
    )
