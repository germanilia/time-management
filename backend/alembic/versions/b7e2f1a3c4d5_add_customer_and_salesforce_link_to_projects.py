"""add_customer_and_salesforce_link_to_projects

Revision ID: b7e2f1a3c4d5
Revises: fc280fb330f7
Create Date: 2026-04-09 10:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b7e2f1a3c4d5"
down_revision: Union[str, Sequence[str], None] = "fc280fb330f7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add customer (mandatory) and salesforce_link (optional) to projects."""
    op.add_column(
        "projects",
        sa.Column("customer", sa.String(length=255), nullable=False, server_default=""),
    )
    op.add_column(
        "projects",
        sa.Column("salesforce_link", sa.String(length=500), nullable=True),
    )
    # Remove the server_default after backfilling existing rows
    op.alter_column("projects", "customer", server_default=None)


def downgrade() -> None:
    """Remove customer and salesforce_link from projects."""
    op.drop_column("projects", "salesforce_link")
    op.drop_column("projects", "customer")
