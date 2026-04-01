import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException
from app.dao.project_status_dao import ProjectStatusDao
from app.models.tables import projects
from app.schemas.project_status import (
    ProjectStatusCreate,
    ProjectStatusResponse,
    ProjectStatusUpdate,
)


class ProjectStatusService:
    def __init__(
        self, dao: ProjectStatusDao, db: AsyncSession
    ) -> None:
        self.dao = dao
        self.db = db

    async def list_all(self) -> list[ProjectStatusResponse]:
        return await self.dao.list_all()

    async def get_by_id(
        self, status_id: uuid.UUID
    ) -> ProjectStatusResponse:
        status = await self.dao.get_by_id(status_id)
        if not status:
            raise NotFoundException("Project status", str(status_id))
        return status

    async def create(
        self, data: ProjectStatusCreate
    ) -> ProjectStatusResponse:
        existing = await self.dao.get_by_name(data.name)
        if existing:
            raise ConflictException(
                f"Project status '{data.name}' already exists"
            )
        return await self.dao.create(data)

    async def update(
        self, status_id: uuid.UUID, data: ProjectStatusUpdate
    ) -> ProjectStatusResponse:
        existing = await self.dao.get_by_id(status_id)
        if not existing:
            raise NotFoundException("Project status", str(status_id))
        if data.name and data.name != existing.name:
            duplicate = await self.dao.get_by_name(data.name)
            if duplicate:
                raise ConflictException(
                    f"Project status '{data.name}' already exists"
                )
        result = await self.dao.update(status_id, data)
        if not result:
            raise NotFoundException("Project status", str(status_id))
        return result

    async def delete(self, status_id: uuid.UUID) -> None:
        existing = await self.dao.get_by_id(status_id)
        if not existing:
            raise NotFoundException("Project status", str(status_id))
        result = await self.db.execute(
            select(projects)
            .where(projects.c.status == existing.name)
            .limit(1)
        )
        if result.first():
            raise ConflictException(
                f"Cannot delete status '{existing.name}': "
                "it is used by one or more projects"
            )
        await self.dao.delete(status_id)
