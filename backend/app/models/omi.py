from datetime import datetime

from pydantic import BaseModel


class OmiSegment(BaseModel):
    """Example: {"text": "Guten Morgen.", "speaker": "SPEAKER_00", "start": 0.0, "end": 1.2}"""
    text: str
    speaker: str
    start: float
    end: float


class Conversation(BaseModel):
    """Example: {"id": "conv_001", "created_at": "2026-04-25T09:14:00", "segments": [...], "summary": "..."}"""
    id: str
    created_at: datetime
    segments: list[OmiSegment] = []
    summary: str = ""


class Memory(BaseModel):
    """Example: {"id": "mem_001", "content": "Patient hat Penicillin-Allergie.", "category": "allergy"}"""
    id: str
    content: str
    category: str


class OmiHealth(BaseModel):
    """Example: {"connected": true, "mode": "live", "tools_available": ["search_conversations"]}"""
    connected: bool
    mode: str
    tools_available: list[str] = []
