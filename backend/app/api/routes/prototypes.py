"""Prototype CRUD, upload, versions, content, trash, and sharing."""
from __future__ import annotations

import datetime as dt
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core import authz
from app.core.config import settings
from app.core.security import create_token, decode_token
from app.db.session import get_db
from app.models.prototype import AccessLevel, PrototypeMember, PrototypeType, PrototypeVersion
from app.models.user import User
from app.schemas.dashboard import (
    MemberAdd,
    MemberOut,
    MessageOut,
    PersonOut,
    PrototypeOut,
    PrototypeUpdate,
    ShareLinkOut,
)
from app.services import notification_service, prototype_service as svc
from app.services.storage_service import get_storage

router = APIRouter(prefix="/prototypes", tags=["prototypes"])

_ALLOWED_EXT = (".html", ".htm")


async def _read_upload(file: UploadFile) -> bytes:
    name = (file.filename or "").lower()
    if not name.endswith(_ALLOWED_EXT):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only .html or .htm files are allowed.")
    data = await file.read()
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "File is too large.")
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The file is empty.")
    return data


def _parse_layouts(raw: str) -> list[str]:
    valid = {"desktop", "tablet", "mobile"}
    picked = [x.strip() for x in raw.split(",") if x.strip() in valid]
    return picked or ["desktop", "tablet", "mobile"]


