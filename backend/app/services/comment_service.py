"""Comment/reply persistence + serialization."""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.comment import Comment, CommentReply
from app.models.user import User
from app.schemas.dashboard import PersonOut
from app.schemas.viewer import CommentOut, ReplyOut


async def _authors(db: AsyncSession, ids: set[uuid.UUID]) -> dict[uuid.UUID, User]:
    ids = {i for i in ids if i}
    if not ids:
        return {}
    rows = await db.execute(select(User).where(User.id.in_(ids)))
    return {u.id: u for u in rows.scalars()}


async def list_comments(db: AsyncSession, prototype_id: uuid.UUID) -> list[Comment]:
    rows = await db.execute(
        select(Comment)
        .where(Comment.prototype_id == prototype_id)
        .options(selectinload(Comment.replies))
        .order_by(Comment.created_at)
    )
    return list(rows.scalars())


async def to_out_many(db: AsyncSession, comments: list[Comment]) -> list[CommentOut]:
    ids: set[uuid.UUID] = set()
    for c in comments:
        ids.add(c.author_id)
        for r in c.replies:
            ids.add(r.author_id)
    amap = await _authors(db, ids)

    def person(uid):
        u = amap.get(uid)
        return PersonOut.of(u) if u else None

    return [
        CommentOut(
            id=c.id, version=c.version, left=c.left, top=c.top, target=c.target,
            body=c.body, resolved=c.resolved, author=person(c.author_id),
            created_at=c.created_at,
            replies=[
                ReplyOut(id=r.id, author=person(r.author_id), body=r.body, created_at=r.created_at)
                for r in c.replies
            ],
        )
        for c in comments
    ]


async def get(db: AsyncSession, comment_id: uuid.UUID) -> Comment | None:
    rows = await db.execute(
        select(Comment)
        .where(Comment.id == comment_id)
        .options(selectinload(Comment.replies))
        .execution_options(populate_existing=True)  # refresh replies on re-fetch
    )
    return rows.scalar_one_or_none()


async def create(
    db: AsyncSession, prototype_id: uuid.UUID, author: User,
    version: int, left: float, top: float, target: str | None, body: str,
) -> Comment:
    c = Comment(
        prototype_id=prototype_id, author_id=author.id, version=version,
        left=left, top=top, target=target, body=body,
    )
    db.add(c)
    await db.commit()
    return await get(db, c.id)


async def add_reply(db: AsyncSession, comment: Comment, author: User, body: str) -> Comment:
    db.add(CommentReply(comment_id=comment.id, author_id=author.id, body=body))
    await db.commit()
    return await get(db, comment.id)


async def set_resolved(db: AsyncSession, comment: Comment, resolved: bool) -> Comment:
    comment.resolved = resolved
    await db.commit()
    return await get(db, comment.id)


async def count_for_prototype(db: AsyncSession, prototype_id: uuid.UUID) -> int:
    rows = await db.execute(select(Comment.id).where(Comment.prototype_id == prototype_id))
    return len(list(rows.scalars()))


async def count_by_version(db: AsyncSession, prototype_id: uuid.UUID) -> dict[int, int]:
    rows = await db.execute(
        select(Comment.version).where(Comment.prototype_id == prototype_id)
    )
    counts: dict[int, int] = {}
    for v in rows.scalars():
        counts[v] = counts.get(v, 0) + 1
    return counts
