"""
Omi MCP client for conversation history retrieval.
NOTE: Audio from the physical Omi device arrives via WS /transcribe/stream — not this client.
This client reads stored memories and conversation history via api.omi.me.
Env var: OMI_API_KEY — if missing, all methods return stub data without crashing.
"""
import logging
import os
from datetime import datetime

from backend.app.models.omi import Conversation, Memory, OmiHealth, OmiSegment

logger = logging.getLogger(__name__)
OMI_API_KEY = os.getenv("OMI_API_KEY", "")

_STUB_CONVERSATIONS = [
    Conversation(
        id="stub_conv_001",
        created_at=datetime(2026, 4, 25, 9, 14, 0),
        segments=[
            OmiSegment(text="Ich habe starke Brustschmerzen.", speaker="SPEAKER_00", start=0.0, end=2.5),
            OmiSegment(text="Seit wann bestehen die Beschwerden?", speaker="SPEAKER_01", start=3.0, end=5.0),
        ],
        summary="Patient berichtet über Brustschmerzen.",
    )
]


class OmiClient:
    def __init__(self):
        self._stub = not bool(OMI_API_KEY)
        if self._stub:
            logger.warning("OMI_API_KEY not set — Omi client in stub mode")

    async def health(self) -> OmiHealth:
        if self._stub:
            return OmiHealth(connected=False, mode="stub", tools_available=[])
        raise NotImplementedError("Live Omi health check not implemented.")

    async def search_conversations(self, uid: str, query: str, limit: int = 20) -> list[Conversation]:
        if self._stub:
            return _STUB_CONVERSATIONS
        raise NotImplementedError("Live Omi conversation search not implemented.")

    async def get_conversation(self, uid: str, conversation_id: str) -> Conversation:
        if self._stub:
            return Conversation(id=conversation_id, created_at=datetime.now())
        raise NotImplementedError("Live Omi get_conversation not implemented.")

    async def create_memory(self, uid: str, content: str, category: str) -> Memory:
        if self._stub:
            return Memory(id="stub_mem_001", content=content, category=category)
        raise NotImplementedError("Live Omi create_memory not implemented.")


omi_client = OmiClient()
