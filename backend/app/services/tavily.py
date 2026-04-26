"""Tavily web search client."""
import logging
import os

import httpx

logger = logging.getLogger(__name__)

_URL = "https://api.tavily.com/search"


async def search(query: str, max_results: int = 5) -> dict:
    """Return Tavily response dict with 'answer' and 'results' keys."""
    api_key = os.getenv("TAVILY_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("TAVILY_API_KEY not set")
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            _URL,
            json={
                "api_key": api_key,
                "query": query,
                "search_depth": "advanced",
                "include_answer": True,
                "include_raw_content": False,
                "max_results": max_results,
            },
        )
    resp.raise_for_status()
    return resp.json()
