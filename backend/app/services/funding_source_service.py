import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException
from app.dao.funding_source_dao import FundingSourceDao
from app.models.tables import projects
from app.schemas.funding_source import (
    FundingSourceCreate,
    FundingSourceResponse,
    FundingSourceUpdate,
)


class FundingSourceService:
    def __init__(
        self, funding_source_dao: FundingSourceDao, db: AsyncSession
    ) -> None:
        self.dao = funding_source_dao
        self.db = db

    async def list_all(self) -> list[FundingSourceResponse]:
        return await self.dao.list_all()

    async def get_by_id(
        self, source_id: uuid.UUID
    ) -> FundingSourceResponse:
        source = await self.dao.get_by_id(source_id)
        if not source:
            raise NotFoundException("Funding source", str(source_id))
        return source

    async def create(
        self, data: FundingSourceCreate
    ) -> FundingSourceResponse:
        existing = await self.dao.get_by_name(data.name)
        if existing:
            raise ConflictException(
                f"Funding source with name '{data.name}' already exists"
            )
        return await self.dao.create(data)

    async def update(
        self, source_id: uuid.UUID, data: FundingSourceUpdate
    ) -> FundingSourceResponse:
        existing = await self.dao.get_by_id(source_id)
        if not existing:
            raise NotFoundException("Funding source", str(source_id))
        if data.name and data.name != existing.name:
            duplicate = await self.dao.get_by_name(data.name)
            if duplicate:
                raise ConflictException(
                    f"Funding source with name '{data.name}' already exists"
                )
        result = await self.dao.update(source_id, data)
        if not result:
            raise NotFoundException("Funding source", str(source_id))
        return result

    async def delete(self, source_id: uuid.UUID) -> None:
        existing = await self.dao.get_by_id(source_id)
        if not existing:
            raise NotFoundException("Funding source", str(source_id))
        result = await self.db.execute(
            select(projects)
            .where(projects.c.funding_source_id == source_id)
            .limit(1)
        )
        if result.first():
            raise ConflictException(
                f"Cannot delete funding source '{existing.name}': "
                "it is referenced by one or more projects"
            )
        await self.dao.delete(source_id)
