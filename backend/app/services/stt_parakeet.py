"""
Parakeet-DE-Med STT — calls the remote GCE GPU VM over HTTP.
Env var: PARAKEET_URL (e.g. http://10.0.0.5:8001)
The VM runs stt_server/main.py with the NeMo model loaded.
"""
import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)


async def transcribe(audio_bytes: bytes, sample_rate: int = 16000) -> dict[str, Any]:
    """POST audio bytes to the remote Parakeet VM and return transcript segments."""
    parakeet_url = os.environ.get("PARAKEET_URL", "")
    if not parakeet_url:
        raise RuntimeError(
            "PARAKEET_URL not set — configure the Parakeet GCE VM and set PARAKEET_URL."
        )
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            parakeet_url + "/transcribe",
            files={"audio": ("audio.wav", audio_bytes, "audio/wav")},
            data={"sample_rate": str(sample_rate)},
        )
    resp.raise_for_status()
    return resp.json()
