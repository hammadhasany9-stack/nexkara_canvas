"""Password hashing (Argon2id) and JWT issue/verify + cookie helpers."""
from __future__ import annotations

import datetime as dt
from typing import Any, Literal

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError
from fastapi import Response

from app.core.config import settings

# Argon2id with tuned cost. argon2-cffi defaults are Argon2id already.
_ph = PasswordHasher(time_cost=3, memory_cost=64 * 1024, parallelism=2)

TokenPurpose = Literal["session", "device_trust", "pw_reset", "share", "sandbox"]


def hash_password(password: str) -> str:
    return _ph.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _ph.verify(password_hash, password)
    except (VerifyMismatchError, VerificationError):
        return False


def needs_rehash(password_hash: str) -> bool:
    return _ph.check_needs_rehash(password_hash)


def _now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def create_token(
    subject: str,
    purpose: TokenPurpose,
    expires_delta: dt.timedelta,
    extra: dict[str, Any] | None = None,
) -> str:
    payload: dict[str, Any] = {
        "sub": subject,
        "purpose": purpose,
        "iat": _now(),
        "exp": _now() + expires_delta,
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str, purpose: TokenPurpose) -> dict[str, Any] | None:
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
    except jwt.PyJWTError:
        return None
    if payload.get("purpose") != purpose:
        return None
    return payload


def create_session_token(user_id: str, org_role: str) -> str:
    return create_token(
        user_id,
        "session",
        dt.timedelta(minutes=settings.session_ttl_minutes),
        extra={"org_role": org_role},
    )


def create_device_trust_token(user_id: str) -> str:
    return create_token(
        user_id,
        "device_trust",
        dt.timedelta(days=settings.device_trust_days),
    )


def create_reset_token(user_id: str) -> str:
    return create_token(user_id, "pw_reset", dt.timedelta(minutes=10))


def create_sandbox_token(prototype_id: str, version: int) -> str:
    return create_token(
        prototype_id,
        "sandbox",
        dt.timedelta(minutes=settings.sandbox_token_ttl_minutes),
        extra={"v": version},
    )


def _cookie_kwargs() -> dict[str, Any]:
    return {
        "httponly": True,
        "secure": settings.cookie_secure,
        "samesite": "lax",
        "domain": settings.cookie_domain,
        "path": "/",
    }


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        settings.session_cookie_name,
        token,
        max_age=settings.session_ttl_minutes * 60,
        **_cookie_kwargs(),
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        settings.session_cookie_name,
        domain=settings.cookie_domain,
        path="/",
    )


def set_trust_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        settings.trust_cookie_name,
        token,
        max_age=settings.device_trust_days * 86400,
        **_cookie_kwargs(),
    )


def clear_trust_cookie(response: Response) -> None:
    response.delete_cookie(
        settings.trust_cookie_name,
        domain=settings.cookie_domain,
        path="/",
    )
