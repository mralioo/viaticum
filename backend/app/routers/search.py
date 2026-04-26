"""
Web search endpoint — SSE streaming.

GET /search/web?q=<query>
  Phase events: {"phase": "searching"|"polishing"|"done"|"error", ...}
  Final event:  {"phase": "done", "summary": str, "sources": [...], "provider": str}
"""
import json
import logging
import os

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/search", tags=["search"])


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


@router.get("/web")
async def web_search(q: str):
    """SSE streaming: Tavily search → LLM polish → structured result."""

    async def generate():
        if not os.getenv("TAVILY_API_KEY", "").strip():
            yield _sse({"phase": "error", "msg": "TAVILY_API_KEY nicht konfiguriert."})
            return

        yield _sse({"phase": "searching", "msg": "Tavily durchsucht das Web…"})

        try:
            from backend.app.services.tavily import search as tavily_search
            tavily_result = await tavily_search(q)
        except Exception as exc:
            logger.warning("Tavily search failed: %s", exc)
            yield _sse({"phase": "error", "msg": f"Suche fehlgeschlagen: {exc}"})
            return

        # Decide polish label based on available keys
        if os.getenv("ANTHROPIC_API_KEY", "").strip():
            polish_label = "Claude MCP analysiert…"
        elif os.getenv("GCP_AI_STUDIO_API_KEY", "").strip():
            polish_label = "Gemini poliert Ergebnisse…"
        else:
            polish_label = "Pioneer poliert Ergebnisse…"

        yield _sse({"phase": "polishing", "msg": polish_label})

        try:
            from backend.app.services.search_polisher import polish
            summary, sources = await polish(q, tavily_result)
        except Exception as exc:
            logger.warning("Polish failed: %s", exc)
            summary = tavily_result.get("answer") or "Keine Zusammenfassung verfügbar."
            sources = tavily_result.get("results", [])[:5]
            provider_name = "tavily"
        else:
            provider_name = (
                "claude-mcp" if os.getenv("ANTHROPIC_API_KEY", "").strip() else
                "gemini"     if os.getenv("GCP_AI_STUDIO_API_KEY", "").strip() else
                "pioneer-chat"
            )

        yield _sse({
            "phase":    "done",
            "summary":  summary,
            "provider": provider_name,
            "sources": [
                {
                    "title":          r.get("title", ""),
                    "url":            r.get("url", ""),
                    "content":        (r.get("content") or "")[:250],
                    "published_date": r.get("published_date", ""),
                }
                for r in sources
            ],
        })

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
