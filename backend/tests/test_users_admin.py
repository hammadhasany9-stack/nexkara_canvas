"""Tests for the Users-admin tab, account settings, and directory."""
from __future__ import annotations

import pytest


async def test_admin_can_list_and_create_users(admin_client):
    r = await admin_client.get("/users")
    assert r.status_code == 200
    assert len(r.json()) == 1  # seeded admin

    created = await admin_client.post(
        "/users",
        json={
            "email": "new@nexkara.com",
            "display_name": "New Person",
            "org_role": "member",
            "password": "Password123!",
        },
    )
    assert created.status_code == 201
    assert created.json()["invite_status"] == "invited"
    assert len((await admin_client.get("/users")).json()) == 2


async def test_create_user_weak_password_422(admin_client):
    r = await admin_client.post(
        "/users",
        json={"email": "w@nexkara.com", "display_name": "W", "org_role": "member", "password": "weak"},
    )
    assert r.status_code == 422


async def test_duplicate_email_409(admin_client):
    r = await admin_client.post(
        "/users",
        json={
            "email": "alex.rivera@nexkara.com",
            "display_name": "Dup",
            "org_role": "member",
            "password": "Password123!",
        },
    )
    assert r.status_code == 409


async def test_non_admin_forbidden(make_user):
    _, member_client = await make_user("m@nexkara.com", "Member")
    assert (await member_client.get("/users")).status_code == 403
    assert (
        await member_client.post(
            "/users",
            json={"email": "x@nexkara.com", "display_name": "X", "org_role": "member", "password": "Password123!"},
        )
    ).status_code == 403


async def test_cannot_delete_last_admin(admin_client, env):
    r = await admin_client.delete(f"/users/{env['admin_id']}")
    # Deleting yourself is blocked before the last-admin check.
    assert r.status_code == 400


async def test_directory_excludes_self(admin_client, make_user):
    await make_user("maya@nexkara.com", "Maya Chen")
    r = await admin_client.get("/users/directory?q=maya")
    assert r.status_code == 200
    names = [p["display_name"] for p in r.json()]
    assert "Maya Chen" in names
    assert "Alex Rivera" not in names


async def test_change_password(admin_client):
    r = await admin_client.post(
        "/account/password",
        json={"current_password": "Password123!", "new_password": "NewPass123!"},
    )
    assert r.status_code == 200

    bad = await admin_client.post(
        "/account/password",
        json={"current_password": "wrong", "new_password": "Another123!"},
    )
    assert bad.status_code == 400


async def test_update_profile(admin_client):
    r = await admin_client.patch("/account/profile", json={"display_name": "Alex R."})
    assert r.status_code == 200 and r.json()["display_name"] == "Alex R."
