import logging
import os
from typing import Any

logger = logging.getLogger(__name__)
STT_PROVIDER = os.getenv("STT_PROVIDER", "stub")

STUB_TRANSCRIPT: dict[str, Any] = {
    "segments": [
        {"text": "Der Patient klagt über anhaltende Brustschmerzen.", "speaker": "SPEAKER_00", "start": 0.0, "end": 3.2},
        {"text": "Seit wann haben Sie diese Beschwerden?", "speaker": "SPEAKER_01", "start": 3.5, "end": 5.1},
        {"text": "Seit gestern Abend, und sie strahlen in den linken Arm aus.", "speaker": "SPEAKER_00", "start": 5.5, "end": 8.8},
    ],
    "duration_s": 8.8,
    "provider": "stub",
}


async def route_transcribe(audio_bytes: bytes, sample_rate: int = 16000) -> dict[str, Any]:
    if STT_PROVIDER == "parakeet":
        from backend.app.services.stt_parakeet import transcribe
        return await transcribe(audio_bytes, sample_rate)
    if STT_PROVIDER == "gradium":
        from backend.app.services.stt_gradium import transcribe
        return await transcribe(audio_bytes, sample_rate)
    logger.info("STT_PROVIDER=stub: returning canned transcript")
    return STUB_TRANSCRIPT
