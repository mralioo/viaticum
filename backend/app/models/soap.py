from pydantic import BaseModel, Field


class SOAPNote(BaseModel):
    """Example: {"S": "Patient berichtet...", "O": "BD 160/95...", "A": "V.a. NSTEMI", "P": "EKG, Troponin..."}"""
    S: str = Field(description="Subjektiv — Beschwerden des Patienten")
    O: str = Field(description="Objektiv — Befunde und Messwerte")
    A: str = Field(description="Assessment / Beurteilung")
    P: str = Field(description="Plan — weitere Maßnahmen")


class SOAPResponse(BaseModel):
    """Example: {"note": {...}, "provider": "stub", "latency_ms": 0}"""
    note: SOAPNote
    provider: str = "stub"
    latency_ms: float = 0.0
