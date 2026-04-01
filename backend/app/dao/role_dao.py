import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tables import roles
from app.schemas.role import RoleCreate, RoleResponse, RoleUpdate


class RoleDao:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    @staticmethod
    def _row_to_model(row: dict) -> RoleResponse:
        return RoleResponse(
            id=row["id"],
            name=row["name"],
            default_hourly_rate=row["default_hourly_rate"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    async def list_all(self) -> list[RoleResponse]:
        query = select(roles).order_by(roles.c.name)
        result = await self.db.execute(query)
        return [self._row_to_model(dict(row)) for row in result.mappings()]

    async def get_by_id(self, role_id: uuid.UUID) -> RoleResponse | None:
        result = await self.db.execute(
            select(roles).where(roles.c.id == role_id)
        )
        row = result.mappings().first()
        return self._row_to_model(dict(row)) if row else None

    async def get_by_name(self, name: str) -> RoleResponse | None:
        result = await self.db.execute(
            select(roles).where(roles.c.name == name)
        )
        row = result.mappings().first()
        return self._row_to_model(dict(row)) if row else None

    async def create(self, data: RoleCreate) -> RoleResponse:
        now = datetime.now(timezone.utc)
        role_id = uuid.uuid4()
        await self.db.execute(
            insert(roles).values(
                id=role_id,
                name=data.name,
                default_hourly_rate=data.default_hourly_rate,
                created_at=now,
                updated_at=now,
            )
        )
        await self.db.flush()
        return RoleResponse(
            id=role_id,
            name=data.name,
            default_hourly_rate=data.default_hourly_rate,
            created_at=now,
            updated_at=now,
        )

    async def update(
        self, role_id: uuid.UUID, data: RoleUpdate
    ) -> RoleResponse | None:
        values = data.model_dump(exclude_unset=True)
        if not values:
            return await self.get_by_id(role_id)
        values["updated_at"] = datetime.now(timezone.utc)
        await self.db.execute(
            update(roles).where(roles.c.id == role_id).values(**values)
        )
        await self.db.flush()
        return await self.get_by_id(role_id)

    async def delete(self, role_id: uuid.UUID) -> bool:
        result = await self.db.execute(
            delete(roles).where(roles.c.id == role_id)
        )
        await self.db.flush()
        return result.rowcount > 0
