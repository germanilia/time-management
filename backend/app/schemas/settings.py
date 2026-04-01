from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.schemas.base import JsonModel


class SettingsUpdate(JsonModel):
    hours_per_full_time: int = Field(gt=0)


class SettingsResponse(JsonModel):
    id: UUID
    hours_per_full_time: int
    created_at: datetime
    updated_at: datetime
