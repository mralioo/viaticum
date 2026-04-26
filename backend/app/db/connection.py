"""
Async PostgreSQL connection pool via asyncpg.
Call init_pool() once on startup; use get_pool() everywhere else.
"""
import json
import logging
import os
from pathlib import Path
from typing import Any

import asyncpg

logger = logging.getLogger(__name__)

_pool: asyncpg.Pool | None = None

DSN = os.getenv("POSTGRES_DSN", "postgresql://kis:KisDb2026!@localhost:5432/kisdb")
_SCHEMA = Path(__file__).parent / "schema.sql"


async def init_pool() -> None:
    global _pool

    def _json_encoder(value: Any) -> str:
        return json.dumps(value)

    def _json_decoder(value: str) -> Any:
        return json.loads(value)

    async def _init_conn(conn: asyncpg.Connection) -> None:
        await conn.set_type_codec("jsonb", encoder=_json_encoder, decoder=_json_decoder, schema="pg_catalog")
        await conn.set_type_codec("json",  encoder=_json_encoder, decoder=_json_decoder, schema="pg_catalog")

    _pool = await asyncpg.create_pool(DSN, init=_init_conn, min_size=2, max_size=10)
    logger.info("PostgreSQL pool ready: %s", DSN.split("@")[-1])

    async with _pool.acquire() as conn:
        await conn.execute(_SCHEMA.read_text())
    logger.info("Schema applied")


async def close_pool() -> None:
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("DB pool not initialised — call init_pool() first")
    return _pool
