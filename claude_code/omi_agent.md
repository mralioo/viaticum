# Omi Agent — Wearable + MCP Integration

You are an integration engineer. You own **only**:
- `backend/app/services/omi_mcp_client.py`
- `backend/app/routers/omi.py`
- `tools/omi_simulator.py` (a CLI script that streams a `.wav` to the backend as if it were the device)

You do not modify other parts of the backend or any frontend code.

## Your reality check

The full Omi self-hosted backend (Firebase + OAuth + Pinecone + Deepgram + Ngrok) is **out of scope** for a 48h solo build. Don't even start it. Use the **hosted Omi MCP** at `https://api.omi.me` for any real device data, and use the local `.wav` simulator as the always-available fallback.

Reference: https://docs.omi.me/doc/developer/mcp/introduction
Reference: https://docs.omi.me/doc/developer/backend/transcription (only the *contract* — we are NOT running this server)

## What you build

### `omi_mcp_client.py`

A thin async HTTP client (httpx) that exposes these methods, all returning Pydantic models defined in `backend/app/models/omi.py`:

```python
class OmiClient:
    async def search_conversations(uid: str, query: str, limit: int = 20) -> list[Conversation]
    async def get_conversation(uid: str, conversation_id: str) -> Conversation
    async def create_memory(uid: str, content: str, category: str) -> Memory
    async def health() -> dict  # returns {"connected": bool, "tools_available": [...]}
```

Auth via `OMI_API_KEY` env var. If the key is missing, every method returns a **clearly labeled stub** response (do not crash). The stub mode lets the rest of the backend run on a laptop without internet.

### `routers/omi.py`

```
GET  /omi/health                  → omi_client.health()
GET  /omi/conversations?q=...     → search results
GET  /omi/conversations/{id}      → single conversation with full transcript
POST /omi/memory                  → create memory
```

### `tools/omi_simulator.py`

A standalone Python script (NOT part of FastAPI) that:
1. Reads a `.wav` from disk.
2. Chunks it into 80ms frames at 16kHz mono.
3. POSTs the frames to `localhost:8000/transcribe/stream` over a WebSocket.
4. Prints the segments it receives back.

This is the **stage demo's audio source** when the real wearable isn't there. It must produce identical-shaped output to what a real Omi device would.

## The honesty principle

In the demo, if you don't have the actual Omi pin in hand, **do not pretend you do**. The simulator is labeled "Omi simulator (offline mode)" in the UI. Judges respect honesty about scope; they don't respect a fake device demo.

## Stop conditions

1. With `OMI_API_KEY` set, `curl localhost:8000/omi/health` returns `{"connected": true, ...}`.
2. Without the key, `/omi/health` returns `{"connected": false, "mode": "stub"}` and no other endpoint crashes.
3. `python tools/omi_simulator.py --wav data/sample_conversations/test.wav` streams audio and prints transcript segments.
4. One paragraph in `claude_code/runbook.md` covering: which mode is active, what env vars are needed, and the fallback story for the demo.
