"""
Gradium streaming STT — primary provider.
Groups word tokens into sentences on punctuation boundaries.
Alternates speakers on question marks (Arzt asks → Patient answers).
Language locked to German (de).
"""
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

CHUNK_SIZE = 1920  # 80ms at 24kHz


def _is_wav(audio_bytes: bytes) -> bool:
    return audio_bytes[:4] == b"RIFF" and audio_bytes[8:12] == b"WAVE"


_DE_ABBREVS = {
    "Dr", "Prof", "Hr", "Fr", "Nr", "Str", "Abs", "bzw", "usw", "etc",
    "Fa", "ca", "ggf", "inkl", "max", "min", "sog", "sog", "St", "Tel",
}


def _is_abbrev(token: str) -> bool:
    """True if token looks like 'Dr.' / 'Nr.' / 'z.B.' — not a real sentence end."""
    stem = token.rstrip(".")
    return stem in _DE_ABBREVS or (len(stem) <= 2 and stem.isupper())


def _build_dialogue(raw_events: list[dict]) -> list[dict]:
    """
    Merge word tokens into sentences using punctuation.
    Alternates speaker on sentence boundaries:
      - '?' → speaker just finished asking → next line is the other speaker
      - '.' / '!' → keep same speaker until a question break
    Returns [{"speaker", "text", "start", "end"}]
    """
    SENTENCE_END = {".", "!", "?", "…"}
    speakers = ["Arzt", "Patient"]
    speaker_idx = 0

    utterances: list[dict] = []
    word_buf: list[str] = []
    utt_start: float | None = None
    utt_end: float = 0.0
    last_stop: float = 0.0

    for ev in raw_events:
        t = ev.get("type")

        if t == "text":
            token = ev.get("text", "").strip()
            if not token:
                continue
            start_s = float(ev.get("start_s", last_stop))
            if utt_start is None:
                utt_start = start_s
            word_buf.append(token)

        elif t == "end_text":
            last_stop = float(ev.get("stop_s", utt_end))
            utt_end = last_stop
            # Flush on sentence-ending punctuation (skip abbreviations like Dr.)
            if word_buf and word_buf[-1][-1] in SENTENCE_END and not _is_abbrev(word_buf[-1]):
                sentence = " ".join(word_buf)
                was_question = word_buf[-1].endswith("?")
                utterances.append({
                    "speaker": speakers[speaker_idx % 2],
                    "text": sentence,
                    "start": utt_start or 0.0,
                    "end": utt_end,
                })
                word_buf = []
                utt_start = None
                if was_question:
                    speaker_idx += 1  # question → switch to answering speaker

    # Flush any remaining words
    if word_buf:
        utterances.append({
            "speaker": speakers[speaker_idx % 2],
            "text": " ".join(word_buf),
            "start": utt_start or 0.0,
            "end": utt_end,
        })

    return utterances


async def transcribe(audio_bytes: bytes, sample_rate: int = 16000) -> dict[str, Any]:
    """
    Transcribe via Gradium.
    Returns {segments, dialogue, duration_s, provider}
    segments — list of {speaker, text, start, end}
    dialogue — "Arzt: ...\nPatient: ..." for Pioneer NER / SOAP prompt
    """
    api_key = os.environ.get("GRADIUM_API_KEY", "")
    if not api_key:
        raise RuntimeError("GRADIUM_API_KEY not set")

    try:
        import gradium
    except ImportError as exc:
        raise RuntimeError("gradium package not installed") from exc

    input_format = "wav" if _is_wav(audio_bytes) else "pcm"

    async def audio_gen(data):
        for i in range(0, len(data), CHUNK_SIZE):
            yield data[i : i + CHUNK_SIZE]

    client = gradium.client.GradiumClient(api_key=api_key)
    stream = await client.stt_stream(
        {
            "model_name": "default",
            "input_format": input_format,
            "json_config": {
                "language": "de",
                "delay_in_frames": 16,
            },
        },
        audio_gen(audio_bytes),
    )

    raw_events: list[dict] = []
    async for msg in stream._stream:
        raw_events.append(msg)

    utterances = _build_dialogue(raw_events)

    # Fallback: no punctuation detected — join everything as one block
    if not utterances:
        words = [e.get("text", "").strip() for e in raw_events if e.get("type") == "text"]
        if words:
            utterances = [{"speaker": "Arzt", "text": " ".join(words), "start": 0.0, "end": 0.0}]

    duration_s = utterances[-1]["end"] if utterances else 0.0
    dialogue = "\n".join(f"{u['speaker']}: {u['text']}" for u in utterances)

    return {
        "segments": utterances,
        "dialogue": dialogue,
        "duration_s": duration_s,
        "provider": "gradium",
    }
