"""Prototype, version, and membership models."""
from __future__ import annotations

import datetime as dt
import enum
import uuid

from sqlalchemy import (
    BigInteger,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    String,
    JSON,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PrototypeType(str, enum.Enum):
    web = "web"
    app = "app"


class AccessLevel(str, enum.Enum):
    viewer = "viewer"      # view / download
    commenter = "commenter"
    editor = "editor"      # upload & edit
    manager = "manager"    # add, edit & approve


class Prototype(Base):
    __tablename__ = "prototypes"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200))
    type: Mapped[PrototypeType] = mapped_column(
        SAEnum(PrototypeType, name="prototype_type"), default=PrototypeType.web
    )
    team: Mapped[str] = mapped_column(String(80), default="Product")
    # subset of ["desktop","tablet","mobile"]
    layouts: Mapped[list] = mapped_column(JSON, default=list)
    current_version: Mapped[int] = mapped_column(Integer, default=1)
    comment_count: Mapped[int] = mapped_column(Integer, default=0)
    trashed_at: Mapped[dt.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    versions: Mapped[list["PrototypeVersion"]] = relationship(
        back_populates="prototype", cascade="all, delete-orphan"
    )
    members: Mapped[list["PrototypeMember"]] = relationship(
        back_populates="prototype", cascade="all, delete-orphan"
    )


class PrototypeVersion(Base):
    __tablename__ = "prototype_versions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    prototype_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("prototypes.id", ondelete="CASCADE"), index=True
    )
    version: Mapped[int] = mapped_column(Integer)
    storage_key: Mapped[str] = mapped_column(String(400))
    byte_size: Mapped[int] = mapped_column(BigInteger, default=0)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    prototype: Mapped["Prototype"] = relationship(back_populates="versions")


class PrototypeMember(Base):
    __tablename__ = "prototype_members"

    prototype_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("prototypes.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    access: Mapped[AccessLevel] = mapped_column(
        SAEnum(AccessLevel, name="access_level"), default=AccessLevel.viewer
    )
    added_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    prototype: Mapped["Prototype"] = relationship(back_populates="members")
