"""
Streams a .wav file to /transcribe/stream as if it were the physical Omi dev kit.

Usage:
    python tools/omi_simulator.py --wav data/sample_conversations/test.wav
    python tools/omi_simulator.py --wav data/sample_conversations/test.wav --url ws://localhost:8000

Omi device WebSocket protocol:
  - Binary audio frames (PCM16, 80ms chunks at 16kHz)
  - JSON {"type": "CloseStream"} at end of stream
  - Receives {"segments": [...]} response from backend

Physical device setup:
  - Device detected on USB: 2fe3:0100 NordicSemiconductor
  - Connect Omi app on phone via BLE to the dev kit
  - App → Settings → Developer → Custom Backend URL:
      ws://<your-lan-ip>:8000/transcribe/stream
  - Set OMI_USER_UID in .env (from Omi app → Settings → Account)
"""
import argparse
import asyncio
import json
import wave

import websockets

FRAME_MS = 80


async def stream(wav_path: str, base_url: str) -> None:
    url = f"{base_url}/transcribe/stream?sample_rate=16000&codec=pcm16&language=de&uid=omi-simulator"
    with wave.open(wav_path, "rb") as wf:
        rate = wf.getframerate()
        frame_size = int(rate * FRAME_MS / 1000)
        print(f"Streaming {wav_path}  {rate}Hz  →  {url}")
        async with websockets.connect(url) as ws:
            sent = 0
            while chunk := wf.readframes(frame_size):
                await ws.send(chunk)
                sent += 1
                await asyncio.sleep(FRAME_MS / 1000)
            await ws.send(json.dumps({"type": "CloseStream"}))
            print(f"Sent {sent} frames. Waiting for transcript...")
            response = json.loads(await asyncio.wait_for(ws.recv(), timeout=30.0))
            print("\nSegments:")
            for seg in response.get("segments", []):
                print(f"  [{seg['start']:.1f}s] {seg['speaker']}: {seg['text']}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Omi device simulator — streams .wav as physical Omi dev kit")
    ap.add_argument("--wav", required=True, help="Path to WAV file (16kHz mono recommended)")
    ap.add_argument("--url", default="ws://localhost:8000", help="Backend WebSocket base URL")
    args = ap.parse_args()
    asyncio.run(stream(args.wav, args.url))
