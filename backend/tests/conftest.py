"""Test fixtures — run against SQLite + fakeredis + in-memory storage, no services."""
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
from app.core.security import create_session_token
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.user import OrgRole, User
from app.services import auth_service
from app.services.storage_service import MemoryStorage, set_storage_backend

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
async def session_factory(engine):
    return async_sessionmaker(engine, expire_on_commit=False)


@pytest_asyncio.fixture
async def env(engine, session_factory):
    """Wire dependency overrides, fakeredis, in-memory storage; seed admin."""
    limiter.enabled = False
    fake = fakeredis.aioredis.FakeRedis(decode_responses=True)
    redis_module.set_redis_client(fake)
    set_storage_backend(MemoryStorage())

    async def _get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = _get_db

    async with session_factory() as db:
        admin = await auth_service.create_user(
            db, TEST_ADMIN_EMAIL, "Alex Rivera", TEST_ADMIN_PASSWORD, OrgRole.admin
        )
        admin_id = admin.id

    yield {"session_factory": session_factory, "admin_id": admin_id}

    app.dependency_overrides.clear()
    await fake.aclose()


def _client_for(user_id, role: str) -> AsyncClient:
    transport = ASGITransport(app=app)
    c = AsyncClient(transport=transport, base_url="http://test")
    c.cookies.set("nx_session", create_session_token(str(user_id), role))
    return c


@pytest_asyncio.fixture
async def client(env):
    """Unauthenticated client (for the auth-flow tests)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture
async def admin_client(env):
    """Client authenticated as the seeded admin."""
    async with _client_for(env["admin_id"], "admin") as c:
        yield c


@pytest_asyncio.fixture
async def make_user(env):
    """Factory: create a user and return (user_id, authed_client)."""
    created: list[AsyncClient] = []

    async def _make(email: str, name: str = "Test User", role: OrgRole = OrgRole.member):
        async with env["session_factory"]() as db:
            u = await auth_service.create_user(db, email, name, "Password123!", role)
            uid = u.id
        c = _client_for(uid, role.value)
        created.append(c)
        return uid, c

    yield _make
    for c in created:
        await c.aclose()
