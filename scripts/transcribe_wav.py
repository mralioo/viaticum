"""
Transcribe a WAV file using the Gradium STT API (German).
Handles files of any length by splitting into 4-minute chunks.
Applies the same dialogue-formatting logic as the backend pipeline.
Usage:
    python3 scripts/transcribe_wav.py /path/to/file.wav
Output:
    data/transcripts/<timestamp>_gradium.json
    data/transcripts/<timestamp>_gradium.txt   ← clean Arzt/Patient dialogue
"""
import asyncio
import io
import json
import os
import sys
import wave
from datetime import datetime, timezone
from pathlib import Path

CHUNK_SECONDS = 240  # 4 min — safely under Gradium's 300s session limit
TRANSCRIPT_DIR = Path(__file__).parent.parent / "data" / "transcripts"

_DE_ABBREVS = {
    "Dr", "Prof", "Hr", "Fr", "Nr", "Str", "Abs", "bzw", "usw", "etc",
    "Fa", "ca", "ggf", "inkl", "max", "min", "sog", "St", "Tel",
}


def _is_abbrev(token: str) -> bool:
    stem = token.rstrip(".")
    return stem in _DE_ABBREVS or (len(stem) <= 2 and stem.isupper())


def _build_dialogue(raw_events: list[dict], offset_s: float = 0.0) -> list[dict]:
    """Group word tokens into sentences, alternate Arzt/Patient on '?'."""
    SENTENCE_END = {".", "!", "?", "…"}
    speakers = ["Arzt", "Patient"]
    speaker_idx = 0
    utterances: list[dict] = []
    word_buf: list[str] = []
    utt_start: float | None = None
    utt_end: float = offset_s
    last_stop: float = offset_s

    for ev in raw_events:
        t = ev.get("type")
        if t == "text":
            token = ev.get("text", "").strip()
            if not token:
                continue
            start_s = offset_s + float(ev.get("start_s", last_stop - offset_s))
            if utt_start is None:
                utt_start = start_s
            word_buf.append(token)
        elif t == "end_text":
            last_stop = offset_s + float(ev.get("stop_s", utt_end - offset_s))
            utt_end = last_stop
            if word_buf and word_buf[-1][-1] in SENTENCE_END and not _is_abbrev(word_buf[-1]):
                was_question = word_buf[-1].endswith("?")
                utterances.append({
                    "speaker": speakers[speaker_idx % 2],
                    "text": " ".join(word_buf),
                    "start": round(utt_start or offset_s, 2),
                    "end": round(utt_end, 2),
                })
                word_buf = []
                utt_start = None
                if was_question:
                    speaker_idx += 1

    if word_buf:
        utterances.append({
            "speaker": speakers[speaker_idx % 2],
            "text": " ".join(word_buf),
            "start": round(utt_start or offset_s, 2),
            "end": round(utt_end, 2),
        })
    return utterances, speaker_idx


def _read_wav_chunks(wav_path: str, chunk_seconds: int):
    with wave.open(wav_path) as wf:
        rate = wf.getframerate()
        channels = wf.getnchannels()
        sampwidth = wf.getsampwidth()
        chunk_frames = rate * chunk_seconds
        chunk_index = 0
        offset = 0
        while True:
            frames = wf.readframes(chunk_frames)
            if not frames:
                break
            buf = io.BytesIO()
            with wave.open(buf, "wb") as out:
                out.setnchannels(channels)
                out.setsampwidth(sampwidth)
                out.setframerate(rate)
                out.writeframes(frames)
            yield chunk_index, offset, buf.getvalue()
            offset += chunk_seconds
            chunk_index += 1


async def _transcribe_chunk(api_key: str, wav_bytes: bytes, offset_s: float) -> tuple[list[dict], int]:
    import gradium

    async def audio_gen(data, chunk_size=1920):
        for i in range(0, len(data), chunk_size):
            yield data[i : i + chunk_size]

    client = gradium.client.GradiumClient(api_key=api_key)
    stream = await client.stt_stream(
        {
            "model_name": "default",
            "input_format": "wav",
            "json_config": {"language": "de", "delay_in_frames": 16},
        },
        audio_gen(wav_bytes),
    )
    raw_events = []
    async for msg in stream._stream:
        raw_events.append(msg)

    utterances, speaker_idx = _build_dialogue(raw_events, offset_s)
    for u in utterances:
        print(f"  [{u['start']:7.1f}s]  {u['speaker']}: {u['text']}")
    return utterances, speaker_idx


async def transcribe(wav_path: str) -> list[dict]:
    api_key = os.environ.get("GRADIUM_API_KEY", "")
    if not api_key:
        raise SystemExit("GRADIUM_API_KEY not set")

    chunks = list(_read_wav_chunks(wav_path, CHUNK_SECONDS))
    total = len(chunks)
    print(f"File   : {Path(wav_path).name}")
    print(f"Chunks : {total} × {CHUNK_SECONDS}s\n")

    all_utterances: list[dict] = []
    global_speaker_idx = 0

    for idx, offset, wav_bytes in chunks:
        print(f"[Chunk {idx+1}/{total}  offset={offset}s]")
        try:
            utterances, last_speaker_idx = await _transcribe_chunk(api_key, wav_bytes, float(offset))
            # carry speaker state across chunks
            for u in utterances:
                speakers = ["Arzt", "Patient"]
                u["speaker"] = speakers[(speakers.index(u["speaker"]) + global_speaker_idx) % 2] \
                    if u["speaker"] in speakers else u["speaker"]
            global_speaker_idx = (global_speaker_idx + last_speaker_idx) % 2
            all_utterances.extend(utterances)
        except Exception as exc:
            print(f"  WARNING: chunk {idx+1} failed: {exc} — skipping")

    return all_utterances


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("Usage: python3 scripts/transcribe_wav.py <path/to/file.wav>")

    wav_file = sys.argv[1]
    if not Path(wav_file).exists():
        raise SystemExit(f"File not found: {wav_file}")

    utterances = asyncio.run(transcribe(wav_file))

    TRANSCRIPT_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    base = TRANSCRIPT_DIR / f"{ts}_gradium"

    duration_s = utterances[-1]["end"] if utterances else 0.0
    dialogue = "\n".join(f"{u['speaker']}: {u['text']}" for u in utterances)

    result = {"segments": utterances, "dialogue": dialogue, "duration_s": duration_s, "provider": "gradium"}
    (base.with_suffix(".json")).write_text(json.dumps(result, ensure_ascii=False, indent=2))
    (base.with_suffix(".txt")).write_text(dialogue, encoding="utf-8")

    print(f"\n{'='*60}")
    print(f"Saved {len(utterances)} utterances")
    print(f"  JSON → {base}.json")
    print(f"  TXT  → {base}.txt")
    print(f"\n--- Dialogue preview ---")
    print("\n".join(dialogue.splitlines()[:20]))
