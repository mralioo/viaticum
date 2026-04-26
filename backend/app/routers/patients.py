import logging
from datetime import date, datetime

from fastapi import APIRouter, HTTPException

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/patients", tags=["patients"])


def _row_to_dict(row) -> dict:
    d = dict(row)
    for k, v in d.items():
        if isinstance(v, (date, datetime)):
            d[k] = v.isoformat()
    return d


@router.get("")
async def list_patients():
    try:
        from backend.app.db.connection import get_pool
        pool = get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM patients ORDER BY severity DESC, name"
            )
        return [_row_to_dict(r) for r in rows]
    except Exception as exc:
        logger.warning("DB unavailable: %s", exc)
        return []


@router.get("/{patient_id}")
async def get_patient(patient_id: str):
    try:
        from backend.app.db.connection import get_pool
        pool = get_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM patients WHERE id = $1", patient_id
            )
        if not row:
            raise HTTPException(status_code=404, detail="Patient not found")
        return _row_to_dict(row)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@router.get("/{patient_id}/consultations")
async def get_consultations(patient_id: str):
    try:
        from backend.app.db.connection import get_pool
        pool = get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT id, patient_id, created_at, soap, entities, provider
                FROM consultations
                WHERE patient_id = $1
                ORDER BY created_at DESC
                """,
                patient_id,
            )
        return [_row_to_dict(r) for r in rows]
    except Exception as exc:
        logger.warning("DB unavailable: %s", exc)
        return []


@router.get("/{patient_id}/chat")
async def get_chat_history(patient_id: str, session_id: str | None = None):
    """Return chat history for a patient, optionally filtered by session."""
    try:
        from backend.app.db.connection import get_pool
        pool = get_pool()
        async with pool.acquire() as conn:
            if session_id:
                rows = await conn.fetch(
                    """
                    SELECT id, role, content, citations, created_at
                    FROM chat_messages
                    WHERE patient_id = $1 AND session_id = $2
                    ORDER BY created_at
                    """,
                    patient_id, session_id,
                )
            else:
                rows = await conn.fetch(
                    """
                    SELECT id, role, content, citations, created_at, session_id
                    FROM chat_messages
                    WHERE patient_id = $1
                    ORDER BY created_at DESC
                    LIMIT 50
                    """,
                    patient_id,
                )
        return [_row_to_dict(r) for r in rows]
    except Exception as exc:
        logger.warning("DB unavailable: %s", exc)
        return []
