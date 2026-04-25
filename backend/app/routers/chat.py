import os

from fastapi import APIRouter

from backend.app.models.chat import ChatRequest, ChatResponse, Citation

router = APIRouter(prefix="/chat", tags=["chat"])

_STUB_RESPONSE = ChatResponse(
    answer="Die Patientin berichtete um 00:04 über starke Brustschmerzen seit dem Vorabend mit Ausstrahlung in den linken Arm.",
    citations=[
        Citation(timestamp="00:04", speaker="Patientin", text="Ich habe seit gestern Abend starke Brustschmerzen."),
        Citation(timestamp="00:12", speaker="Patientin", text="Ja, in den linken Arm. Und ich war sehr kurzatmig."),
    ],
)


@router.post("", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """RAG-powered chat over today's transcripts."""
    if os.getenv("STT_PROVIDER", "stub") == "stub":
        return _STUB_RESPONSE
    from backend.app.services.rag_router import retrieve
    results = await retrieve(req.message)
    citations = [
        Citation(
            timestamp=f"{int(r['start'] // 60):02d}:{int(r['start'] % 60):02d}",
            speaker=r["speaker"],
            text=r["text"],
        )
        for r in results
    ]
    answer = citations[0].text if citations else "Keine relevanten Informationen gefunden."
    return ChatResponse(answer=answer, citations=citations)
