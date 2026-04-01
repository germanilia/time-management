import uuid

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    MetaData,
    Numeric,
    String,
    Table,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID

metadata = MetaData()

users = Table(
    "users",
    metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("email", String(255), nullable=False, unique=True),
    Column("password_hash", Text, nullable=False),
    Column("name", String(255), nullable=False),
    Column("role", String(50), nullable=False, server_default="viewer"),
    Column("is_active", Boolean, nullable=False, server_default="true"),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

project_statuses = Table(
    "project_statuses",
    metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("name", String(100), nullable=False, unique=True),
    Column("display_order", Integer, nullable=False, server_default="0"),
    Column("color", String(50), nullable=True),
    Column("is_default", Boolean, nullable=False, server_default="false"),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

funding_sources = Table(
    "funding_sources",
    metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("name", String(100), nullable=False, unique=True),
    Column("description", Text, nullable=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

roles = Table(
    "roles",
    metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("name", String(100), nullable=False, unique=True),
    Column("default_hourly_rate", Numeric(10, 2), nullable=False),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

employees = Table(
    "employees",
    metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("name", String(255), nullable=False),
    Column("email", String(255), nullable=False, unique=True),
    Column(
        "role_id",
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="RESTRICT"),
        nullable=False,
    ),
    Column("hourly_rate", Numeric(10, 2), nullable=True),
    Column("job_percentage", Integer, nullable=False, server_default="100"),
    Column("target_utilization_percentage", Integer, nullable=False, server_default="100"),
    Column("status", String(50), nullable=False, server_default="active"),
    Column("department", String(255), nullable=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    CheckConstraint(
        "job_percentage >= 0 AND job_percentage <= 100",
        name="ck_employees_actual_availability",
    ),
    CheckConstraint(
        "target_utilization_percentage >= 0 AND target_utilization_percentage <= 100",
        name="ck_employees_target_utilization",
    ),
    Index("idx_employees_role_id", "role_id"),
)

projects = Table(
    "projects",
    metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("name", String(255), nullable=False),
    Column("description", Text, nullable=True),
    Column("start_date", Date, nullable=False),
    Column("end_date", Date, nullable=True),
    Column("status", String(50), nullable=False, server_default="planning"),
    Column("billing_type", String(50), nullable=False, server_default="time_and_materials"),
    Column("fixed_price_amount", Numeric(12, 2), nullable=True),
    Column(
        "funding_source_id",
        UUID(as_uuid=True),
        ForeignKey("funding_sources.id", ondelete="SET NULL"),
        nullable=True,
    ),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    CheckConstraint(
        "end_date IS NULL OR end_date >= start_date",
        name="ck_projects_dates",
    ),
    CheckConstraint(
        "fixed_price_amount IS NULL OR fixed_price_amount >= 0",
        name="ck_projects_fixed_price_amount",
    ),
    Index("idx_projects_funding_source_id", "funding_source_id"),
)

project_phases = Table(
    "project_phases",
    metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column(
        "project_id",
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    ),
    Column("name", String(255), nullable=False),
    Column("start_date", Date, nullable=False),
    Column("end_date", Date, nullable=True),
    Column("allocation_type", String(50), nullable=False, server_default="headcount"),
    Column("required_hours", Integer, nullable=True),
    Column("required_headcount", Integer, nullable=True),
    Column("budget", Numeric(12, 2), nullable=True),
    Column("phase_order", Integer, nullable=False, server_default="0"),
    Column("status", String(50), nullable=False, server_default="planning"),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    CheckConstraint("end_date IS NULL OR end_date >= start_date", name="ck_phases_dates"),
    Index("idx_project_phases_project_id", "project_id"),
)

project_assignments = Table(
    "project_assignments",
    metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column(
        "project_id",
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    ),
    Column(
        "phase_id",
        UUID(as_uuid=True),
        ForeignKey("project_phases.id", ondelete="CASCADE"),
        nullable=False,
    ),
    Column(
        "employee_id",
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="RESTRICT"),
        nullable=False,
    ),
    Column("allocation_type", String(50), nullable=False, server_default="percentage"),
    Column("allocated_hours", Integer, nullable=True),
    Column("allocation_percentage", Integer, nullable=True),
    Column("hourly_rate_override", Numeric(10, 2), nullable=True),
    Column("start_date", Date, nullable=False),
    Column("end_date", Date, nullable=False),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    CheckConstraint("end_date >= start_date", name="ck_assignments_dates"),
    CheckConstraint(
        "allocation_percentage IS NULL OR "
        "(allocation_percentage >= 1 AND allocation_percentage <= 100)",
        name="ck_assignments_percentage",
    ),
    CheckConstraint(
        "allocated_hours IS NULL OR allocated_hours > 0",
        name="ck_assignments_hours",
    ),
    Index("idx_assignments_project_id", "project_id"),
    Index("idx_assignments_phase_id", "phase_id"),
    Index("idx_assignments_employee_id", "employee_id"),
    Index("idx_assignments_dates", "start_date", "end_date"),
)

role_requirements = Table(
    "role_requirements",
    metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column(
        "project_id",
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    ),
    Column(
        "phase_id",
        UUID(as_uuid=True),
        ForeignKey("project_phases.id", ondelete="CASCADE"),
        nullable=True,
    ),
    Column(
        "role_id",
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="RESTRICT"),
        nullable=False,
    ),
    Column("allocation_percentage", Integer, nullable=False),
    Column("count", Integer, nullable=False, server_default="1"),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    CheckConstraint(
        "allocation_percentage >= 1 AND allocation_percentage <= 100",
        name="ck_role_req_percentage",
    ),
    CheckConstraint("count >= 1", name="ck_role_req_count"),
    Index("idx_role_requirements_project_id", "project_id"),
    Index("idx_role_requirements_phase_id", "phase_id"),
    Index("idx_role_requirements_role_id", "role_id"),
)

invitation_codes = Table(
    "invitation_codes",
    metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("code", String(64), nullable=False, unique=True),
    Column("role", String(50), nullable=False, server_default="viewer"),
    Column(
        "created_by",
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    ),
    Column(
        "used_by",
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    ),
    Column("used_at", DateTime(timezone=True), nullable=True),
    Column("expires_at", DateTime(timezone=True), nullable=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    Index("idx_invitation_codes_code", "code"),
)

global_settings = Table(
    "global_settings",
    metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("hours_per_full_time", Integer, nullable=False, server_default="176"),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    CheckConstraint("hours_per_full_time > 0", name="ck_settings_hours_positive"),
)
