"""add friends_visibility to users

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-30

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

visibility_level_col = postgresql.ENUM(
    "public", "friends", "private", name="visibility_level", create_type=False
)


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "friends_visibility",
            visibility_level_col,
            nullable=False,
            server_default=sa.text("'friends'"),
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "friends_visibility")

