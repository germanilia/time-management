from datetime import datetime
from uuid import UUID

from app.schemas.base import JsonModel


class FundingSourceCreate(JsonModel):
    name: str
    description: str | None = None


class FundingSourceUpdate(JsonModel):
    name: str | None = None
    description: str | None = None


class FundingSourceResponse(JsonModel):
    id: UUID
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime
