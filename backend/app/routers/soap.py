import os

from fastapi import APIRouter
from pydantic import BaseModel

from backend.app.models.soap import SOAPNote, SOAPResponse

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


@router.post("", response_model=SOAPResponse)
async def create_soap(req: SOAPRequest):
    """Structure a German transcript into a SOAP note."""
    if not os.getenv("PIONEER_SOAP_MODEL_ID"):
        return SOAPResponse(note=_STUB_NOTE, provider="stub")
    from backend.app.services.soap_structurer import structure_soap
    note_dict = await structure_soap(req.transcript, req.entities)
    return SOAPResponse(note=SOAPNote(**note_dict), provider="pioneer")
