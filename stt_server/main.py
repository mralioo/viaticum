"""
Parakeet-DE-Med NeMo model server.
Exposes POST /transcribe and GET /health.
Set STT_STUB=true for CPU dev mode.

Model loads lazily on the first /transcribe request so the container
starts instantly and passes Cloud Run's health check without timing out.
"""
import asyncio
import logging
import os
import tempfile

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import JSONResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Parakeet-DE-Med STT Server", version="1.0.0")

_model = None
_model_lock = asyncio.Lock()
_model_loading = False


def _is_stub() -> bool:
    return os.environ.get("STT_STUB", "").lower() in ("1", "true", "yes")


async def _ensure_model():
    """Load the NeMo model once; concurrent callers wait on the lock."""
    global _model, _model_loading
    if _model is not None:
        return _model
    async with _model_lock:
        if _model is not None:
            return _model
        _model_loading = True
        logger.info("Loading Parakeet-DE-Med model (first request)…")
        try:
            import nemo.collections.asr as nemo_asr
            _model = nemo_asr.models.ASRModel.from_pretrained(
                "johannhartmann/parakeet_de_med"
            )
            logger.info("Parakeet-DE-Med loaded successfully")
        except Exception as exc:
            logger.error("Failed to load model: %s", exc)
            raise
        finally:
            _model_loading = False
    return _model


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": _model is not None,
        "model_loading": _model_loading,
        "stub_mode": _is_stub(),
    }


@app.post("/warmup")
async def warmup():
    """Trigger model load without sending audio. Call once after cold start."""
    if _is_stub():
        return {"status": "stub — no model to load"}
    await _ensure_model()
    return {"status": "model ready"}


@app.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    sample_rate: str = Form("16000"),
):
    if _is_stub():
        return {
            "segments": [
                {"text": "Stub: Kein Modell geladen.", "speaker": "SPEAKER_00",
                 "start": 0.0, "end": 1.0}
            ],
            "duration_s": 1.0,
            "provider": "parakeet-stub",
        }

    try:
        model = await _ensure_model()
    except Exception as exc:
        return JSONResponse(status_code=503, content={"error": f"Model load failed: {exc}"})

    audio_bytes = await audio.read()

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        import numpy as np
        import soundfile as sf

        data, sr = sf.read(tmp_path)
        if sr != 16000:
            import librosa
            data = librosa.resample(data.astype(np.float32), orig_sr=sr, target_sr=16000)
            sf.write(tmp_path, data, 16000)

        texts = model.transcribe([tmp_path])
        text = texts[0] if texts else ""
    finally:
        os.unlink(tmp_path)

    return {
        "segments": [
            {"text": text, "speaker": "SPEAKER_00", "start": 0.0, "end": 0.0}
        ],
        "duration_s": 0.0,
        "provider": "parakeet",
    }
