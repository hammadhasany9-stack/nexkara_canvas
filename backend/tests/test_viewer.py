"""Tests for comments, replies, resolve, and versions listing."""
from __future__ import annotations

import pytest

HTML = b"<!doctype html><html><body><h1>Demo</h1></body></html>"


async def _create(client):
    return await client.post(
        "/prototypes",
        files={"file": ("demo.html", HTML, "text/html")},
        data={"name": "Demo", "type": "web", "layouts": "desktop"},
    )


async def test_versions_list_and_content(admin_client):
    pid = (await _create(admin_client)).json()["id"]
    await admin_client.post(f"/prototypes/{pid}/versions", files={"file": ("v2.html", HTML, "text/html")})

    r = await admin_client.get(f"/prototypes/{pid}/versions")
    assert r.status_code == 200
    versions = r.json()
    assert len(versions) == 2
    assert versions[0]["version"] == 2 and versions[0]["current"] is True

    raw = await admin_client.get(f"/prototypes/{pid}/raw")
    assert raw.status_code == 200 and b"Demo" in raw.content


async def test_comment_lifecycle(admin_client):
    pid = (await _create(admin_client)).json()["id"]

    created = await admin_client.post(
        f"/prototypes/{pid}/comments",
        json={"version": 1, "left": 120.5, "top": 80.0, "target": "Hero headline", "body": "Tighten this."},
    )
    assert created.status_code == 201
    cid = created.json()["id"]
    assert created.json()["target"] == "Hero headline"

    # reply
    replied = await admin_client.post(f"/comments/{cid}/replies", json={"body": "Agreed."})
    assert replied.status_code == 200
    assert len(replied.json()["replies"]) == 1

    # resolve
    resolved = await admin_client.post(f"/comments/{cid}/resolve", json={"resolved": True})
    assert resolved.status_code == 200 and resolved.json()["resolved"] is True

    # list
    lst = await admin_client.get(f"/prototypes/{pid}/comments")
    assert lst.status_code == 200 and len(lst.json()) == 1

    # comment_count reflected on the prototype card
    card = await admin_client.get(f"/prototypes/{pid}")
    assert card.json()["comment_count"] == 1


async def test_sandbox_route(admin_client):
    from app.core.security import create_sandbox_token

    pid = (await _create(admin_client)).json()["id"]
    token = create_sandbox_token(pid, 1)

    ok = await admin_client.get(f"/s/{pid}?v=1&t={token}")
    assert ok.status_code == 200
    assert b"Demo" in ok.content
    assert b"__nx_height" in ok.content  # height reporter injected
    assert "frame-ancestors" in ok.headers.get("content-security-policy", "")

    bad = await admin_client.get(f"/s/{pid}?v=1&t=not-a-token")
    assert bad.status_code == 403

    # token for a different version is rejected
    wrong = await admin_client.get(f"/s/{pid}?v=2&t={token}")
    assert wrong.status_code == 403


async def test_comment_rbac(admin_client, make_user):
    pid = (await _create(admin_client)).json()["id"]
    viewer_id, viewer_client = await make_user("v@nexkara.com", "Viewer")

    # not a member -> 404
    assert (await viewer_client.get(f"/prototypes/{pid}/comments")).status_code == 404

    # add as viewer -> can read but not comment
    await admin_client.post(f"/prototypes/{pid}/members", json={"user_id": str(viewer_id), "access": "viewer"})
    assert (await viewer_client.get(f"/prototypes/{pid}/comments")).status_code == 200
    denied = await viewer_client.post(
        f"/prototypes/{pid}/comments",
        json={"version": 1, "left": 1, "top": 1, "body": "hi"},
    )
    assert denied.status_code == 403

    # bump to commenter -> allowed
    await admin_client.post(f"/prototypes/{pid}/members", json={"user_id": str(viewer_id), "access": "commenter"})
    ok = await viewer_client.post(
        f"/prototypes/{pid}/comments",
        json={"version": 1, "left": 1, "top": 1, "body": "hi"},
    )
    assert ok.status_code == 201
