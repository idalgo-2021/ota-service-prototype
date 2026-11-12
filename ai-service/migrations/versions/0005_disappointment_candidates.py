"""Store the latest OTA candidate snapshot for the disappointment detector."""

import sqlalchemy as sa
from alembic import op

revision = "0005_disappointment_candidates"
down_revision = "0004_review_samples"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "disappointment_candidates",
        sa.Column("listing_id", sa.String(length=64), primary_key=True),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("content_hash", sa.String(length=64), nullable=False),
        sa.Column("imported_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("disappointment_candidates")
