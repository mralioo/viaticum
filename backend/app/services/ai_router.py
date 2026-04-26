import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

STT_PROVIDER = os.getenv("STT_PROVIDER", "gradium")

STUB_TRANSCRIPT: dict[str, Any] = {
    "segments": [
        {"text": "Der Patient klagt über anhaltende Brustschmerzen.", "speaker": "SPEAKER_00", "start": 0.0, "end": 3.2},
        {"text": "Seit wann haben Sie diese Beschwerden?", "speaker": "SPEAKER_01", "start": 3.5, "end": 5.1},
        {"text": "Seit gestern Abend, und sie strahlen in den linken Arm aus.", "speaker": "SPEAKER_00", "start": 5.5, "end": 8.8},
    ],
    "duration_s": 8.8,
    "provider": "stub",
}

_TRANSCRIPT_DIR = Path(__file__).parent.parent.parent.parent / "data" / "transcripts"


def _save_transcript(result: dict[str, Any]) -> None:
    try:
        _TRANSCRIPT_DIR.mkdir(parents=True, exist_ok=True)
        ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        provider = result.get("provider", "unknown")
        base = _TRANSCRIPT_DIR / f"{ts}_{provider}"

        # Full JSON for the pipeline
        (base.with_suffix(".json")).write_text(
            json.dumps(result, ensure_ascii=False, indent=2)
        )

        # Clean dialogue .txt for human reading and Pioneer NER input
        dialogue = result.get("dialogue") or "\n".join(
            f"{s.get('speaker', 'Sprecher')}: {s.get('text', '')}"
            for s in result.get("segments", [])
        )
        (base.with_suffix(".txt")).write_text(dialogue, encoding="utf-8")

        logger.info("Transcript saved → %s.{json,txt}", base)
    except Exception as exc:
        logger.warning("Could not save transcript: %s", exc)


async def route_transcribe(audio_bytes: bytes, sample_rate: int = 16000) -> dict[str, Any]:
    """
    STT dispatch: Gradium → Parakeet Cloud Run → stub.
    Saves every successful transcript to data/transcripts/.
    """
    provider = STT_PROVIDER

    # ── 1. Gradium (primary) ──────────────────────────────────────────────────
    if provider in ("gradium", "auto"):
        try:
            from backend.app.services.stt_gradium import transcribe
            result = await transcribe(audio_bytes, sample_rate)
            _save_transcript(result)
            return result
        except Exception as exc:
            logger.warning("Gradium STT failed (%s) — trying Parakeet fallback", exc)

    # ── 2. Parakeet Cloud Run (fallback) ─────────────────────────────────────
    if provider in ("parakeet", "gradium", "auto"):
        parakeet_url = os.getenv("PARAKEET_URL", "")
        if parakeet_url:
            try:
                from backend.app.services.stt_parakeet import transcribe
                result = await transcribe(audio_bytes, sample_rate)
                _save_transcript(result)
                return result
            except Exception as exc:
                logger.warning("Parakeet STT failed (%s) — falling back to stub", exc)
        else:
            logger.info("PARAKEET_URL not set — skipping Parakeet fallback")

    # ── 3. Stub ───────────────────────────────────────────────────────────────
    logger.info("Using stub transcript")
    return STUB_TRANSCRIPT
