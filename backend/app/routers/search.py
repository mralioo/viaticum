"""
Deep-research endpoint — SSE streaming.

GET /search/web?q=<query>
  Phase events:
    {"phase": "researching", "msg": "..."}
    {"phase": "summarising", "msg": "..."}
    {"phase": "done",        "tldr": str, "report": str, "sources": [...], "provider": str}
    {"phase": "error",       "msg": "..."}
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
    """SSE: Tavily deep research → TL;DR → structured result."""

    async def generate():
        if not os.getenv("TAVILY_API_KEY", "").strip():
            yield _sse({"phase": "error", "msg": "TAVILY_API_KEY nicht konfiguriert."})
            return

        yield _sse({"phase": "researching", "msg": "Tavily Research läuft… (kann 20–30 s dauern)"})

        try:
            from backend.app.services.tavily import research
            result = await research(q)
        except Exception as exc:
            logger.warning("Tavily research failed: %s", exc)
            yield _sse({"phase": "error", "msg": f"Research fehlgeschlagen: {exc}"})
            return

        report  = result.get("report", "")
        sources = [
            {
                "title":   s.get("title", ""),
                "url":     s.get("url", ""),
                "content": (s.get("content") or "")[:250],
            }
            for s in result.get("sources", [])[:6]
        ]

        # Generate TL;DR summary
        summariser_label = (
            "Gemini kondensiert…" if os.getenv("GCP_AI_STUDIO_API_KEY", "").strip() else
            "Pioneer kondensiert…"
        )
        yield _sse({"phase": "summarising", "msg": summariser_label})

        try:
            from backend.app.services.search_polisher import tldr
            summary, provider = await tldr(report)
        except Exception as exc:
            logger.warning("TL;DR failed: %s", exc)
            summary  = report[:400]
            provider = "tavily-research"

        yield _sse({
            "phase":    "done",
            "tldr":     summary,
            "report":   report,
            "sources":  sources,
            "provider": provider,
        })

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
