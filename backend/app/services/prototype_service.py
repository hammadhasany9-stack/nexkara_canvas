"""Prototype persistence + serialization."""
from __future__ import annotations

import uuid

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core import authz
from app.models.prototype import (
    AccessLevel,
    Prototype,
    PrototypeMember,
    PrototypeType,
    PrototypeVersion,
)
from app.models.user import OrgRole, User
from app.schemas.dashboard import PersonOut, PrototypeOut
from app.services.storage_service import get_storage


def _storage_key(prototype_id: uuid.UUID, version: int) -> str:
    return f"{prototype_id}/v{version}.html"


async def create_prototype(
    db: AsyncSession,
    owner: User,
    name: str,
    type_: PrototypeType,
    layouts: list[str],
    html: bytes,
    description: str | None = None,
    source_url: str | None = None,
) -> Prototype:
    proto = Prototype(
        owner_id=owner.id,
        name=name,
        description=description,
        source_url=source_url,
        type=type_,
        layouts=layouts,
        current_version=1,
    )
    db.add(proto)
    await db.flush()  # get proto.id

    key = _storage_key(proto.id, 1)
    get_storage().put(key, html)
    db.add(
        PrototypeVersion(
            prototype_id=proto.id,
            version=1,
            storage_key=key,
            byte_size=len(html),
            created_by=owner.id,
        )
    )
    await db.commit()
    await db.refresh(proto)
    return proto


async def add_version(
    db: AsyncSession, proto: Prototype, user: User, html: bytes
) -> int:
    version = proto.current_version + 1
    key = _storage_key(proto.id, version)
    get_storage().put(key, html)
    db.add(
        PrototypeVersion(
            prototype_id=proto.id,
            version=version,
            storage_key=key,
            byte_size=len(html),
            created_by=user.id,
        )
    )
    proto.current_version = version
    await db.commit()
    return version


async def get_with_membership(
    db: AsyncSession, user: User, prototype_id: uuid.UUID
) -> tuple[Prototype | None, PrototypeMember | None]:
    # Use select (not db.get) so selectinload always populates .members, even
    # when the instance is already in the session's identity map.
    stmt = (
        select(Prototype)
        .where(Prototype.id == prototype_id)
        .options(selectinload(Prototype.members))
    )
    proto = (await db.execute(stmt)).scalar_one_or_none()
    if proto is None:
        return None, None
    membership = next((m for m in proto.members if m.user_id == user.id), None)
    return proto, membership


async def content_key(db: AsyncSession, proto: Prototype, version: int | None) -> str | None:
    v = version or proto.current_version
    row = await db.execute(
        select(PrototypeVersion).where(
            PrototypeVersion.prototype_id == proto.id, PrototypeVersion.version == v
        )
    )
    pv = row.scalar_one_or_none()
    return pv.storage_key if pv else None


async def list_for_user(
    db: AsyncSession, user: User, section: str, query: str | None
) -> list[Prototype]:
    stmt = select(Prototype).options(selectinload(Prototype.members))

    member_subq = select(PrototypeMember.prototype_id).where(
        PrototypeMember.user_id == user.id
    )

    if section == "trash":
        stmt = stmt.where(Prototype.owner_id == user.id, Prototype.trashed_at.is_not(None))
    elif section == "shared":
        stmt = stmt.where(
            Prototype.id.in_(member_subq),
            Prototype.owner_id != user.id,
            Prototype.trashed_at.is_(None),
        )
    else:  # home / recents / default -> everything the user can see, not trashed
        visible = or_(Prototype.owner_id == user.id, Prototype.id.in_(member_subq))
        stmt = stmt.where(visible, Prototype.trashed_at.is_(None))

    if query:
        like = f"%{query.lower()}%"
        stmt = stmt.where(
            or_(
                Prototype.name.ilike(like),
                Prototype.team.ilike(like),
            )
        )

    stmt = stmt.order_by(Prototype.updated_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().unique())


async def _user_map(db: AsyncSession, ids: set[uuid.UUID]) -> dict[uuid.UUID, User]:
    if not ids:
        return {}
    rows = await db.execute(select(User).where(User.id.in_(ids)))
    return {u.id: u for u in rows.scalars()}


async def to_out(db: AsyncSession, user: User, proto: Prototype) -> PrototypeOut:
    ids = {proto.owner_id} | {m.user_id for m in proto.members}
    umap = await _user_map(db, ids)
    membership = next((m for m in proto.members if m.user_id == user.id), None)
    access = authz.effective_access(user, proto, membership) or AccessLevel.viewer
    people = [PersonOut.of(umap[m.user_id]) for m in proto.members if m.user_id in umap]
    owner = umap.get(proto.owner_id)
    return PrototypeOut(
        id=proto.id,
        name=proto.name,
        description=proto.description,
        source_url=proto.source_url,
        type=proto.type.value,
        team=proto.team,
        layouts=list(proto.layouts or []),
        version=proto.current_version,
        comment_count=proto.comment_count,
        trashed=proto.trashed_at is not None,
        owner=PersonOut.of(owner) if owner else PersonOut(id=proto.owner_id, display_name="?", initials="?"),
        people=people,
        my_access=access.value,
        updated_at=proto.updated_at,
        created_at=proto.created_at,
    )


async def list_out(
    db: AsyncSession, user: User, section: str, query: str | None
) -> list[PrototypeOut]:
    protos = await list_for_user(db, user, section, query)
    return [await to_out(db, user, p) for p in protos]


async def section_counts(db: AsyncSession, user: User) -> dict[str, int]:
    home = await list_for_user(db, user, "home", None)
    shared = await list_for_user(db, user, "shared", None)
    trash = await list_for_user(db, user, "trash", None)
    return {
        "home": len(home),
        "recents": len(home),
        "shared": len(shared),
        "trash": len(trash),
    }
