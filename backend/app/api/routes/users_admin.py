"""User directory (for pickers) + admin user management + invite acceptance."""
from __future__ import annotations

import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core import authz
from app.core.config import settings
from app.core.security import create_invite_token, decode_token
from app.db.session import get_db
from app.models.user import OrgRole, User
from app.schemas.dashboard import (
    InviteAccept,
    InviteInfoOut,
    MessageOut,
    PersonOut,
    UserAdminOut,
    UserCreate,
    validate_settings_password,
)
from app.services import auth_service
from app.services.mail_service import send_email

router = APIRouter(tags=["users"])
invite_router = APIRouter(prefix="/invite", tags=["invite"])


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

    if body.access_method == "temp_password":
        if not body.password:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Set a temporary password.")
        try:
            validate_settings_password(body.password)
        except ValueError as e:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(e))
        new = await auth_service.create_user(
            db, email=body.email, display_name=body.display_name,
            password=body.password, org_role=OrgRole(body.org_role),
        )
        new.invite_status = "invited"
        new.must_change_password = True
        await db.commit()
        send_email(
            new.email,
            "You've been added to Nexkara Canvas",
            f"An admin created your account.\n\n"
            f"Sign in at {settings.frontend_origin}/login\n"
            f"Email: {new.email}\nTemporary password: {body.password}\n\n"
            "You'll be asked to set a new password on first sign-in.",
        )
    else:  # invite
        # Create with an unusable random password; the user sets their own via the link.
        new = await auth_service.create_user(
            db, email=body.email, display_name=body.display_name,
            password=secrets.token_urlsafe(32), org_role=OrgRole(body.org_role),
        )
        new.invite_status = "invited"
        await db.commit()
        token = create_invite_token(str(new.id))
        link = f"{settings.frontend_origin}/invite?token={token}"
        send_email(
            new.email,
            "You're invited to Nexkara Canvas",
            f"{user.display_name} invited you to Nexkara Canvas.\n\n"
            f"Set your password to get started:\n{link}\n\n"
            "This link expires in 7 days.",
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
    token = create_invite_token(str(target.id))
    link = f"{settings.frontend_origin}/invite?token={token}"
    send_email(
        target.email,
        "Your Nexkara Canvas invite",
        f"Reminder — set your password to get started:\n{link}\n\nThis link expires in 7 days.",
    )
    return MessageOut(status="sent")


# ---------------- Invite acceptance (public) ----------------

async def _invite_user(db: AsyncSession, token: str) -> User:
    payload = decode_token(token, "invite")
    if payload is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This invite link is invalid or has expired.")
    target = await auth_service.get_by_id(db, payload["sub"])
    if target is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This invite is no longer valid.")
    return target


@invite_router.get("/validate", response_model=InviteInfoOut)
async def validate_invite(token: str, db: AsyncSession = Depends(get_db)) -> InviteInfoOut:
    target = await _invite_user(db, token)
    return InviteInfoOut(email=target.email, display_name=target.display_name)


@invite_router.post("/accept", response_model=InviteInfoOut)
async def accept_invite(body: InviteAccept, db: AsyncSession = Depends(get_db)) -> InviteInfoOut:
    target = await _invite_user(db, body.token)
    await auth_service.set_password(db, target, body.new_password)
    target.invite_status = "active"
    target.must_change_password = False
    await db.commit()
    return InviteInfoOut(email=target.email, display_name=target.display_name)


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
