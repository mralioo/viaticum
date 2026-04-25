"""
Gradium streaming STT fallback.
Install: pip install gradium
Gotcha: Gradium expects 24kHz PCM; this service resamples from sample_rate -> 24kHz.
Frame size: 1920 samples = 80ms at 24kHz.
"""
import logging
from typing import Any

logger = logging.getLogger(__name__)


async def transcribe(audio_bytes: bytes, sample_rate: int = 16000) -> dict[str, Any]:
    """Transcribe via Gradium streaming API. Resamples to 24kHz internally."""
    raise NotImplementedError(
        "Gradium STT not implemented. Set STT_PROVIDER=stub or implement per backend_agent.md."
    )
