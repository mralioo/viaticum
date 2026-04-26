"""
Polish Tavily search results into a clinical German summary.

Priority:
  1. Claude with Tavily tool (true MCP agent)  — ANTHROPIC_API_KEY
  2. Google Gemini Flash                        — GCP_AI_STUDIO_API_KEY
  3. Pioneer fine-tuned chat                   — PIONNEER_CHAT_MODEL_ID
  4. Raw Tavily answer                          — always available
"""
import json
import logging
import os

import httpx

logger = logging.getLogger(__name__)

_SYSTEM = """\
Du bist Hakîm, ein klinischer KI-Assistent im Medion KIS.
Fasse Web-Suchergebnisse prägnant auf Deutsch zusammen — klinisch relevant, max. 3–4 Sätze.
Keine URLs nennen. Nur Fakten aus den bereitgestellten Quellen verwenden.
"""


def _format_results(query: str, tavily: dict) -> str:
    lines = [f"Suchanfrage: {query}"]
    if tavily.get("answer"):
        lines.append(f"Überblick: {tavily['answer']}")
    for r in tavily.get("results", [])[:4]:
        snippet = (r.get("content") or "")[:300]
        lines.append(f"- {r.get('title', '')}: {snippet}")
    return "\n".join(lines)


async def _claude_mcp(question: str) -> tuple[str, list[dict]]:
    """True MCP: Claude decides what to search, calls Tavily as a registered tool."""
    import anthropic
    from backend.app.services.tavily import search as tavily_search

    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
    tools = [
        {
            "name": "web_search",
            "description": (
                "Search the internet for medical information: clinical guidelines, "
                "drug interactions, diagnoses, treatment protocols."
            ),
            "input_schema": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query in German or English"},
                },
                "required": ["query"],
            },
        }
    ]

    messages = [{"role": "user", "content": question}]
    response = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        system=_SYSTEM,
        tools=tools,
        messages=messages,
    )

    sources: list[dict] = []

    if response.stop_reason == "tool_use":
        tool_results = []
        for block in response.content:
            if block.type == "tool_use" and block.name == "web_search":
                tavily = await tavily_search(block.input["query"])
                sources = tavily.get("results", [])[:5]
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": json.dumps({
                        "answer": tavily.get("answer", ""),
                        "results": [
                            {"title": r.get("title", ""), "content": (r.get("content") or "")[:300]}
                            for r in sources
                        ],
                    }, ensure_ascii=False),
                })

        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": tool_results})

        final = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            system=_SYSTEM,
            tools=tools,
            messages=messages,
        )
        text = "".join(
            b.text for b in final.content if hasattr(b, "text")
        ).strip()
    else:
        text = "".join(
            b.text for b in response.content if hasattr(b, "text")
        ).strip()

    return text, sources


async def _gemini(query: str, tavily: dict) -> str:
    api_key = os.getenv("GCP_AI_STUDIO_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GCP_AI_STUDIO_API_KEY not set")
    prompt = f"{_SYSTEM}\n\n{_format_results(query, tavily)}\n\nZusammenfassung:"
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.0-flash:generateContent?key={api_key}"
    )
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(url, json={"contents": [{"parts": [{"text": prompt}]}]})
    resp.raise_for_status()
    data = resp.json()
    return data["candidates"][0]["content"]["parts"][0]["text"].strip()


async def _pioneer(query: str, tavily: dict) -> str:
    model_id = os.getenv("PIONNEER_CHAT_MODEL_ID", "").strip()
    api_key = os.getenv("PIONEER_API_KEY", "").strip()
    base_url = os.getenv("PIONEER_BASE_URL", "https://api.pioneer.ai/v1")
    if not model_id or not api_key:
        raise RuntimeError("Pioneer chat not configured")
    context = _format_results(query, tavily)
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(
            f"{base_url}/chat/completions",
            headers={"Content-Type": "application/json", "X-API-Key": api_key},
            json={
                "model": model_id,
                "messages": [
                    {"role": "system", "content": _SYSTEM},
                    {"role": "user",   "content": f"{context}\n\nZusammenfassung:"},
                ],
            },
        )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


async def polish(question: str, tavily: dict) -> tuple[str, list[dict]]:
    """
    Return (summary_text, sources_list).
    Sources come from Tavily; summary from the best available LLM.
    """
    sources = tavily.get("results", [])[:5]

    # 1. Claude MCP (tool use — Claude calls Tavily itself)
    if os.getenv("ANTHROPIC_API_KEY", "").strip():
        try:
            text, mcp_sources = await _claude_mcp(question)
            if mcp_sources:
                sources = mcp_sources
            logger.info("Web search polished by Claude MCP")
            return text, sources
        except Exception as exc:
            logger.warning("Claude MCP polish failed (%s) — trying Gemini", exc)

    # 2. Gemini
    if os.getenv("GCP_AI_STUDIO_API_KEY", "").strip():
        try:
            text = await _gemini(question, tavily)
            logger.info("Web search polished by Gemini")
            return text, sources
        except Exception as exc:
            logger.warning("Gemini polish failed (%s) — trying Pioneer", exc)

    # 3. Pioneer
    if os.getenv("PIONNEER_CHAT_MODEL_ID", "").strip():
        try:
            text = await _pioneer(question, tavily)
            logger.info("Web search polished by Pioneer")
            return text, sources
        except Exception as exc:
            logger.warning("Pioneer polish failed (%s) — using raw Tavily answer", exc)

    # 4. Raw Tavily answer
    raw = tavily.get("answer") or "Keine Zusammenfassung verfügbar."
    return raw, sources
