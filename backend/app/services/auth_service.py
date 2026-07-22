"""User lookups + credential checks + email masking."""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, needs_rehash, verify_password
from app.models.user import OrgRole, User


def normalize_email(email: str) -> str:
    return email.strip().lower()


def mask_email(email: str) -> str:
    local, _, domain = email.partition("@")
    if not domain:
        return email
    head = local[:2] if len(local) > 2 else local[:1]
    return f"{head}{'*' * max(1, len(local) - len(head))}@{domain}"


async def get_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == normalize_email(email)))
    return result.scalar_one_or_none()


async def get_by_id(db: AsyncSession, user_id: str | uuid.UUID) -> User | None:
    if isinstance(user_id, str):
        try:
            user_id = uuid.UUID(user_id)
        except ValueError:
            return None
    return await db.get(User, user_id)


async def authenticate(db: AsyncSession, email: str, password: str) -> User | None:
    user = await get_by_email(db, email)
    if user is None or not user.is_active:
        # Verify against a dummy hash to keep timing uniform (anti-enumeration).
        verify_password(password, _DUMMY_HASH)
        return None
    if not verify_password(password, user.password_hash):
        return None
    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)
        await db.commit()
    return user


async def set_password(db: AsyncSession, user: User, new_password: str) -> None:
    user.password_hash = hash_password(new_password)
    await db.commit()


async def create_user(
    db: AsyncSession,
    email: str,
    display_name: str,
    password: str,
    org_role: OrgRole = OrgRole.member,
) -> User:
    user = User(
        email=normalize_email(email),
        display_name=display_name,
        password_hash=hash_password(password),
        org_role=org_role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


# Precomputed once so authenticate() has something to burn time against.
_DUMMY_HASH = hash_password("dummy-password-for-timing-uniformity")
