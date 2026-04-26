"""
Tavily Research API client.

Uses TavilyClient.research() — an agentic deep-research endpoint that
conducts multiple searches, synthesises evidence, and streams a structured
markdown report back. Far more thorough than a simple keyword search.
"""
import json
import logging
import os

logger = logging.getLogger(__name__)


async def research(query: str, model: str = "mini") -> dict:
    """
    Run Tavily deep research on *query*.

    Returns:
        {
          "report":  str          — full markdown research report,
          "sources": list[dict]   — cited sources (url, title, content),
        }
    """
    api_key = os.getenv("TAVILY_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("TAVILY_API_KEY not set")

    from tavily import AsyncTavilyClient
    client = AsyncTavilyClient(api_key=api_key)

    full_text = ""
    sources: list[dict] = []

    stream = await client.research(query, model=model, stream=True)
    async for chunk in stream:
        if not isinstance(chunk, bytes):
            continue
        for line in chunk.decode("utf-8", errors="ignore").split("\n"):
            line = line.strip()
            if not line.startswith("data: ") or line == "data: [DONE]":
                continue
            try:
                data = json.loads(line[6:])
                # Collect streamed text delta
                choices = data.get("choices") or []
                if choices:
                    content = choices[0].get("delta", {}).get("content", "")
                    if content:
                        full_text += content
                # Collect sources if present in this chunk
                if data.get("sources"):
                    sources = data["sources"]
            except Exception:
                pass

    return {"report": full_text.strip(), "sources": sources}
