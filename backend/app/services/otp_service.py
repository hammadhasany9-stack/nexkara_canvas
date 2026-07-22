"""One-time-code lifecycle backed by Redis: issue, verify, resend cooldown.

Codes are never stored in the clear — only a keyed hash. Each code carries an
attempt counter and a TTL; too many wrong tries burns the code.
"""
from __future__ import annotations

import hashlib
import hmac
import secrets

from app.core.config import settings
from app.core.redis import get_redis

Purpose = str  # "login2fa" | "pwreset"


def _hash_code(code: str) -> str:
    return hmac.new(
        settings.jwt_secret.encode(), code.encode(), hashlib.sha256
    ).hexdigest()


def _code_key(purpose: Purpose, user_id: str) -> str:
    return f"otp:{purpose}:{user_id}"


def _attempts_key(purpose: Purpose, user_id: str) -> str:
    return f"otp_attempts:{purpose}:{user_id}"


def _cooldown_key(purpose: Purpose, user_id: str) -> str:
    return f"otp_cooldown:{purpose}:{user_id}"


def _generate_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


async def issue_code(purpose: Purpose, user_id: str) -> str:
    """Create + store a fresh code, reset attempts, arm the resend cooldown."""
    r = get_redis()
    code = _generate_code()
    await r.set(_code_key(purpose, user_id), _hash_code(code), ex=settings.otp_ttl_seconds)
    await r.delete(_attempts_key(purpose, user_id))
    await r.set(
        _cooldown_key(purpose, user_id),
        "1",
        ex=settings.otp_resend_cooldown_seconds,
    )
    return code


async def resend_seconds_remaining(purpose: Purpose, user_id: str) -> int:
    r = get_redis()
    ttl = await r.ttl(_cooldown_key(purpose, user_id))
    return ttl if ttl and ttl > 0 else 0


async def verify_code(purpose: Purpose, user_id: str, code: str) -> bool:
    """Constant-time compare against the stored hash, with attempt limiting."""
    r = get_redis()
    stored = await r.get(_code_key(purpose, user_id))
    if stored is None:
        return False

    attempts = await r.incr(_attempts_key(purpose, user_id))
    # keep the attempts counter alive as long as the code could be.
    await r.expire(_attempts_key(purpose, user_id), settings.otp_ttl_seconds)
    if attempts > settings.otp_max_attempts:
        await invalidate(purpose, user_id)
        return False

    if hmac.compare_digest(stored, _hash_code(code)):
        await invalidate(purpose, user_id)
        return True
    return False


async def invalidate(purpose: Purpose, user_id: str) -> None:
    r = get_redis()
    await r.delete(_code_key(purpose, user_id), _attempts_key(purpose, user_id))
