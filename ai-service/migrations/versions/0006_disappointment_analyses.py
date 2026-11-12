"""Persist generated disappointment findings and recommendations."""

import sqlalchemy as sa
from alembic import op

revision = "0006_disappointment_analyses"
down_revision = "0005_disappointment_candidates"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "disappointment_analyses",
        sa.Column("listing_id", sa.String(length=64), primary_key=True),
        sa.Column("source_hash", sa.String(length=64), nullable=False),
        sa.Column("result", sa.JSON(), nullable=False),
        sa.Column("model_id", sa.String(length=255), nullable=False),
        sa.Column("prompt_version", sa.String(length=64), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("disappointment_analyses")
