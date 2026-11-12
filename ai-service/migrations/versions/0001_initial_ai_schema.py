"""Create AI review and chat storage."""

import sqlalchemy as sa
from alembic import op

revision = "0001_initial_ai_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "review_records",
        sa.Column("kind", sa.String(length=16), primary_key=True),
        sa.Column("review_id", sa.String(length=64), primary_key=True),
        sa.Column("target_id", sa.String(length=64), nullable=False),
        sa.Column("content_hash", sa.String(length=64), nullable=False),
        sa.Column("content", sa.JSON(), nullable=False),
        sa.Column("source_updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("pending_summary", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_review_records_target_id", "review_records", ["target_id"])
    op.create_index("ix_review_records_active", "review_records", ["active"])
    op.create_table(
        "review_summaries",
        sa.Column("kind", sa.String(length=16), primary_key=True),
        sa.Column("target_id", sa.String(length=64), primary_key=True),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("source_review_count", sa.Integer(), nullable=False),
        sa.Column("model_id", sa.String(length=255), nullable=False),
        sa.Column("prompt_version", sa.String(length=64), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "chat_messages",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("session_id", sa.String(length=64), nullable=False),
        sa.Column("role", sa.String(length=16), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_chat_messages_session_id", "chat_messages", ["session_id"])


def downgrade() -> None:
    op.drop_index("ix_chat_messages_session_id", table_name="chat_messages")
    op.drop_table("chat_messages")
    op.drop_table("review_summaries")
    op.drop_index("ix_review_records_active", table_name="review_records")
    op.drop_index("ix_review_records_target_id", table_name="review_records")
    op.drop_table("review_records")
