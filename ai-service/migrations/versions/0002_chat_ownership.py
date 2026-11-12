"""Scope assistant conversation history to its owner."""

from alembic import op
import sqlalchemy as sa

revision = "0002_chat_ownership"
down_revision = "0001_initial_ai_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("chat_messages", sa.Column("owner_type", sa.String(length=16), nullable=True))
    op.add_column("chat_messages", sa.Column("owner_id", sa.String(length=64), nullable=True))
    op.execute("UPDATE chat_messages SET owner_type = 'guest', owner_id = session_id")
    op.alter_column("chat_messages", "owner_type", nullable=False)
    op.alter_column("chat_messages", "owner_id", nullable=False)
    op.create_index("ix_chat_messages_owner_type", "chat_messages", ["owner_type"])
    op.create_index("ix_chat_messages_owner_id", "chat_messages", ["owner_id"])
    op.create_index(
        "ix_chat_messages_session_owner",
        "chat_messages",
        ["session_id", "owner_type", "owner_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_chat_messages_session_owner", table_name="chat_messages")
    op.drop_index("ix_chat_messages_owner_id", table_name="chat_messages")
    op.drop_index("ix_chat_messages_owner_type", table_name="chat_messages")
    op.drop_column("chat_messages", "owner_id")
    op.drop_column("chat_messages", "owner_type")
