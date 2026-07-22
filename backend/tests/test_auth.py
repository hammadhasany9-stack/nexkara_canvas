"""Functional tests for the auth flow."""
from __future__ import annotations

import pytest

from app.api.routes import auth as auth_routes
from app.core.rate_limit import limiter
from tests.conftest import TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD


@pytest.fixture
def sent_codes(monkeypatch):
    """Capture OTP codes that would have been emailed."""
    box: list[str] = []
    monkeypatch.setattr(
        auth_routes, "send_otp", lambda to, code, reason: box.append(code)
    )
    return box


async def _login(client, email=TEST_ADMIN_EMAIL, password=TEST_ADMIN_PASSWORD):
    return await client.post("/auth/login", json={"email": email, "password": password})


async def test_login_then_2fa_authenticates(client, sent_codes):
    r = await _login(client)
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "2fa_required"
    assert body["masked_email"].endswith("@nexkara.com")
    assert len(sent_codes) == 1

    r2 = await client.post(
        "/auth/2fa/verify", json={"code": sent_codes[-1], "trust_device": True}
    )
    assert r2.status_code == 200
    assert r2.json()["status"] == "authenticated"
    assert "nx_session" in r2.cookies or client.cookies.get("nx_session")

    me = await client.get("/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == TEST_ADMIN_EMAIL
    assert me.json()["org_role"] == "admin"


async def test_trusted_device_skips_2fa(client, sent_codes):
    # First full login establishes the trust cookie.
    await _login(client)
    await client.post(
        "/auth/2fa/verify", json={"code": sent_codes[-1], "trust_device": True}
    )
    # Log out (clears session but keeps trust), then log in again -> straight through.
    await client.post("/auth/logout")
    codes_before = len(sent_codes)
    r = await _login(client)
    assert r.status_code == 200
    assert r.json()["status"] == "authenticated"
    assert len(sent_codes) == codes_before  # no new code issued


async def test_wrong_password_401(client, sent_codes):
    r = await _login(client, password="nope")
    assert r.status_code == 401
    assert not sent_codes


async def test_wrong_2fa_code_400(client, sent_codes):
    await _login(client)
    r = await client.post(
        "/auth/2fa/verify", json={"code": "000000", "trust_device": False}
    )
    assert r.status_code == 400


async def test_2fa_lockout_burns_code(client, sent_codes):
    await _login(client)
    good = sent_codes[-1]
    for _ in range(5):
        await client.post(
            "/auth/2fa/verify", json={"code": "000000", "trust_device": False}
        )
    # After max attempts the real code no longer works.
    r = await client.post(
        "/auth/2fa/verify", json={"code": good, "trust_device": False}
    )
    assert r.status_code == 400


async def test_forgot_reset_flow(client, sent_codes):
    r = await client.post("/auth/password/forgot", json={"email": TEST_ADMIN_EMAIL})
    assert r.status_code == 200 and r.json()["status"] == "sent"
    code = sent_codes[-1]

    r2 = await client.post(
        "/auth/password/verify-code", json={"email": TEST_ADMIN_EMAIL, "code": code}
    )
    assert r2.status_code == 200
    token = r2.json()["reset_token"]

    new_pw = "NewPass123!"
    r3 = await client.post(
        "/auth/password/reset", json={"reset_token": token, "new_password": new_pw}
    )
    assert r3.status_code == 200 and r3.json()["status"] == "updated"

    # New password now authenticates (still needs 2fa).
    r4 = await _login(client, password=new_pw)
    assert r4.status_code == 200 and r4.json()["status"] == "2fa_required"


async def test_reset_rejects_weak_password(client, sent_codes):
    await client.post("/auth/password/forgot", json={"email": TEST_ADMIN_EMAIL})
    code = sent_codes[-1]
    token = (
        await client.post(
            "/auth/password/verify-code",
            json={"email": TEST_ADMIN_EMAIL, "code": code},
        )
    ).json()["reset_token"]
    r = await client.post(
        "/auth/password/reset", json={"reset_token": token, "new_password": "weak"}
    )
    assert r.status_code == 422  # pydantic validation


async def test_forgot_unknown_email_no_enumeration(client, sent_codes):
    r = await client.post(
        "/auth/password/forgot", json={"email": "nobody@nexkara.com"}
    )
    assert r.status_code == 200
    assert r.json()["status"] == "sent"
    assert not sent_codes  # nothing actually sent for a non-user


async def test_me_unauthenticated_401(client):
    r = await client.get("/auth/me")
    assert r.status_code == 401


async def test_rate_limit_on_login(client):
    limiter.enabled = True
    try:
        statuses = []
        for _ in range(7):
            r = await _login(client, password="wrong")
            statuses.append(r.status_code)
        assert 429 in statuses
    finally:
        limiter.enabled = False
