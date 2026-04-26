"""
LLM routing for Hakîm chat.

Priority:
  1. Pioneer fine-tuned chat model (PIONNEER_CHAT_MODEL_ID + PIONEER_API_KEY)
  2. Google AI Studio — Gemini Flash  (GCP_AI_STUDIO_API_KEY)
  3. Retrieval-only fallback           (no LLM keys set)

Each provider receives the same RAG context and German system prompt.
Returns (answer_text, provider_name).
"""
import logging
import os

import httpx

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """\
Du bist Hakîm, ein klinischer KI-Assistent im Medion KIS.
Du beantwortest Fragen von Ärzten auf Basis des transkribierten Aufnahmegesprächs.

Regeln:
- Antworte auf Deutsch, kurz und klinisch präzise (max. 3 Sätze)
- Stütze dich ausschließlich auf den bereitgestellten Gesprächskontext
- Wenn der Kontext keine Antwort enthält, sage das klar
- Keine eigenen Diagnosen — nur berichten, was im Gespräch erwähnt wurde
"""


def _build_context(segments: list[dict]) -> str:
    return "\n".join(
        f"[{int(s['start']//60):02d}:{int(s['start']%60):02d} {s['speaker']}]: {s['text']}"
        for s in segments
    )


async def _pioneer_chat(question: str, segments: list[dict]) -> str:
    model_id = os.getenv("PIONNEER_CHAT_MODEL_ID", "").strip()
    api_key  = os.getenv("PIONEER_API_KEY", "").strip()
    base_url = os.getenv("PIONEER_BASE_URL", "https://api.pioneer.ai/v1")

    if not model_id or not api_key:
        raise RuntimeError("PIONNEER_CHAT_MODEL_ID or PIONEER_API_KEY not set")

    context = _build_context(segments)
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{base_url}/chat/completions",
            headers={"Content-Type": "application/json", "X-API-Key": api_key},
            json={
                "model": model_id,
                "messages": [
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": (
                            f"Kontext aus dem Aufnahmegespräch:\n{context}\n\n"
                            f"Frage des Arztes: {question}"
                        ),
                    },
                ],
            },
        )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


async def _gemini_chat(question: str, segments: list[dict]) -> str:
    api_key = os.getenv("GCP_AI_STUDIO_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GCP_AI_STUDIO_API_KEY not set")

    context = _build_context(segments)
    prompt = (
        f"{_SYSTEM_PROMPT}\n\n"
        f"Kontext aus dem Aufnahmegespräch:\n{context}\n\n"
        f"Frage des Arztes: {question}"
    )

    # Gemini via AI Studio REST API (no heavy SDK needed)
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.5-flash:generateContent?key={api_key}"
    )
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            url,
            json={"contents": [{"parts": [{"text": prompt}]}]},
        )
    resp.raise_for_status()
    data = resp.json()
    return data["candidates"][0]["content"]["parts"][0]["text"].strip()


async def answer(question: str, segments: list[dict]) -> tuple[str, str]:
    """Return (answer_text, provider_name)."""

    # 1 — Pioneer fine-tuned chat
    if os.getenv("PIONNEER_CHAT_MODEL_ID", "").strip():
        try:
            text = await _pioneer_chat(question, segments)
            logger.info("Chat answered by Pioneer model")
            return text, "pioneer-chat"
        except Exception as exc:
            logger.warning("Pioneer chat failed (%s) — trying Gemini", exc)

    # 2 — Google AI Studio (Gemini)
    if os.getenv("GCP_AI_STUDIO_API_KEY", "").strip():
        try:
            text = await _gemini_chat(question, segments)
            logger.info("Chat answered by Gemini")
            return text, "gemini"
        except Exception as exc:
            logger.warning("Gemini chat failed (%s) — using retrieval fallback", exc)

    # 3 — Retrieval fallback
    if segments:
        return segments[0]["text"], "retrieval"
    return "Keine Informationen im Aufnahmegespräch gefunden.", "stub"
