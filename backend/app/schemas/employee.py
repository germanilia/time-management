from datetime import datetime
from decimal import Decimal
from uuid import UUID

from app.enums.employee_status import EmployeeStatus
from app.schemas.base import JsonModel


class EmployeeCreate(JsonModel):
    name: str
    email: str
    role_id: UUID
    hourly_rate: Decimal | None = None
    job_percentage: int = 100
    target_utilization_percentage: int = 100
    department: str | None = None


class EmployeeUpdate(JsonModel):
    name: str | None = None
    email: str | None = None
    role_id: UUID | None = None
    hourly_rate: Decimal | None = None
    job_percentage: int | None = None
    target_utilization_percentage: int | None = None
    status: EmployeeStatus | None = None
    department: str | None = None


class EmployeeResponse(JsonModel):
    id: UUID
    name: str
    email: str
    role_id: UUID
    role_name: str
    hourly_rate: Decimal | None
    effective_hourly_rate: Decimal
    job_percentage: int
    target_utilization_percentage: int
    status: EmployeeStatus
    department: str | None
    created_at: datetime
    updated_at: datetime
