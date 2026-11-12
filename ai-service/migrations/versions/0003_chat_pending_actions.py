"""Persist confirmation-bound assistant actions."""

import sqlalchemy as sa
from alembic import op

revision = "0003_chat_pending_actions"
down_revision = "0002_chat_ownership"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "chat_pending_actions",
        sa.Column("session_id", sa.String(length=64), primary_key=True),
        sa.Column("owner_type", sa.String(length=16), primary_key=True),
        sa.Column("owner_id", sa.String(length=64), primary_key=True),
        sa.Column("action", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_chat_pending_actions_created_at", "chat_pending_actions", ["created_at"]
    )


def downgrade() -> None:
    op.drop_index("ix_chat_pending_actions_created_at", table_name="chat_pending_actions")
    op.drop_table("chat_pending_actions")
