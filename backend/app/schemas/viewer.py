"""Schemas for comments, replies, and version listing."""
from __future__ import annotations

import datetime as dt
import uuid

from pydantic import BaseModel, Field

from app.schemas.dashboard import PersonOut


class ReplyOut(BaseModel):
    id: uuid.UUID
    author: PersonOut | None
    body: str
    created_at: dt.datetime


class CommentOut(BaseModel):
    id: uuid.UUID
    version: int
    left: float
    top: float
    target: str | None
    body: str
    resolved: bool
    author: PersonOut | None
    created_at: dt.datetime
    replies: list[ReplyOut]


class CommentCreate(BaseModel):
    version: int
    left: float
    top: float
    target: str | None = None
    body: str = Field(min_length=1, max_length=4000)


class ReplyCreate(BaseModel):
    body: str = Field(min_length=1, max_length=4000)


class ResolveIn(BaseModel):
    resolved: bool = True


class VersionOut(BaseModel):
    id: uuid.UUID
    version: int
    label: str
    comment_count: int
    current: bool
    created_at: dt.datetime
