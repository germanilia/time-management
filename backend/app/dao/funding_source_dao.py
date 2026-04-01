import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tables import funding_sources
from app.schemas.funding_source import (
    FundingSourceCreate,
    FundingSourceResponse,
    FundingSourceUpdate,
)


class FundingSourceDao:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    @staticmethod
    def _row_to_model(row: dict) -> FundingSourceResponse:
        return FundingSourceResponse(
            id=row["id"],
            name=row["name"],
            description=row["description"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    async def list_all(self) -> list[FundingSourceResponse]:
        query = select(funding_sources).order_by(funding_sources.c.name)
        result = await self.db.execute(query)
        return [self._row_to_model(dict(row)) for row in result.mappings()]

    async def get_by_id(
        self, source_id: uuid.UUID
    ) -> FundingSourceResponse | None:
        result = await self.db.execute(
            select(funding_sources).where(funding_sources.c.id == source_id)
        )
        row = result.mappings().first()
        return self._row_to_model(dict(row)) if row else None

    async def get_by_name(self, name: str) -> FundingSourceResponse | None:
        result = await self.db.execute(
            select(funding_sources).where(funding_sources.c.name == name)
        )
        row = result.mappings().first()
        return self._row_to_model(dict(row)) if row else None

    async def create(
        self, data: FundingSourceCreate
    ) -> FundingSourceResponse:
        now = datetime.now(timezone.utc)
        source_id = uuid.uuid4()
        await self.db.execute(
            insert(funding_sources).values(
                id=source_id,
                name=data.name,
                description=data.description,
                created_at=now,
                updated_at=now,
            )
        )
        await self.db.flush()
        return FundingSourceResponse(
            id=source_id,
            name=data.name,
            description=data.description,
            created_at=now,
            updated_at=now,
        )

    async def update(
        self, source_id: uuid.UUID, data: FundingSourceUpdate
    ) -> FundingSourceResponse | None:
        values = data.model_dump(exclude_unset=True)
        if not values:
            return await self.get_by_id(source_id)
        values["updated_at"] = datetime.now(timezone.utc)
        await self.db.execute(
            update(funding_sources)
            .where(funding_sources.c.id == source_id)
            .values(**values)
        )
        await self.db.flush()
        return await self.get_by_id(source_id)

    async def delete(self, source_id: uuid.UUID) -> bool:
        result = await self.db.execute(
            delete(funding_sources).where(funding_sources.c.id == source_id)
        )
        await self.db.flush()
        return result.rowcount > 0
