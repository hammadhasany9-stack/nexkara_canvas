"""Schemas for prototypes, sharing, users-admin, and notifications."""
from __future__ import annotations

import datetime as dt
import uuid
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.auth import validate_password_rules


def initials(name: str) -> str:
    parts = [p for p in name.split() if p]
    if not parts:
        return "?"
    if len(parts) == 1:
        return parts[0][:2].upper()
    return (parts[0][0] + parts[-1][0]).upper()


class PersonOut(BaseModel):
    id: uuid.UUID
    display_name: str
    initials: str

    @classmethod
    def of(cls, user) -> "PersonOut":
        return cls(id=user.id, display_name=user.display_name, initials=initials(user.display_name))


# --- Prototypes ---

class PrototypeOut(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None = None
    source_url: str | None = None
    type: str
    team: str
    layouts: list[str]
    version: int
    comment_count: int
    trashed: bool
    owner: PersonOut
    people: list[PersonOut]
    my_access: str
    updated_at: dt.datetime
    created_at: dt.datetime


class PrototypeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    layouts: list[Literal["desktop", "tablet", "mobile"]] | None = None
    team: str | None = None


# --- Sharing ---

class MemberOut(BaseModel):
    user: PersonOut
    access: str


class MemberAdd(BaseModel):
    user_id: uuid.UUID
    access: Literal["viewer", "commenter", "editor", "manager"] = "viewer"


class ShareLinkOut(BaseModel):
    url: str
    token: str
    expires_at: dt.datetime


# --- Users admin ---

class UserAdminOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    display_name: str
    org_role: str
    invite_status: str
    created_at: dt.datetime

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    email: EmailStr
    display_name: str = Field(min_length=1, max_length=120)
    org_role: Literal["member", "admin"] = "member"
    password: str

    @field_validator("password")
    @classmethod
    def _rules(cls, v: str) -> str:
        return validate_password_rules(v)


# --- Account ---

class ProfileUpdate(BaseModel):
    display_name: str = Field(min_length=1, max_length=120)


def validate_settings_password(value: str) -> str:
    """Rules shown on the Settings → Change Password screen."""
    import re as _re

    if len(value) < 8 or not _re.search(r"[A-Z]", value) or not _re.search(r"\d", value):
        raise ValueError(
            "Password must be at least 8 characters and include an uppercase letter and a number."
        )
    return value


class PasswordChange(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def _rules(cls, v: str) -> str:
        return validate_settings_password(v)


# --- Notifications ---

class NotificationOut(BaseModel):
    id: uuid.UUID
    actor: PersonOut | None
    verb: str
    target_type: str | None
    target_id: uuid.UUID | None
    read: bool
    created_at: dt.datetime


class MessageOut(BaseModel):
    status: str
