"""Idempotent seed — ensures the demo admin exists (matches the prototype login).

Run after migrations:  python -m app.seed
"""
from __future__ import annotations

import asyncio

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.user import OrgRole
from app.services import auth_service


async def seed() -> None:
    async with SessionLocal() as db:
        existing = await auth_service.get_by_email(db, settings.seed_admin_email)
        if existing is not None:
            print(f"[seed] admin {settings.seed_admin_email} already exists")
            return
        user = await auth_service.create_user(
            db,
            email=settings.seed_admin_email,
            display_name=settings.seed_admin_name,
            password=settings.seed_admin_password,
            org_role=OrgRole.admin,
        )
        print(f"[seed] created admin {user.email}")


if __name__ == "__main__":
    asyncio.run(seed())
