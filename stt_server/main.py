"""
Parakeet-DE-Med NeMo model server.
Runs on the GCE T4 VM. Exposes POST /transcribe and GET /health.
Set STT_STUB=true for CPU dev mode (no model loaded).
"""
import logging
import os
import tempfile

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import JSONResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Parakeet-DE-Med STT Server", version="1.0.0")
_model = None


@app.on_event("startup")
async def load_model():
    global _model
    stub = os.environ.get("STT_STUB", "").lower() in ("1", "true", "yes")
    if stub:
        logger.info("STT_STUB=true — model not loaded (CPU dev mode)")
        return
    try:
        import nemo.collections.asr as nemo_asr
        _model = nemo_asr.models.ASRModel.from_pretrained(
            "johannhartmann/parakeet_de_med"
        )
        logger.info("Parakeet-DE-Med loaded successfully")
    except Exception as exc:
        logger.error("Failed to load Parakeet model: %s", exc)


@app.get("/health")
def health():
    stub = os.environ.get("STT_STUB", "").lower() in ("1", "true", "yes")
    return {
        "status": "ok",
        "model_loaded": _model is not None,
        "stub_mode": stub,
    }


@app.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    sample_rate: str = Form("16000"),
):
    stub = os.environ.get("STT_STUB", "").lower() in ("1", "true", "yes")
    if stub:
        return {
            "segments": [
                {"text": "Stub: Kein Modell geladen.", "speaker": "SPEAKER_00",
                 "start": 0.0, "end": 1.0}
            ],
            "duration_s": 1.0,
            "provider": "parakeet-stub",
        }

    if _model is None:
        return JSONResponse(
            status_code=503,
            content={"error": "Model not loaded — check startup logs."},
        )

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

        texts = _model.transcribe([tmp_path])
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
