"""Remember the current OTA review sample for each listing."""

import sqlalchemy as sa
from alembic import op

revision = "0004_review_samples"
down_revision = "0003_chat_pending_actions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "review_samples",
        sa.Column("kind", sa.String(length=16), primary_key=True),
        sa.Column("target_id", sa.String(length=64), primary_key=True),
        sa.Column("review_ids", sa.JSON(), nullable=False),
        sa.Column("sample_hash", sa.String(length=64), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("review_samples")
