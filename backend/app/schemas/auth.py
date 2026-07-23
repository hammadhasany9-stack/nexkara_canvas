"""Pydantic v2 request/response schemas for auth."""
from __future__ import annotations

import re
import uuid
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

_SYMBOL = re.compile(r"[^A-Za-z0-9]")


def validate_password_rules(value: str) -> str:
    """Mirror the client-side checklist — enforced server-side too."""
    errors = []
    if len(value) < 8:
        errors.append("at least 8 characters")
    if not (re.search(r"[a-z]", value) and re.search(r"[A-Z]", value)):
        errors.append("an uppercase and a lowercase letter")
    if not re.search(r"\d", value):
        errors.append("a number")
    if not _SYMBOL.search(value):
        errors.append("a symbol")
    if errors:
        raise ValueError("Your new password doesn't meet all requirements.")
    return value


# --- Requests ---

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class TwoFactorRequest(BaseModel):
    code: str = Field(min_length=6, max_length=6)
    trust_device: bool = True

    @field_validator("code")
    @classmethod
    def _digits(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError("Enter all 6 digits of your code.")
        return v


class ForgotRequest(BaseModel):
    email: EmailStr


class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)

    @field_validator("code")
    @classmethod
    def _digits(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError("Enter all 6 digits of your code.")
        return v


class ResetRequest(BaseModel):
    reset_token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def _rules(cls, v: str) -> str:
        return validate_password_rules(v)


# --- Responses ---

class LoginResponse(BaseModel):
    status: Literal["authenticated", "2fa_required"]
    masked_email: str | None = None
    user: "UserOut | None" = None


class MessageResponse(BaseModel):
    status: str
    masked_email: str | None = None


class VerifyCodeResponse(BaseModel):
    reset_token: str


class UserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    display_name: str
    org_role: str
    must_change_password: bool = False

    model_config = {"from_attributes": True}


LoginResponse.model_rebuild()
