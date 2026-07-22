"""Notifications: list, unread count, mark all read."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.dashboard import MessageOut, NotificationOut
from app.services import notification_service

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
async def list_notifications(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> dict:
    items = await notification_service.list_for_user(db, user)
    unread = sum(1 for n in items if not n.read)
    return {"items": [n.model_dump(mode="json") for n in items], "unread": unread}


@router.post("/read-all", response_model=MessageOut)
async def read_all(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> MessageOut:
    await notification_service.mark_all_read(db, user)
    return MessageOut(status="read")
