from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.schemas.base import JsonModel


class RoleRequirementCreate(JsonModel):
    role_id: UUID
    allocation_percentage: int = Field(ge=1, le=100)
    count: int = Field(ge=1, default=1)


class RoleRequirementResponse(JsonModel):
    id: UUID
    project_id: UUID
    phase_id: UUID | None
    role_id: UUID
    role_name: str
    allocation_percentage: int
    count: int
    created_at: datetime
    updated_at: datetime
