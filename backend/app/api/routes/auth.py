"""Auth endpoints: login, 2FA, password reset, session.

The flow mirrors the Auth.dc.html prototype but replaces its hardcoded OTP and
localStorage device-trust with server-issued codes (Redis) and signed httpOnly
cookies.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.rate_limit import limiter
from app.core.security import (
    clear_session_cookie,
    clear_trust_cookie,
    create_device_trust_token,
    create_reset_token,
    create_session_token,
    decode_token,
    set_session_cookie,
    set_trust_cookie,
)
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    ForgotRequest,
    LoginRequest,
    LoginResponse,
    MessageResponse,
    ResetRequest,
    TwoFactorRequest,
    UserOut,
    VerifyCodeRequest,
    VerifyCodeResponse,
)
from app.services import auth_service, otp_service
from app.services.mail_service import send_otp

router = APIRouter(prefix="/auth", tags=["auth"])

_BAD_CREDS = "Those credentials don't match. Check your email and password."
_BAD_CODE = "That code isn't right. Check and try again."

# A short-lived cookie remembering which user is mid-2FA (so /2fa/verify knows
# the subject without trusting a client-supplied id).
_PENDING_COOKIE = "nx_2fa_pending"


def _device_trusted(request: Request, user_id: str) -> bool:
    token = request.cookies.get(settings.trust_cookie_name)
    if not token:
        return False
    payload = decode_token(token, "device_trust")
    return bool(payload and payload.get("sub") == user_id)


@router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")
async def login(
    request: Request,
    response: Response,
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    user = await auth_service.authenticate(db, body.email, body.password)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, _BAD_CREDS)

    uid = str(user.id)
    if _device_trusted(request, uid):
        set_session_cookie(response, create_session_token(uid, user.org_role.value))
        return LoginResponse(status="authenticated", user=UserOut.model_validate(user))

    code = await otp_service.issue_code("login2fa", uid)
    send_otp(user.email, code, "two-factor sign-in")
    # Remember the pending subject in a short signed cookie (10 min).
    response.set_cookie(
        _PENDING_COOKIE,
        create_reset_token(uid),  # reuse the 10-min token type as a pending marker
        max_age=600,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )
    return LoginResponse(status="2fa_required", masked_email=auth_service.mask_email(user.email))


@router.post("/2fa/verify", response_model=LoginResponse)
@limiter.limit("10/minute")
async def verify_2fa(
    request: Request,
    response: Response,
    body: TwoFactorRequest,
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    pending = request.cookies.get(_PENDING_COOKIE)
    payload = decode_token(pending, "pw_reset") if pending else None
    if payload is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Start sign-in again.")
    uid = payload["sub"]

    if not await otp_service.verify_code("login2fa", uid, body.code):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, _BAD_CODE)

    user = await auth_service.get_by_id(db, uid)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")

    set_session_cookie(response, create_session_token(uid, user.org_role.value))
    if body.trust_device:
        set_trust_cookie(response, create_device_trust_token(uid))
    else:
        clear_trust_cookie(response)
    response.delete_cookie(_PENDING_COOKIE, path="/")
    return LoginResponse(status="authenticated", user=UserOut.model_validate(user))


@router.post("/2fa/resend", response_model=MessageResponse)
@limiter.limit("5/minute")
async def resend_2fa(
    request: Request, db: AsyncSession = Depends(get_db)
) -> MessageResponse:
    pending = request.cookies.get(_PENDING_COOKIE)
    payload = decode_token(pending, "pw_reset") if pending else None
    if payload is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Start sign-in again.")
    uid = payload["sub"]
    if await otp_service.resend_seconds_remaining("login2fa", uid) > 0:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Please wait before resending.")
    user = await auth_service.get_by_id(db, uid)
    if user is not None:
        code = await otp_service.issue_code("login2fa", uid)
        send_otp(user.email, code, "two-factor sign-in")
    return MessageResponse(status="sent")


@router.post("/password/forgot", response_model=MessageResponse)
@limiter.limit("5/minute")
async def forgot_password(
    request: Request, body: ForgotRequest, db: AsyncSession = Depends(get_db)
) -> MessageResponse:
    # Always 200 — never reveal whether the email exists.
    user = await auth_service.get_by_email(db, body.email)
    if user is not None and user.is_active:
        code = await otp_service.issue_code("pwreset", str(user.id))
        send_otp(user.email, code, "password reset")
        return MessageResponse(status="sent", masked_email=auth_service.mask_email(user.email))
    return MessageResponse(status="sent", masked_email=auth_service.mask_email(body.email))


@router.post("/password/verify-code", response_model=VerifyCodeResponse)
@limiter.limit("10/minute")
async def verify_reset_code(
    request: Request, body: VerifyCodeRequest, db: AsyncSession = Depends(get_db)
) -> VerifyCodeResponse:
    user = await auth_service.get_by_email(db, body.email)
    if user is None or not await otp_service.verify_code("pwreset", str(user.id), body.code):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, _BAD_CODE)
    return VerifyCodeResponse(reset_token=create_reset_token(str(user.id)))


@router.post("/password/reset", response_model=MessageResponse)
@limiter.limit("5/minute")
async def reset_password(
    request: Request, body: ResetRequest, db: AsyncSession = Depends(get_db)
) -> MessageResponse:
    payload = decode_token(body.reset_token, "pw_reset")
    if payload is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Reset link expired. Start again.")
    user = await auth_service.get_by_id(db, payload["sub"])
    if user is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "User not found")
    await auth_service.set_password(db, user, body.new_password)
    return MessageResponse(status="updated")


@router.post("/logout", response_model=MessageResponse)
async def logout(response: Response) -> MessageResponse:
    clear_session_cookie(response)
    return MessageResponse(status="logged_out")


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(user)
