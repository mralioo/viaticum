"""
Parakeet-DE-Med STT via NeMo.
Install: pip install nemo_toolkit[asr]
Model: johannhartmann/parakeet_de_med (16kHz mono WAV)
Gotcha: NeMo install takes 15+ min and can break on some platforms.
"""
import logging
from typing import Any

logger = logging.getLogger(__name__)
_model = None


def _load_model():
    global _model
    if _model is not None:
        return _model
    try:
        import nemo.collections.asr as nemo_asr
        _model = nemo_asr.models.ASRModel.from_pretrained("johannhartmann/parakeet_de_med")
        logger.info("Parakeet-DE-Med loaded")
    except Exception as exc:
        logger.error("Parakeet load failed: %s — set STT_PROVIDER=stub", exc)
        _model = None
    return _model


async def transcribe(audio_bytes: bytes, sample_rate: int = 16000) -> dict[str, Any]:
    """Transcribe 16kHz mono WAV bytes. Uses librosa.resample if sample_rate != 16000."""
    raise NotImplementedError(
        "Parakeet STT not implemented. Set STT_PROVIDER=stub or implement per backend_agent.md."
    )
