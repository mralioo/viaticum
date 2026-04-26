"""
Transcribe a WAV file using the Gradium STT API (German).
Handles files of any length by splitting into 4-minute chunks.
Usage:
    python3 scripts/transcribe_wav.py /path/to/file.wav
Output: segments printed live, saved to <file>.transcript.json
"""
import asyncio
import io
import json
import os
import sys
import wave
from pathlib import Path


CHUNK_SECONDS = 240  # 4 min — safely under Gradium's 300s session limit


def _read_wav_chunks(wav_path: str, chunk_seconds: int):
    """Yield (chunk_index, offset_seconds, raw_wav_bytes) for each chunk."""
    with wave.open(wav_path) as wf:
        rate = wf.getframerate()
        channels = wf.getnchannels()
        sampwidth = wf.getsampwidth()
        total_frames = wf.getnframes()
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


async def transcribe_chunk(api_key: str, wav_bytes: bytes, offset_s: float, chunk_idx: int, total_chunks: int) -> list[dict]:
    import gradium

    async def audio_gen(data, chunk_size=1920):
        for i in range(0, len(data), chunk_size):
            yield data[i : i + chunk_size]

    client = gradium.client.GradiumClient(api_key=api_key)
    stream = await client.stt_stream(
        {
            "model_name": "default",
            "input_format": "wav",
            "json_config": {"language": "de"},
        },
        audio_gen(wav_bytes),
    )

    segments = []
    async for msg in stream._stream:
        if msg.get("type") == "text":
            text = msg.get("text", "").strip()
            if not text:
                continue
            start = offset_s + float(msg.get("start", 0.0))
            end = offset_s + float(msg.get("end", 0.0))
            segments.append({"text": text, "start": start, "end": end})
            print(f"  [{start:7.1f}s]  {text}")

    return segments


async def transcribe(wav_path: str) -> list[dict]:
    api_key = os.environ.get("GRADIUM_API_KEY", "")
    if not api_key:
        raise SystemExit("GRADIUM_API_KEY not set in environment")

    # Count chunks first
    chunks = list(_read_wav_chunks(wav_path, CHUNK_SECONDS))
    total = len(chunks)
    duration_min = total * CHUNK_SECONDS / 60
    print(f"File: {Path(wav_path).name}")
    print(f"Chunks: {total} × {CHUNK_SECONDS}s  (~{duration_min:.0f} min total)\n")

    all_segments = []
    for idx, offset, wav_bytes in chunks:
        print(f"[Chunk {idx+1}/{total}  offset={offset}s]")
        try:
            segs = await transcribe_chunk(api_key, wav_bytes, offset, idx, total)
            all_segments.extend(segs)
        except Exception as exc:
            print(f"  WARNING: chunk {idx+1} failed: {exc} — skipping")

    return all_segments


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("Usage: python3 scripts/transcribe_wav.py <path/to/file.wav>")

    wav_file = sys.argv[1]
    if not Path(wav_file).exists():
        raise SystemExit(f"File not found: {wav_file}")

    segments = asyncio.run(transcribe(wav_file))

    out_path = Path(wav_file).with_suffix(".transcript.json")
    out_path.write_text(json.dumps(segments, ensure_ascii=False, indent=2))

    print(f"\n{'='*60}")
    print(f"Saved {len(segments)} segments → {out_path}")
    print("\nFull transcript:")
    print(" ".join(s["text"] for s in segments))
