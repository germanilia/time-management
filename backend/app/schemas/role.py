from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import Field

from app.schemas.base import JsonModel


class RoleCreate(JsonModel):
    name: str
    default_hourly_rate: Decimal = Field(gt=0)


class RoleUpdate(JsonModel):
    name: str | None = None
    default_hourly_rate: Decimal | None = None


class RoleResponse(JsonModel):
    id: UUID
    name: str
    default_hourly_rate: Decimal
    created_at: datetime
    updated_at: datetime
