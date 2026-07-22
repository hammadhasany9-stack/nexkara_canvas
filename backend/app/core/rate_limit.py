"""slowapi rate limiter, backed by Redis (falls back to in-memory)."""
from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

# Redis storage keeps counters consistent across API replicas.
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=settings.redis_url,
    default_limits=[],
)
