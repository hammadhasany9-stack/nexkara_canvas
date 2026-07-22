"""Notification creation + listing."""
from __future__ import annotations

import datetime as dt
import uuid

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.models.user import User
from app.schemas.dashboard import NotificationOut, PersonOut


async def notify(
    db: AsyncSession,
    recipient_id: uuid.UUID,
    actor_id: uuid.UUID | None,
    verb: str,
    target_type: str | None = None,
    target_id: uuid.UUID | None = None,
) -> None:
    if recipient_id == actor_id:
        return  # don't notify yourself
    db.add(
        Notification(
            user_id=recipient_id,
            actor_id=actor_id,
            verb=verb,
            target_type=target_type,
            target_id=target_id,
        )
    )
    # caller commits


async def list_for_user(db: AsyncSession, user: User) -> list[NotificationOut]:
    rows = await db.execute(
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    notes = list(rows.scalars())
    actor_ids = {n.actor_id for n in notes if n.actor_id}
    actors: dict[uuid.UUID, User] = {}
    if actor_ids:
        arows = await db.execute(select(User).where(User.id.in_(actor_ids)))
        actors = {u.id: u for u in arows.scalars()}
    return [
        NotificationOut(
            id=n.id,
            actor=PersonOut.of(actors[n.actor_id]) if n.actor_id in actors else None,
            verb=n.verb,
            target_type=n.target_type,
            target_id=n.target_id,
            read=n.read_at is not None,
            created_at=n.created_at,
        )
        for n in notes
    ]


async def unread_count(db: AsyncSession, user: User) -> int:
    rows = await db.execute(
        select(Notification).where(
            Notification.user_id == user.id, Notification.read_at.is_(None)
        )
    )
    return len(list(rows.scalars()))


async def mark_all_read(db: AsyncSession, user: User) -> None:
    await db.execute(
        update(Notification)
        .where(Notification.user_id == user.id, Notification.read_at.is_(None))
        .values(read_at=dt.datetime.now(dt.timezone.utc))
    )
    await db.commit()
