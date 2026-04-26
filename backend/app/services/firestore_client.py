"""
Firestore CRUD for patients and consultations.
Env var: GCP_PROJECT_ID
Collections:
  patients/{patient_id}           — patient demographics
  consultations/{consultation_id} — transcript + SOAP + entities
"""
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

_db = None


def _get_db():
    global _db
    if _db is None:
        from google.cloud import firestore
        _db = firestore.Client(project=os.environ.get("GCP_PROJECT_ID"))
    return _db


async def list_patients() -> list[dict[str, Any]]:
    docs = _get_db().collection("patients").stream()
    return [{"id": d.id, **d.to_dict()} for d in docs]


async def get_patient(patient_id: str) -> dict[str, Any] | None:
    doc = _get_db().collection("patients").document(patient_id).get()
    if not doc.exists:
        return None
    return {"id": doc.id, **doc.to_dict()}


async def save_consultation(
    patient_id: str,
    transcript: list[dict],
    soap: dict | None,
    entities: list[dict],
) -> str:
    """Persist a consultation and return its ID."""
    consultation_id = str(uuid.uuid4())
    _get_db().collection("consultations").document(consultation_id).set({
        "patient_id": patient_id,
        "transcript": transcript,
        "soap": soap or {},
        "entities": entities,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    logger.info("Saved consultation %s for patient %s", consultation_id, patient_id)
    return consultation_id


async def list_consultations(patient_id: str) -> list[dict[str, Any]]:
    docs = (
        _get_db()
        .collection("consultations")
        .where("patient_id", "==", patient_id)
        .order_by("created_at", direction="DESCENDING")
        .stream()
    )
    return [{"id": d.id, **d.to_dict()} for d in docs]
