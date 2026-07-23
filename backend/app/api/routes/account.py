"""Current-user account settings: profile + password change."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.security import verify_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.dashboard import MessageOut, PasswordChange, ProfileUpdate, UserAdminOut
from app.services import auth_service

router = APIRouter(prefix="/account", tags=["account"])


@router.patch("/profile", response_model=UserAdminOut)
async def update_profile(
    body: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserAdminOut:
    user.display_name = body.display_name
    await db.commit()
    return UserAdminOut.model_validate(user)


@router.post("/password", response_model=MessageOut)
async def change_password(
    body: PasswordChange,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageOut:
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Your current password isn't right.")
    await auth_service.set_password(db, user, body.new_password)
    if user.must_change_password:
        user.must_change_password = False
        await db.commit()
    return MessageOut(status="updated")
