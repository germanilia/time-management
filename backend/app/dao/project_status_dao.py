import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tables import project_statuses
from app.schemas.project_status import (
    ProjectStatusCreate,
    ProjectStatusResponse,
    ProjectStatusUpdate,
)


class ProjectStatusDao:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    @staticmethod
    def _row_to_model(row: dict) -> ProjectStatusResponse:
        return ProjectStatusResponse(
            id=row["id"],
            name=row["name"],
            display_order=row["display_order"],
            color=row["color"],
            is_default=row["is_default"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    async def list_all(self) -> list[ProjectStatusResponse]:
        query = select(project_statuses).order_by(
            project_statuses.c.display_order,
            project_statuses.c.name,
        )
        result = await self.db.execute(query)
        return [self._row_to_model(dict(row)) for row in result.mappings()]

    async def get_by_id(
        self, status_id: uuid.UUID
    ) -> ProjectStatusResponse | None:
        result = await self.db.execute(
            select(project_statuses).where(
                project_statuses.c.id == status_id
            )
        )
        row = result.mappings().first()
        return self._row_to_model(dict(row)) if row else None

    async def get_by_name(
        self, name: str
    ) -> ProjectStatusResponse | None:
        result = await self.db.execute(
            select(project_statuses).where(
                project_statuses.c.name == name
            )
        )
        row = result.mappings().first()
        return self._row_to_model(dict(row)) if row else None

    async def create(
        self, data: ProjectStatusCreate
    ) -> ProjectStatusResponse:
        now = datetime.now(timezone.utc)
        status_id = uuid.uuid4()
        await self.db.execute(
            insert(project_statuses).values(
                id=status_id,
                name=data.name,
                display_order=data.display_order,
                color=data.color,
                is_default=data.is_default,
                created_at=now,
                updated_at=now,
            )
        )
        await self.db.flush()
        return ProjectStatusResponse(
            id=status_id,
            name=data.name,
            display_order=data.display_order,
            color=data.color,
            is_default=data.is_default,
            created_at=now,
            updated_at=now,
        )

    async def update(
        self, status_id: uuid.UUID, data: ProjectStatusUpdate
    ) -> ProjectStatusResponse | None:
        values = data.model_dump(exclude_unset=True)
        if not values:
            return await self.get_by_id(status_id)
        values["updated_at"] = datetime.now(timezone.utc)
        await self.db.execute(
            update(project_statuses)
            .where(project_statuses.c.id == status_id)
            .values(**values)
        )
        await self.db.flush()
        return await self.get_by_id(status_id)

    async def delete(self, status_id: uuid.UUID) -> bool:
        result = await self.db.execute(
            delete(project_statuses).where(
                project_statuses.c.id == status_id
            )
        )
        await self.db.flush()
        return result.rowcount > 0
