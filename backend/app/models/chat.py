from pydantic import BaseModel


class Citation(BaseModel):
    """Example: {"timestamp": "09:14", "speaker": "Patient", "text": "Ich bin gestürzt."}"""
    timestamp: str
    speaker: str
    text: str


class ChatRequest(BaseModel):
    """Example: {"message": "Was hat die Patientin gesagt?", "mode": "free_chat", "patient_id": "P001"}"""
    message: str
    mode: str = "free_chat"
    patient_id: str | None = None


class ChatResponse(BaseModel):
    """Example: {"answer": "Die Patientin erwähnte...", "citations": [...]}"""
    answer: str
    citations: list[Citation] = []
