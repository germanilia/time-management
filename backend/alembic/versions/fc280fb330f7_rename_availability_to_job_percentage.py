"""rename_availability_to_job_percentage

Revision ID: fc280fb330f7
Revises: 9ea10f34874a
Create Date: 2026-03-31 16:06:22.454999

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "fc280fb330f7"
down_revision: Union[str, Sequence[str], None] = "9ea10f34874a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Rename actual_availability_percentage to job_percentage."""
    op.alter_column(
        "employees",
        "actual_availability_percentage",
        new_column_name="job_percentage",
    )


def downgrade() -> None:
    """Revert column rename."""
    op.alter_column(
        "employees",
        "job_percentage",
        new_column_name="actual_availability_percentage",
    )
