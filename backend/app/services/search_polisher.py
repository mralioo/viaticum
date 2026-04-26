"""
Condense a Tavily Research report into a clinical TL;DR (2–3 sentences).

The Tavily research() call already synthesises a full markdown report,
so we only need a brief summary for the avatar's speech bubble.

Priority:
  1. Gemini Flash        — GCP_AI_STUDIO_API_KEY
  2. Pioneer chat        — PIONNEER_CHAT_MODEL_ID
  3. First paragraph     — no-LLM fallback (extract from report)
"""
import logging
import os

import httpx

logger = logging.getLogger(__name__)

_SYSTEM = """\
Du bist Hakîm, ein klinischer KI-Assistent.
Fasse den folgenden Forschungsbericht in 2–3 Sätzen auf Deutsch zusammen.
Fokussiere auf das klinisch Wesentliche. Keine URLs nennen.
"""


def _first_paragraph(report: str) -> str:
    """Extract first meaningful paragraph as fallback TL;DR."""
    for para in report.split("\n\n"):
        clean = para.strip().lstrip("#").strip()
        if len(clean) > 60:
            return clean[:400]
    return report[:400]


async def _gemini(report: str) -> str:
    api_key = os.getenv("GCP_AI_STUDIO_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GCP_AI_STUDIO_API_KEY not set")
    prompt = f"{_SYSTEM}\n\nBericht:\n{report[:3000]}\n\nZusammenfassung:"
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.0-flash:generateContent?key={api_key}"
    )
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(url, json={"contents": [{"parts": [{"text": prompt}]}]})
    resp.raise_for_status()
    return resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()


async def _pioneer(report: str) -> str:
    model_id = os.getenv("PIONNEER_CHAT_MODEL_ID", "").strip()
    api_key  = os.getenv("PIONEER_API_KEY", "").strip()
    base_url = os.getenv("PIONEER_BASE_URL", "https://api.pioneer.ai/v1")
    if not model_id or not api_key:
        raise RuntimeError("Pioneer chat not configured")
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(
            f"{base_url}/chat/completions",
            headers={"Content-Type": "application/json", "X-API-Key": api_key},
            json={
                "model": model_id,
                "messages": [
                    {"role": "system", "content": _SYSTEM},
                    {"role": "user",   "content": f"Bericht:\n{report[:3000]}\n\nZusammenfassung:"},
                ],
            },
        )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


async def tldr(report: str) -> tuple[str, str]:
    """
    Return (summary_text, provider_name).
    Tries Gemini → Pioneer → first paragraph.
    """
    if os.getenv("GCP_AI_STUDIO_API_KEY", "").strip():
        try:
            return await _gemini(report), "gemini"
        except Exception as exc:
            logger.warning("Gemini TL;DR failed (%s) — trying Pioneer", exc)

    if os.getenv("PIONNEER_CHAT_MODEL_ID", "").strip():
        try:
            return await _pioneer(report), "pioneer-chat"
        except Exception as exc:
            logger.warning("Pioneer TL;DR failed (%s) — using first paragraph", exc)

    return _first_paragraph(report), "tavily-research"
