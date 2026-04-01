"""add_financial_tracking

Revision ID: 3bcb173190f3
Revises: a1b2c3d4e5f6
Create Date: 2026-03-31 14:29:46.043657

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "3bcb173190f3"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "funding_sources",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.add_column(
        "projects",
        sa.Column(
            "billing_type",
            sa.String(length=50),
            server_default="time_and_materials",
            nullable=False,
        ),
    )
    op.add_column(
        "projects",
        sa.Column(
            "fixed_price_amount",
            sa.Numeric(precision=12, scale=2),
            nullable=True,
        ),
    )
    op.add_column(
        "projects",
        sa.Column("funding_source_id", sa.UUID(), nullable=True),
    )
    op.create_index(
        "idx_projects_funding_source_id",
        "projects",
        ["funding_source_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_projects_funding_source_id",
        "projects",
        "funding_sources",
        ["funding_source_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_check_constraint(
        "ck_projects_fixed_price_amount",
        "projects",
        "fixed_price_amount IS NULL OR fixed_price_amount >= 0",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        "ck_projects_fixed_price_amount",
        "projects",
        type_="check",
    )
    op.drop_constraint(
        "fk_projects_funding_source_id",
        "projects",
        type_="foreignkey",
    )
    op.drop_index(
        "idx_projects_funding_source_id",
        table_name="projects",
    )
    op.drop_column("projects", "funding_source_id")
    op.drop_column("projects", "fixed_price_amount")
    op.drop_column("projects", "billing_type")
    op.drop_table("funding_sources")
