"""Viewer endpoints: comments, replies, resolve, versions, raw content."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core import authz
from app.db.session import get_db
from app.models.prototype import AccessLevel, PrototypeVersion
from app.models.user import User
from app.schemas.viewer import (
    CommentCreate,
    CommentOut,
    ReplyCreate,
    ResolveIn,
    VersionOut,
)
from app.services import comment_service as csvc
from app.services import prototype_service as psvc
from app.services import thumbnail_service
from app.services.storage_service import get_storage
from app.ws import rooms

router = APIRouter(prefix="/prototypes", tags=["viewer"])
comments_router = APIRouter(prefix="/comments", tags=["viewer"])


async def _load(db, user, prototype_id, minimum):
    proto, membership = await psvc.get_with_membership(db, user, prototype_id)
    if proto is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Prototype not found")
    authz.require(user, proto, membership, minimum)
    return proto


@router.get("/{prototype_id}/versions", response_model=list[VersionOut])
async def list_versions(
    prototype_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[VersionOut]:
    proto = await _load(db, user, prototype_id, AccessLevel.viewer)
    rows = await db.execute(
        select(PrototypeVersion)
        .where(PrototypeVersion.prototype_id == prototype_id)
        .order_by(PrototypeVersion.version.desc())
    )
    counts = await csvc.count_by_version(db, prototype_id)
    out = []
    for v in rows.scalars():
        out.append(VersionOut(
            id=v.id, version=v.version,
            label=v.label or f"Version {v.version}",
            comment_count=counts.get(v.version, 0),
            current=(v.version == proto.current_version),
            created_at=v.created_at,
        ))
    return out


@router.get("/{prototype_id}/raw")
async def raw_content(
    prototype_id: uuid.UUID,
    v: int | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    proto = await _load(db, user, prototype_id, AccessLevel.viewer)
    key = await psvc.content_key(db, proto, v)
    if key is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Version not found")
    try:
        data = get_storage().get(key)
    except Exception:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Content not found")
    return Response(content=data, media_type="text/html")


@router.get("/{prototype_id}/thumbnail")
async def thumbnail(
    prototype_id: uuid.UUID,
    v: int | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Static PNG snapshot of a version (rendered once, then cached).

    404 when a browser isn't available so the client falls back to the live
    iframe preview.
    """
    proto = await _load(db, user, prototype_id, AccessLevel.viewer)
    version = v or proto.current_version
    key = await psvc.content_key(db, proto, version)
    if key is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Version not found")
    png = await thumbnail_service.get_or_render(get_storage(), proto.id, version, key)
    if png is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Thumbnail unavailable")
    return Response(
        content=png,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=86400"},
    )


@router.get("/{prototype_id}/comments", response_model=list[CommentOut])
async def list_comments(
    prototype_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[CommentOut]:
    await _load(db, user, prototype_id, AccessLevel.viewer)
    comments = await csvc.list_comments(db, prototype_id)
    return await csvc.to_out_many(db, comments)


@router.post("/{prototype_id}/comments", response_model=CommentOut, status_code=201)
async def create_comment(
    prototype_id: uuid.UUID,
    body: CommentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CommentOut:
    proto = await _load(db, user, prototype_id, AccessLevel.commenter)
    c = await csvc.create(db, prototype_id, user, body.version, body.left, body.top, body.target, body.body)
    proto.comment_count = await csvc.count_for_prototype(db, prototype_id)
    await db.commit()
    out = (await csvc.to_out_many(db, [c]))[0]
    await rooms.broadcast(str(prototype_id), {"type": "comment.created", "comment": out.model_dump(mode="json")})
    return out


async def _load_comment(db, user, comment_id, minimum):
    c = await csvc.get(db, comment_id)
    if c is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Comment not found")
    await _load(db, user, c.prototype_id, minimum)
    return c


@comments_router.post("/{comment_id}/replies", response_model=CommentOut)
async def reply(
    comment_id: uuid.UUID,
    body: ReplyCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CommentOut:
    c = await _load_comment(db, user, comment_id, AccessLevel.commenter)
    c = await csvc.add_reply(db, c, user, body.body)
    out = (await csvc.to_out_many(db, [c]))[0]
    await rooms.broadcast(str(c.prototype_id), {"type": "comment.updated", "comment": out.model_dump(mode="json")})
    return out


@comments_router.post("/{comment_id}/resolve", response_model=CommentOut)
async def resolve(
    comment_id: uuid.UUID,
    body: ResolveIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CommentOut:
    c = await _load_comment(db, user, comment_id, AccessLevel.commenter)
    c = await csvc.set_resolved(db, c, body.resolved)
    out = (await csvc.to_out_many(db, [c]))[0]
    await rooms.broadcast(str(c.prototype_id), {"type": "comment.updated", "comment": out.model_dump(mode="json")})
    return out
