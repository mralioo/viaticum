"""
RAG + LLM chat endpoint.

Flow:
  1. Search OpenSearch for relevant segments
  2. Pioneer fine-tuned chat → Gemini → retrieval fallback  (llm_router.py)
  3. Persist to PostgreSQL chat_messages
  4. Return answer + citations + provider
"""
import logging
import os
import uuid

from fastapi import APIRouter
from pydantic import BaseModel

from backend.app.models.chat import ChatRequest, ChatResponse, Citation

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


class ChatResponseExt(ChatResponse):
    provider: str = "unknown"


async def _save_messages(patient_id, session_id, question, answer, citations):
    try:
        from backend.app.db.connection import get_pool
        pool = get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO chat_messages (patient_id, session_id, role, content, citations) "
                "VALUES ($1, $2, 'user', $3, '[]')",
                patient_id, session_id, question,
            )
            await conn.execute(
                "INSERT INTO chat_messages (patient_id, session_id, role, content, citations) "
                "VALUES ($1, $2, 'assistant', $3, $4::jsonb)",
                patient_id, session_id, answer, citations,
            )
    except Exception as exc:
        logger.warning("Could not save chat messages: %s", exc)


@router.post("", response_model=ChatResponseExt)
async def chat(req: ChatRequest):
    patient_id = req.patient_id or "unknown"
    session_id = req.session_id or str(uuid.uuid4())

    # Patient with no consultation — answer from basic DB info
    if patient_id not in ("patient-001", "unknown"):
        try:
            from backend.app.db.connection import get_pool
            pool = get_pool()
            async with pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT name, primary_dx, secondary_dx, allergies, has_consultation "
                    "FROM patients WHERE id = $1", patient_id
                )
            if row and not row["has_consultation"]:
                name  = row["name"]
                p_dx  = row["primary_dx"] or "—"
                s_dx  = ", ".join(row["secondary_dx"] or []) or "—"
                allg  = ", ".join(row["allergies"] or []) or "Keine bekannt"
                answer = (
                    f"Für {name} liegt noch kein transkribiertes Aufnahmegespräch vor. "
                    f"Bekannt: {p_dx}. Nebendiagnosen: {s_dx}. Allergien: {allg}."
                )
                return ChatResponseExt(answer=answer, citations=[], provider="db-basic")
        except Exception as exc:
            logger.warning("DB lookup failed: %s", exc)

    # Retrieve relevant segments from OpenSearch — scoped to this patient
    segments: list[dict] = []
    try:
        if os.getenv("VECTOR_STORE", "opensearch") != "stub":
            from backend.app.services.rag_router import retrieve
            segments = await retrieve(req.message, patient_id=patient_id if patient_id != "unknown" else None)
    except Exception as exc:
        logger.warning("Retrieval failed: %s", exc)

    citations = [
        Citation(
            timestamp=f"{int(r['start']//60):02d}:{int(r['start']%60):02d}",
            speaker=r["speaker"],
            text=r["text"],
        )
        for r in segments
    ]

    # LLM answer: Pioneer chat → Gemini → retrieval
    from backend.app.services.llm_router import answer as llm_answer
    answer_text, provider = await llm_answer(req.message, segments)

    if patient_id != "unknown":
        await _save_messages(
            patient_id, session_id, req.message, answer_text,
            [c.model_dump() for c in citations],
        )

    return ChatResponseExt(answer=answer_text, citations=citations, provider=provider)
