"""Test fixtures — run the auth flow against SQLite + fakeredis, no live services."""
from __future__ import annotations

import os

# Must be set before app modules read settings.
os.environ.setdefault("REDIS_URL", "memory://")
os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("COOKIE_SECURE", "false")

import fakeredis.aioredis
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core import redis as redis_module
from app.core.rate_limit import limiter
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.user import OrgRole
from app.services import auth_service

TEST_ADMIN_EMAIL = "alex.rivera@nexkara.com"
TEST_ADMIN_PASSWORD = "Password123!"


@pytest_asyncio.fixture
async def engine():
    eng = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture
async def client(engine, monkeypatch):
    # Disable rate limiting for functional tests (a dedicated test re-enables it).
    limiter.enabled = False

    # Fresh fakeredis per test.
    fake = fakeredis.aioredis.FakeRedis(decode_responses=True)
    redis_module.set_redis_client(fake)

    TestSession = async_sessionmaker(engine, expire_on_commit=False)

    async def _get_db():
        async with TestSession() as session:
            yield session

    app.dependency_overrides[get_db] = _get_db

    # Seed the admin user.
    async with TestSession() as db:
        await auth_service.create_user(
            db,
            email=TEST_ADMIN_EMAIL,
            display_name="Alex Rivera",
            password=TEST_ADMIN_PASSWORD,
            org_role=OrgRole.admin,
        )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c

    app.dependency_overrides.clear()
    await fake.aclose()
