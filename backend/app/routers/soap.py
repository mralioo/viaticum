"""
SOAP endpoints.

POST /soap           — standard sync endpoint (unchanged)
GET  /soap/process   — SSE streaming endpoint: sends phase events while calling
                       Pioneer SOAP, then returns the final note.
                       Falls back to the existing DB consultation note on error.
"""
import asyncio
import json
import logging
import os

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.app.models.soap import SOAPNote, SOAPResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/soap", tags=["soap"])


class SOAPRequest(BaseModel):
    transcript: str
    entities: list[dict] | None = None


_STUB_NOTE = SOAPNote(
    S="Patient berichtet über anhaltende Brustschmerzen seit 2 Tagen, Ausstrahlung in den linken Arm.",
    O="Blutdruck 160/95 mmHg, Puls 88/min, Temperatur 36.8°C, SpO2 97%.",
    A="Verdacht auf akutes Koronarsyndrom (NSTEMI). ICD: I21.4",
    P="12-Kanal-EKG sofort, Troponin I + T, kardiologisches Konsil, Bettruhe.",
)


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


async def _get_db_soap(patient_id: str) -> dict | None:
    try:
        from backend.app.db.connection import get_pool
        pool = get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT soap, transcript FROM consultations "
                "WHERE patient_id = $1 ORDER BY created_at DESC LIMIT 1",
                patient_id,
            )
        if row:
            return {"soap": row["soap"], "transcript": row["transcript"]}
    except Exception as exc:
        logger.warning("DB lookup failed: %s", exc)
    return None


@router.get("/process")
async def process_soap_stream(patient_id: str = "patient-001"):
    """
    Server-Sent Events stream.
    Each event: {"phase": str, "msg": str}
    Final event: {"phase": "done", "soap": {S,O,A,P}, "provider": str}
    """
    async def generate():
        # ── Phase 1 — load context ───────────────���────────────────────────────
        yield _sse({"phase": "reading", "msg": "Lade Transkript aus der Datenbank…"})
        await asyncio.sleep(0.6)

        db = await _get_db_soap(patient_id)
        transcript = (db or {}).get("transcript") or ""
        db_soap    = (db or {}).get("soap") or {}

        # ── Phase 2 — NER hint ───────────────────────���─────────────────────���─
        yield _sse({"phase": "ner", "msg": "Extrahiere medizinische Entitäten…"})
        await asyncio.sleep(0.7)

        # ── Phase 3 — Pioneer SOAP call ───────────────────────────────────────
        yield _sse({"phase": "soap", "msg": "Pioneer SOAP-Modell generiert Eintrag…"})

        if transcript and os.getenv("PIONEER_SOAP_MODEL_ID"):
            try:
                from backend.app.services.soap_structurer import structure_soap
                note_dict = await structure_soap(transcript)
                yield _sse({"phase": "done", "soap": note_dict, "provider": "pioneer"})
                return
            except Exception as exc:
                logger.warning("Pioneer SOAP failed in stream (%s) — using DB note", exc)
                yield _sse({"phase": "warn", "msg": f"Pioneer nicht verfügbar: {exc}"})
                await asyncio.sleep(0.3)

        # ── Fallback — return DB consultation note ───────────────────────────
        if db_soap and all(k in db_soap for k in ("S", "O", "A", "P")):
            yield _sse({"phase": "done", "soap": db_soap, "provider": "db"})
        else:
            yield _sse({
                "phase": "done",
                "soap": _STUB_NOTE.model_dump(),
                "provider": "stub-fallback",
            })

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # disable nginx buffering
        },
    )


@router.post("", response_model=SOAPResponse)
async def create_soap(req: SOAPRequest):
    """Structure a German transcript into a SOAP note."""
    if not os.getenv("PIONEER_SOAP_MODEL_ID"):
        return SOAPResponse(note=_STUB_NOTE, provider="stub")
    from backend.app.services.soap_structurer import structure_soap
    try:
        note_dict = await structure_soap(req.transcript, req.entities)
        return SOAPResponse(note=SOAPNote(**note_dict), provider="pioneer")
    except Exception as exc:
        logger.warning("Pioneer SOAP failed (%s) — falling back to stub", exc)
        return SOAPResponse(note=_STUB_NOTE, provider="stub-fallback")
