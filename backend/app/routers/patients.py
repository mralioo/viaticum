from fastapi import APIRouter, HTTPException

from backend.app.services.firestore_client import (
    get_patient,
    list_consultations,
    list_patients,
)

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("")
async def get_all_patients():
    """List all patients from Firestore."""
    return await list_patients()


@router.get("/{patient_id}")
async def get_single_patient(patient_id: str):
    """Get a single patient record."""
    patient = await get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.get("/{patient_id}/consultations")
async def get_consultations(patient_id: str):
    """Get all consultations for a patient, newest first."""
    return await list_consultations(patient_id)
