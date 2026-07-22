"""User directory (for pickers) + admin user management."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core import authz
from app.db.session import get_db
from app.models.user import OrgRole, User
from app.schemas.dashboard import MessageOut, PersonOut, UserAdminOut, UserCreate
from app.services import auth_service
from app.services.mail_service import send_email

router = APIRouter(tags=["users"])


@router.get("/users/directory", response_model=list[PersonOut])
async def directory(
    q: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[PersonOut]:
    """People picker for sharing — any signed-in user, excludes self."""
    stmt = select(User).where(User.id != user.id, User.is_active.is_(True))
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(or_(User.display_name.ilike(like), User.email.ilike(like)))
    rows = await db.execute(stmt.limit(10))
    return [PersonOut.of(u) for u in rows.scalars()]


@router.get("/users", response_model=list[UserAdminOut])
async def list_users(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> list[UserAdminOut]:
    authz.require_admin(user)
    rows = await db.execute(select(User).order_by(User.created_at))
    return [UserAdminOut.model_validate(u) for u in rows.scalars()]


@router.post("/users", response_model=UserAdminOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserAdminOut:
    authz.require_admin(user)
    if await auth_service.get_by_email(db, body.email):
        raise HTTPException(status.HTTP_409_CONFLICT, "A user with that email already exists.")
    new = await auth_service.create_user(
        db,
        email=body.email,
        display_name=body.display_name,
        password=body.password,
        org_role=OrgRole(body.org_role),
    )
    new.invite_status = "invited"
    await db.commit()
    send_email(
        new.email,
        "You've been added to Nexkara Canvas",
        f"An admin created your account. Sign in with your email and the password you were given.",
    )
    return UserAdminOut.model_validate(new)


@router.post("/users/{user_id}/resend-invite", response_model=MessageOut)
async def resend_invite(
    user_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageOut:
    authz.require_admin(user)
    target = await db.get(User, user_id)
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    send_email(target.email, "Your Nexkara Canvas invite", "Reminder: your account is ready. Sign in to get started.")
    return MessageOut(status="sent")


@router.delete("/users/{user_id}", response_model=MessageOut)
async def delete_user(
    user_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageOut:
    authz.require_admin(user)
    if user_id == user.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can't remove yourself.")
    target = await db.get(User, user_id)
    if target is None:
        return MessageOut(status="removed")
    if target.org_role == OrgRole.admin:
        # Don't allow removing the last admin.
        rows = await db.execute(select(User).where(User.org_role == OrgRole.admin))
        if len(list(rows.scalars())) <= 1:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Can't remove the last admin.")
    await db.delete(target)
    await db.commit()
    return MessageOut(status="removed")
