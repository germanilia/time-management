from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from app.enums.allocation_type import AssignmentAllocationType
from app.schemas.base import JsonModel


class AssignmentCreate(JsonModel):
    project_id: UUID
    phase_id: UUID
    employee_id: UUID
    allocation_type: AssignmentAllocationType
    allocated_hours: int | None = None
    allocation_percentage: int | None = None
    hourly_rate_override: Decimal | None = None
    start_date: date
    end_date: date


class AssignmentUpdate(JsonModel):
    allocation_type: AssignmentAllocationType | None = None
    allocated_hours: int | None = None
    allocation_percentage: int | None = None
    hourly_rate_override: Decimal | None = None
    start_date: date | None = None
    end_date: date | None = None


class AssignmentResponse(JsonModel):
    id: UUID
    project_id: UUID
    phase_id: UUID
    employee_id: UUID
    allocation_type: AssignmentAllocationType
    allocated_hours: int | None
    allocation_percentage: int | None
    hourly_rate_override: Decimal | None
    start_date: date
    end_date: date
    created_at: datetime
    updated_at: datetime
