import os

from fastapi import APIRouter
from pydantic import BaseModel

from backend.app.models.omi import Conversation, Memory, OmiHealth
from backend.app.services.omi_mcp_client import omi_client

router = APIRouter(prefix="/omi", tags=["omi"])
OMI_USER_UID = os.getenv("OMI_USER_UID", "demo_uid")


@router.get("/health", response_model=OmiHealth)
async def omi_health():
    return await omi_client.health()


@router.get("/conversations", response_model=list[Conversation])
async def search_conversations(q: str = "", limit: int = 20):
    return await omi_client.search_conversations(uid=OMI_USER_UID, query=q, limit=limit)


@router.get("/conversations/{conversation_id}", response_model=Conversation)
async def get_conversation(conversation_id: str):
    return await omi_client.get_conversation(uid=OMI_USER_UID, conversation_id=conversation_id)


class MemoryRequest(BaseModel):
    content: str
    category: str = "general"


@router.post("/memory", response_model=Memory)
async def create_memory(req: MemoryRequest):
    return await omi_client.create_memory(uid=OMI_USER_UID, content=req.content, category=req.category)
