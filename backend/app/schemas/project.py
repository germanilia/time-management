from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import model_validator

from app.enums.allocation_type import AssignmentAllocationType, PhaseAllocationType
from app.enums.billing_type import BillingType
from app.enums.project_status import PhaseStatus, ProjectStatus
from app.schemas.base import JsonModel
from app.schemas.role_requirement import RoleRequirementCreate, RoleRequirementResponse


class PhaseAssignmentInput(JsonModel):
    """Inline assignment to create alongside a phase."""

    employee_id: UUID
    allocation_type: AssignmentAllocationType
    allocated_hours: int | None = None
    allocation_percentage: int | None = None
    hourly_rate_override: Decimal | None = None
    start_date: date | None = None
    end_date: date | None = None


class PhaseCreate(JsonModel):
    name: str
    start_date: date
    end_date: date | None = None
    allocation_type: PhaseAllocationType
    required_hours: int | None = None
    required_headcount: int | None = None
    budget: Decimal | None = None
    phase_order: int = 0
    status: PhaseStatus = PhaseStatus.PLANNING
    role_requirements: list[RoleRequirementCreate] = []
    new_assignments: list[PhaseAssignmentInput] = []


class PhaseUpdate(JsonModel):
    name: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    allocation_type: PhaseAllocationType | None = None
    required_hours: int | None = None
    required_headcount: int | None = None
    budget: Decimal | None = None
    phase_order: int | None = None
    status: PhaseStatus | None = None


class PhaseResponse(JsonModel):
    id: UUID
    project_id: UUID
    name: str
    start_date: date
    end_date: date | None
    allocation_type: PhaseAllocationType
    required_hours: int | None
    required_headcount: int | None
    budget: Decimal | None
    phase_order: int
    status: PhaseStatus
    role_requirements: list[RoleRequirementResponse] = []
    created_at: datetime
    updated_at: datetime


class ProjectCreate(JsonModel):
    name: str
    customer: str
    description: str | None = None
    salesforce_link: str | None = None
    start_date: date
    end_date: date | None = None
    billing_type: BillingType = BillingType.TIME_AND_MATERIALS
    fixed_price_amount: Decimal | None = None
    funding_source_id: UUID | None = None
    phases: list[PhaseCreate] = []

    @model_validator(mode="after")
    def validate_fixed_price(self) -> "ProjectCreate":
        if self.billing_type == BillingType.FIXED_PRICE:
            if self.fixed_price_amount is None or self.fixed_price_amount <= 0:
                msg = "fixed_price_amount is required and must be > 0 for fixed-price projects"
                raise ValueError(msg)
        return self


class ProjectUpdate(JsonModel):
    name: str | None = None
    customer: str | None = None
    description: str | None = None
    salesforce_link: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: ProjectStatus | None = None
    billing_type: BillingType | None = None
    fixed_price_amount: Decimal | None = None
    funding_source_id: UUID | None = None
    phases: list[PhaseCreate] | None = None


class ProjectResponse(JsonModel):
    id: UUID
    name: str
    customer: str
    description: str | None
    salesforce_link: str | None
    start_date: date
    end_date: date | None
    status: ProjectStatus
    billing_type: BillingType
    fixed_price_amount: Decimal | None
    funding_source_id: UUID | None
    funding_source_name: str | None
    created_at: datetime
    updated_at: datetime


class ProjectWithPhasesResponse(ProjectResponse):
    phases: list[PhaseResponse] = []