@router.get("", response_model=list[PrototypeOut])
async def list_prototypes(
    section: str = "home",
    q: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[PrototypeOut]:
    return await svc.list_out(db, user, section, q)


@router.get("/counts")
async def counts(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> dict[str, int]:
    return await svc.section_counts(db, user)


@router.post("", response_model=PrototypeOut, status_code=status.HTTP_201_CREATED)
async def create_prototype(
    file: UploadFile = File(...),
    name: str = Form(...),
    type: str = Form("web"),
    layouts: str = Form("desktop,tablet,mobile"),
    description: str = Form(""),
    source_url: str = Form(""),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PrototypeOut:
    if not name.strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Give your prototype a name.")
    data = await _read_upload(file)
    proto_type = PrototypeType.app if type.lower() == "app" else PrototypeType.web
    proto = await svc.create_prototype(
        db, user, name.strip(), proto_type, _parse_layouts(layouts), data,
        description=description.strip() or None,
        source_url=source_url.strip() or None,
    )
    proto, _ = await svc.get_with_membership(db, user, proto.id)
    return await svc.to_out(db, user, proto)


async def _load(db: AsyncSession, user: User, prototype_id: uuid.UUID, minimum: AccessLevel):
    proto, membership = await svc.get_with_membership(db, user, prototype_id)
    if proto is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Prototype not found")
    authz.require(user, proto, membership, minimum)
    return proto, membership


@router.get("/{prototype_id}", response_model=PrototypeOut)
async def get_prototype(
    prototype_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PrototypeOut:
    proto, _ = await _load(db, user, prototype_id, AccessLevel.viewer)
    return await svc.to_out(db, user, proto)


@router.patch("/{prototype_id}", response_model=PrototypeOut)
async def update_prototype(
    prototype_id: uuid.UUID,
    body: PrototypeUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PrototypeOut:
    proto, _ = await _load(db, user, prototype_id, AccessLevel.editor)
    if body.name is not None:
        proto.name = body.name
    if body.source_url is not None:
        proto.source_url = body.source_url
    if body.layouts is not None:
        proto.layouts = body.layouts
    if body.team is not None:
        proto.team = body.team
    await db.commit()
    proto, _ = await svc.get_with_membership(db, user, prototype_id)
    return await svc.to_out(db, user, proto)


@router.post("/{prototype_id}/versions", response_model=PrototypeOut)
async def upload_version(
    prototype_id: uuid.UUID,
    file: UploadFile = File(...),
    note: str = Form(""),
    name: str = Form(""),
    layouts: str = Form(""),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PrototypeOut:
    proto, _ = await _load(db, user, prototype_id, AccessLevel.editor)
    data = await _read_upload(file)
    await svc.add_version(db, proto, user, data, label=note.strip() or None)
    if name.strip():
        proto.name = name.strip()
    if layouts.strip():
        proto.layouts = _parse_layouts(layouts)
    await db.commit()
    proto, _ = await svc.get_with_membership(db, user, prototype_id)
    return await svc.to_out(db, user, proto)


@router.get("/{prototype_id}/content")
async def get_content(
    prototype_id: uuid.UUID,
    v: int | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return how the viewer should load this version's HTML.

    - sandbox_origin set -> isolated cross-origin URL with a signed token.
    - otherwise           -> same-origin /raw (viewer fetches it into a blob).
    """
    proto, _ = await _load(db, user, prototype_id, AccessLevel.viewer)
    version = v or proto.current_version
    key = await svc.content_key(db, proto, version)
    if key is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Version not found")

    if settings.sandbox_origin:
        from app.core.security import create_sandbox_token
        token = create_sandbox_token(str(proto.id), version)
        url = f"{settings.sandbox_origin}/s/{proto.id}?v={version}&t={token}"
        return {"url": url, "sandboxed": True}
    return {"url": f"/api/prototypes/{proto.id}/raw?v={version}", "sandboxed": False}


@router.post("/{prototype_id}/trash", response_model=MessageOut)
async def trash(
    prototype_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageOut:
    proto, _ = await _load(db, user, prototype_id, AccessLevel.manager)
    proto.trashed_at = dt.datetime.now(dt.timezone.utc)
    await db.commit()
    return MessageOut(status="trashed")


@router.post("/{prototype_id}/restore", response_model=MessageOut)
async def restore(
    prototype_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageOut:
    proto, _ = await _load(db, user, prototype_id, AccessLevel.manager)
    proto.trashed_at = None
    await db.commit()
    return MessageOut(status="restored")


@router.delete("/{prototype_id}", response_model=MessageOut)
async def delete_prototype(
    prototype_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageOut:
    proto, _ = await _load(db, user, prototype_id, AccessLevel.manager)
    # best-effort blob cleanup (query keys; proto.versions isn't eager-loaded)
    keys = await db.execute(
        select(PrototypeVersion.storage_key).where(
            PrototypeVersion.prototype_id == proto.id
        )
    )
    for key in keys.scalars():
        try:
            get_storage().delete(key)
        except Exception:
            pass
    await db.delete(proto)
    await db.commit()
    return MessageOut(status="deleted")


# ---------------- Sharing ----------------

@router.get("/{prototype_id}/members", response_model=list[MemberOut])
async def list_members(
    prototype_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[MemberOut]:
    proto, _ = await _load(db, user, prototype_id, AccessLevel.viewer)
    out: list[MemberOut] = []
    for m in proto.members:
        u = await db.get(User, m.user_id)
        if u:
            out.append(MemberOut(user=PersonOut.of(u), access=m.access.value))
    return out


@router.post("/{prototype_id}/members", response_model=MemberOut)
async def add_member(
    prototype_id: uuid.UUID,
    body: MemberAdd,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MemberOut:
    proto, _ = await _load(db, user, prototype_id, AccessLevel.manager)
    target = await db.get(User, body.user_id)
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if target.id == proto.owner_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Owner already has full access.")
    existing = await db.get(PrototypeMember, {"prototype_id": proto.id, "user_id": target.id})
    access = AccessLevel(body.access)
    if existing:
        existing.access = access
    else:
        db.add(PrototypeMember(prototype_id=proto.id, user_id=target.id, access=access))
    await notification_service.notify(
        db, recipient_id=target.id, actor_id=user.id,
        verb=f"shared {proto.name} with you", target_type="prototype", target_id=proto.id,
    )
    await db.commit()
    return MemberOut(user=PersonOut.of(target), access=access.value)


@router.delete("/{prototype_id}/members/{user_id}", response_model=MessageOut)
async def remove_member(
    prototype_id: uuid.UUID,
    user_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageOut:
    proto, _ = await _load(db, user, prototype_id, AccessLevel.manager)
    m = await db.get(PrototypeMember, {"prototype_id": proto.id, "user_id": user_id})
    if m:
        await db.delete(m)
        await db.commit()
    return MessageOut(status="removed")


@router.post("/{prototype_id}/share-link", response_model=ShareLinkOut)
async def share_link(
    prototype_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ShareLinkOut:
    proto, _ = await _load(db, user, prototype_id, AccessLevel.manager)
    expires = dt.timedelta(days=7)
    token = create_token(str(proto.id), "share", expires, extra={"kind": "prototype_share"})
    url = f"{settings.frontend_origin}/p/{proto.id}?token={token}"
    return ShareLinkOut(
        url=url, token=token, expires_at=dt.datetime.now(dt.timezone.utc) + expires
    )
