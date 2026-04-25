import json
import logging

from fastapi import APIRouter, File, UploadFile, WebSocket, WebSocketDisconnect

from backend.app.models.stt import TranscribeResponse
from backend.app.services.ai_router import route_transcribe

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/transcribe", tags=["transcribe"])


@router.post("", response_model=TranscribeResponse)
async def transcribe_file(audio: UploadFile = File(...)):
    """Transcribe an uploaded audio file (WAV/MP3/OGG)."""
    audio_bytes = await audio.read()
    result = await route_transcribe(audio_bytes)
    return TranscribeResponse(**result)


@router.websocket("/stream")
async def transcribe_stream(
    websocket: WebSocket,
    uid: str = "",
    sample_rate: int = 16000,
    codec: str = "opus",
    language: str = "de",
):
    """
    Omi physical device WebSocket endpoint.
    Device sends binary audio frames, then {"type": "CloseStream"}.
    Responds with {"segments": [...]} after processing.
    """
    await websocket.accept()
    audio_buffer = bytearray()
    try:
        while True:
            data = await websocket.receive()
            if "bytes" in data:
                audio_buffer.extend(data["bytes"])
            elif "text" in data:
                msg = json.loads(data["text"])
                if msg.get("type") == "CloseStream":
                    result = await route_transcribe(bytes(audio_buffer), sample_rate)
                    await websocket.send_json(result)
                    break
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected uid=%s", uid)
