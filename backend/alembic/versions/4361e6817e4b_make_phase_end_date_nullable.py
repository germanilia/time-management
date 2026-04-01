"""make_phase_end_date_nullable

Revision ID: 4361e6817e4b
Revises: 291dc2fa0da3
Create Date: 2026-03-31 12:02:40.914897

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "4361e6817e4b"
down_revision: Union[str, Sequence[str], None] = "291dc2fa0da3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column("project_phases", "end_date", existing_type=sa.DATE(), nullable=True)
    op.drop_constraint("ck_phases_dates", "project_phases", type_="check")
    op.create_check_constraint(
        "ck_phases_dates", "project_phases", "end_date IS NULL OR end_date >= start_date"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("ck_phases_dates", "project_phases", type_="check")
    op.create_check_constraint("ck_phases_dates", "project_phases", "end_date >= start_date")
    op.alter_column("project_phases", "end_date", existing_type=sa.DATE(), nullable=False)
