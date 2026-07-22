"""dashboard: prototypes, versions, members, notifications

Revision ID: 0002_dashboard
Revises: 0001_users
Create Date: 2026-07-22
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002_dashboard"
down_revision: Union[str, None] = "0001_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "invite_status", sa.String(length=20), nullable=False, server_default="active"
        ),
    )

    op.create_table(
        "prototypes",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "owner_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.String(length=2000), nullable=True),
        sa.Column("source_url", sa.String(length=500), nullable=True),
        sa.Column(
            "type",
            sa.Enum("web", "app", name="prototype_type"),
            nullable=False,
            server_default="web",
        ),
        sa.Column("team", sa.String(length=80), nullable=False, server_default="Product"),
        sa.Column("layouts", sa.JSON(), nullable=False),
        sa.Column("current_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("comment_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("trashed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_prototypes_owner_id", "prototypes", ["owner_id"])

    op.create_table(
        "prototype_versions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "prototype_id",
            sa.Uuid(),
            sa.ForeignKey("prototypes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("storage_key", sa.String(length=400), nullable=False),
        sa.Column("byte_size", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_prototype_versions_prototype_id", "prototype_versions", ["prototype_id"]
    )

    op.create_table(
        "prototype_members",
        sa.Column(
            "prototype_id",
            sa.Uuid(),
            sa.ForeignKey("prototypes.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "user_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "access",
            sa.Enum("viewer", "commenter", "editor", "manager", name="access_level"),
            nullable=False,
            server_default="viewer",
        ),
        sa.Column("added_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "notifications",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "actor_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True
        ),
        sa.Column("verb", sa.String(length=200), nullable=False),
        sa.Column("target_type", sa.String(length=40), nullable=True),
        sa.Column("target_id", sa.Uuid(), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])


def downgrade() -> None:
    op.drop_table("notifications")
    op.drop_table("prototype_members")
    op.drop_table("prototype_versions")
    op.drop_index("ix_prototypes_owner_id", table_name="prototypes")
    op.drop_table("prototypes")
    op.drop_column("users", "invite_status")
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        for name in ("prototype_type", "access_level"):
            sa.Enum(name=name).drop(bind, checkfirst=True)
