"""viewer: comments + replies

Revision ID: 0003_comments
Revises: 0002_dashboard
Create Date: 2026-07-22
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003_comments"
down_revision: Union[str, None] = "0002_dashboard"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("prototype_versions", sa.Column("label", sa.String(length=200), nullable=True))

    op.create_table(
        "comments",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("prototype_id", sa.Uuid(), sa.ForeignKey("prototypes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("left", sa.Float(), nullable=False),
        sa.Column("top", sa.Float(), nullable=False),
        sa.Column("target", sa.String(length=300), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("resolved", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_comments_prototype_id", "comments", ["prototype_id"])

    op.create_table(
        "comment_replies",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("comment_id", sa.Uuid(), sa.ForeignKey("comments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_comment_replies_comment_id", "comment_replies", ["comment_id"])


def downgrade() -> None:
    op.drop_table("comment_replies")
    op.drop_index("ix_comments_prototype_id", table_name="comments")
    op.drop_table("comments")
    op.drop_column("prototype_versions", "label")
