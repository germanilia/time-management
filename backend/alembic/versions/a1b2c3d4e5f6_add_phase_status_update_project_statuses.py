"""add phase status and update project statuses

Revision ID: a1b2c3d4e5f6
Revises: 4361e6817e4b
Create Date: 2026-03-31 14:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "4361e6817e4b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add status column to project_phases
    op.add_column(
        "project_phases",
        sa.Column("status", sa.String(50), nullable=False, server_default="planning"),
    )

    # Migrate existing projects with removed statuses to 'planning'
    op.execute("UPDATE projects SET status = 'planning' WHERE status IN ('on_hold', 'cancelled')")


def downgrade() -> None:
    # Remove status column from project_phases
    op.drop_column("project_phases", "status")

    # Revert waiting_assignment to on_hold
    op.execute("UPDATE projects SET status = 'on_hold' WHERE status = 'waiting_assignment'")
