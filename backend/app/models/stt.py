from pydantic import BaseModel


class Segment(BaseModel):
    """Example: {"text": "Der Patient klagt über Brustschmerzen.", "speaker": "SPEAKER_00", "start": 0.0, "end": 3.2}"""
    text: str
    speaker: str
    start: float
    end: float


class TranscribeResponse(BaseModel):
    """Example: {"segments": [...], "dialogue": "Arzt: ...", "duration_s": 45.3, "provider": "gradium"}"""
    segments: list[Segment]
    dialogue: str = ""
    duration_s: float = 0.0
    provider: str = "stub"
