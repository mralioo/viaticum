import json
import logging
import os
from pathlib import Path

import httpx

logger = logging.getLogger(__name__)
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
MOCK_DIR = Path(__file__).parent / "mocks"


def _mock(name: str) -> dict:
    return json.loads((MOCK_DIR / f"{name}.json").read_text())


def transcribe_sync(audio_bytes: bytes, filename: str = "audio.wav") -> dict:
    try:
        with httpx.Client(base_url=BACKEND_URL, timeout=60.0) as c:
            r = c.post("/transcribe", files={"audio": (filename, audio_bytes, "audio/wav")})
            r.raise_for_status()
            return r.json()
    except Exception as exc:
        logger.warning("Backend unreachable (%s), using mock transcript", exc)
        return _mock("transcript")


def soap_sync(transcript: str, entities: list | None = None) -> dict:
    try:
        with httpx.Client(base_url=BACKEND_URL, timeout=60.0) as c:
            r = c.post("/soap", json={"transcript": transcript, "entities": entities})
            r.raise_for_status()
            return r.json()
    except Exception as exc:
        logger.warning("Backend unreachable (%s), using mock SOAP", exc)
        return _mock("soap")


def entities_sync(text: str) -> dict:
    try:
        with httpx.Client(base_url=BACKEND_URL, timeout=30.0) as c:
            r = c.post("/entities", json={"text": text})
            r.raise_for_status()
            return r.json()
    except Exception as exc:
        logger.warning("Backend unreachable (%s), using mock entities", exc)
        return _mock("entities")


def chat_sync(message: str, mode: str = "free_chat", patient_id: str | None = None) -> dict:
    try:
        with httpx.Client(base_url=BACKEND_URL, timeout=30.0) as c:
            r = c.post("/chat", json={"message": message, "mode": mode, "patient_id": patient_id})
            r.raise_for_status()
            return r.json()
    except Exception as exc:
        logger.warning("Backend unreachable (%s), using mock chat", exc)
        return _mock("chat")


def health() -> dict:
    try:
        with httpx.Client(base_url=BACKEND_URL, timeout=5.0) as c:
            return c.get("/health").json()
    except Exception:
        return {"status": "unreachable", "models_loaded": {}}
