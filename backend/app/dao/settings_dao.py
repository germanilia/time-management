import uuid
from datetime import datetime, timezone

from sqlalchemy import insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tables import global_settings
from app.schemas.settings import SettingsResponse, SettingsUpdate


class SettingsDao:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    @staticmethod
    def _row_to_model(row: dict) -> SettingsResponse:
        return SettingsResponse(
            id=row["id"],
            hours_per_full_time=row["hours_per_full_time"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    async def get(self) -> SettingsResponse:
        """Get global settings, creating default row if none exists."""
        result = await self.db.execute(select(global_settings))
        row = result.mappings().first()
        if row:
            return self._row_to_model(dict(row))
        return await self._create_default()

    async def _create_default(self) -> SettingsResponse:
        now = datetime.now(timezone.utc)
        settings_id = uuid.uuid4()
        await self.db.execute(
            insert(global_settings).values(
                id=settings_id,
                hours_per_full_time=176,
                created_at=now,
                updated_at=now,
            )
        )
        await self.db.flush()
        return SettingsResponse(
            id=settings_id,
            hours_per_full_time=176,
            created_at=now,
            updated_at=now,
        )

    async def update(self, data: SettingsUpdate) -> SettingsResponse:
        current = await self.get()
        now = datetime.now(timezone.utc)
        await self.db.execute(
            update(global_settings)
            .where(global_settings.c.id == current.id)
            .values(
                hours_per_full_time=data.hours_per_full_time,
                updated_at=now,
            )
        )
        await self.db.flush()
        return SettingsResponse(
            id=current.id,
            hours_per_full_time=data.hours_per_full_time,
            created_at=current.created_at,
            updated_at=now,
        )
