"""add_roles_table_refactor_employee_role_id_assignment_rate_override

Revision ID: da5554c84b2a
Revises: 5800ea4c4e71
Create Date: 2026-03-30 21:58:52.946306

"""

import uuid
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "da5554c84b2a"
down_revision: Union[str, Sequence[str], None] = "5800ea4c4e71"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Map old role strings to new role names + default rates
_ROLE_MAPPING = {
    "junior_developer": ("Developer", 150),
    "mid_developer": ("Developer", 150),
    "senior_developer": ("Developer", 150),
    "junior_architect": ("Architect", 250),
    "mid_architect": ("Architect", 250),
    "senior_architect": ("Architect", 250),
    "junior_devops": ("DevOps", 200),
    "mid_devops": ("DevOps", 200),
    "senior_devops": ("DevOps", 200),
}


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Create roles table
    op.create_table(
        "roles",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("default_hourly_rate", sa.Numeric(precision=10, scale=2), nullable=False),
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

    # 2. Seed default roles
    conn = op.get_bind()
    role_ids = {}
    for role_name, rate in [("Developer", 150), ("Architect", 250), ("DevOps", 200)]:
        role_id = uuid.uuid4()
        role_ids[role_name] = role_id
        conn.execute(
            sa.text("INSERT INTO roles (id, name, default_hourly_rate) VALUES (:id, :name, :rate)"),
            {"id": role_id, "name": role_name, "rate": rate},
        )

    # 3. Add role_id as NULLABLE first to employees
    op.add_column("employees", sa.Column("role_id", sa.UUID(), nullable=True))

    # 4. Migrate existing employee roles to role_id
    for old_role, (new_name, _) in _ROLE_MAPPING.items():
        new_id = role_ids[new_name]
        conn.execute(
            sa.text("UPDATE employees SET role_id = :new_id WHERE role = :old_role"),
            {"new_id": new_id, "old_role": old_role},
        )
    # Set any remaining unmatched employees to Developer
    conn.execute(
        sa.text("UPDATE employees SET role_id = :dev_id WHERE role_id IS NULL"),
        {"dev_id": role_ids["Developer"]},
    )

    # 5. Make role_id NOT NULL, add FK and index
    op.alter_column("employees", "role_id", nullable=False)
    op.create_index("idx_employees_role_id", "employees", ["role_id"], unique=False)
    op.create_foreign_key(
        "fk_employees_role_id", "employees", "roles", ["role_id"], ["id"], ondelete="RESTRICT"
    )

    # 6. Make hourly_rate nullable
    op.alter_column(
        "employees", "hourly_rate", existing_type=sa.NUMERIC(precision=10, scale=2), nullable=True
    )

    # 7. Drop old role column
    op.drop_column("employees", "role")

    # 8. Add hourly_rate_override to assignments
    op.add_column(
        "project_assignments",
        sa.Column("hourly_rate_override", sa.Numeric(precision=10, scale=2), nullable=True),
    )

    # 9. Add role_id to role_requirements (nullable first)
    op.add_column("role_requirements", sa.Column("role_id", sa.UUID(), nullable=True))

    # 10. Migrate role_requirements.role to role_id
    for old_role, (new_name, _) in _ROLE_MAPPING.items():
        new_id = role_ids[new_name]
        conn.execute(
            sa.text("UPDATE role_requirements SET role_id = :new_id WHERE role = :old_role"),
            {"new_id": new_id, "old_role": old_role},
        )
    conn.execute(
        sa.text("UPDATE role_requirements SET role_id = :dev_id WHERE role_id IS NULL"),
        {"dev_id": role_ids["Developer"]},
    )

    # 11. Make role_id NOT NULL, add FK and index
    op.alter_column("role_requirements", "role_id", nullable=False)
    op.create_index("idx_role_requirements_role_id", "role_requirements", ["role_id"], unique=False)
    op.create_foreign_key(
        "fk_role_requirements_role_id",
        "role_requirements",
        "roles",
        ["role_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    # 12. Drop old role column
    op.drop_column("role_requirements", "role")


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column(
        "role_requirements",
        sa.Column("role", sa.VARCHAR(length=50), autoincrement=False, nullable=True),
    )
    op.drop_constraint("fk_role_requirements_role_id", "role_requirements", type_="foreignkey")
    op.drop_index("idx_role_requirements_role_id", table_name="role_requirements")
    op.drop_column("role_requirements", "role_id")

    op.drop_column("project_assignments", "hourly_rate_override")

    op.add_column(
        "employees",
        sa.Column(
            "role",
            sa.VARCHAR(length=50),
            server_default=sa.text("'mid_developer'::character varying"),
            autoincrement=False,
            nullable=False,
        ),
    )
    op.drop_constraint("fk_employees_role_id", "employees", type_="foreignkey")
    op.drop_index("idx_employees_role_id", table_name="employees")
    op.alter_column(
        "employees", "hourly_rate", existing_type=sa.NUMERIC(precision=10, scale=2), nullable=False
    )
    op.drop_column("employees", "role_id")

    op.drop_table("roles")
