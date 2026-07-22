"""Async Redis client (singleton). Overridable in tests via set_redis_client."""
from __future__ import annotations

import redis.asyncio as aioredis

from app.core.config import settings

_client: aioredis.Redis | None = None


def get_redis() -> aioredis.Redis:
    global _client
    if _client is None:
        _client = aioredis.from_url(
            settings.redis_url, encoding="utf-8", decode_responses=True
        )
    return _client


def set_redis_client(client: aioredis.Redis) -> None:
    """Test hook — inject a fakeredis client."""
    global _client
    _client = client
