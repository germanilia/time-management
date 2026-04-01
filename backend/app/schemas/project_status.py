from datetime import datetime
from uuid import UUID

from app.schemas.base import JsonModel


class ProjectStatusCreate(JsonModel):
    name: str
    display_order: int = 0
    color: str | None = None
    is_default: bool = False


class ProjectStatusUpdate(JsonModel):
    name: str | None = None
    display_order: int | None = None
    color: str | None = None
    is_default: bool | None = None


class ProjectStatusResponse(JsonModel):
    id: UUID
    name: str
    display_order: int
    color: str | None
    is_default: bool
    created_at: datetime
    updated_at: datetime
