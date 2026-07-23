"""Functional tests for prototype CRUD, upload, sharing, and RBAC."""
from __future__ import annotations

import pytest

HTML = b"<!doctype html><html><body><h1>Demo</h1></body></html>"


def _upload(name="Lumen — marketing site", type_="web", layouts="desktop,tablet,mobile"):
    return {
        "files": {"file": (f"{name}.html", HTML, "text/html")},
        "data": {"name": name, "type": type_, "layouts": layouts},
    }


async def _create(client, **kw):
    u = _upload(**kw)
    return await client.post("/prototypes", files=u["files"], data=u["data"])


async def test_upload_and_list(admin_client):
    r = await _create(admin_client)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["name"] == "Lumen — marketing site"
    assert body["version"] == 1
    assert body["type"] == "web"
    assert body["my_access"] == "manager"

    lst = await admin_client.get("/prototypes?section=home")
    assert lst.status_code == 200
    assert len(lst.json()) == 1


async def test_rejects_non_html(admin_client):
    r = await admin_client.post(
        "/prototypes",
        files={"file": ("evil.exe", b"MZ", "application/octet-stream")},
        data={"name": "x", "type": "web", "layouts": "desktop"},
    )
    assert r.status_code == 400


async def test_rename_and_trash_lifecycle(admin_client):
    pid = (await _create(admin_client)).json()["id"]

    r = await admin_client.patch(f"/prototypes/{pid}", json={"name": "Renamed"})
    assert r.status_code == 200 and r.json()["name"] == "Renamed"

    assert (await admin_client.post(f"/prototypes/{pid}/trash")).status_code == 200
    assert len((await admin_client.get("/prototypes?section=home")).json()) == 0
    assert len((await admin_client.get("/prototypes?section=trash")).json()) == 1

    assert (await admin_client.post(f"/prototypes/{pid}/restore")).status_code == 200
    assert len((await admin_client.get("/prototypes?section=home")).json()) == 1

    assert (await admin_client.delete(f"/prototypes/{pid}")).status_code == 200
    assert len((await admin_client.get("/prototypes?section=home")).json()) == 0


async def test_content_url(admin_client):
    pid = (await _create(admin_client)).json()["id"]
    r = await admin_client.get(f"/prototypes/{pid}/content")
    assert r.status_code == 200
    body = r.json()
    # dev default (no sandbox origin) -> same-origin /raw, not sandboxed
    assert body["sandboxed"] is False
    assert "/raw" in body["url"]


async def test_new_version_bumps(admin_client):
    pid = (await _create(admin_client)).json()["id"]
    r = await admin_client.post(
        f"/prototypes/{pid}/versions",
        files={"file": ("v2.html", HTML, "text/html")},
    )
    assert r.status_code == 200 and r.json()["version"] == 2


async def test_sharing_and_rbac(admin_client, make_user):
    pid = (await _create(admin_client)).json()["id"]
    member_id, member_client = await make_user("maya@nexkara.com", "Maya Chen")

    # Non-member can't even see it.
    assert (await member_client.get(f"/prototypes/{pid}")).status_code == 404

    # Admin shares as viewer.
    r = await admin_client.post(
        f"/prototypes/{pid}/members",
        json={"user_id": str(member_id), "access": "viewer"},
    )
    assert r.status_code == 200

    # Now visible, and appears in the member's "shared" section.
    assert (await member_client.get(f"/prototypes/{pid}")).status_code == 200
    shared = await member_client.get("/prototypes?section=shared")
    assert len(shared.json()) == 1

    # Viewer can't rename or trash.
    assert (await member_client.patch(f"/prototypes/{pid}", json={"name": "hax"})).status_code == 403
    assert (await member_client.post(f"/prototypes/{pid}/trash")).status_code == 403

    # Bumping to editor lets them rename but not trash (needs manager).
    await admin_client.post(
        f"/prototypes/{pid}/members", json={"user_id": str(member_id), "access": "editor"}
    )
    assert (await member_client.patch(f"/prototypes/{pid}", json={"name": "ok"})).status_code == 200
    assert (await member_client.post(f"/prototypes/{pid}/trash")).status_code == 403


async def test_share_creates_notification(admin_client, make_user):
    pid = (await _create(admin_client)).json()["id"]
    member_id, member_client = await make_user("devin@nexkara.com", "Devin Park")
    await admin_client.post(
        f"/prototypes/{pid}/members", json={"user_id": str(member_id), "access": "viewer"}
    )
    notes = await member_client.get("/notifications")
    assert notes.status_code == 200
    assert notes.json()["unread"] == 1
    assert "shared" in notes.json()["items"][0]["verb"]


async def test_counts(admin_client):
    await _create(admin_client)
    r = await admin_client.get("/prototypes/counts")
    assert r.status_code == 200 and r.json()["home"] == 1
