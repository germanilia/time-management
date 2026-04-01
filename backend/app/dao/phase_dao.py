import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tables import project_phases
from app.schemas.project import PhaseCreate, PhaseResponse, PhaseUpdate


class PhaseDao:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    @staticmethod
    def _row_to_model(row: dict) -> PhaseResponse:
        return PhaseResponse(
            id=row["id"],
            project_id=row["project_id"],
            name=row["name"],
            start_date=row["start_date"],
            end_date=row["end_date"],
            allocation_type=row["allocation_type"],
            required_hours=row["required_hours"],
            required_headcount=row["required_headcount"],
            budget=row["budget"],
            phase_order=row["phase_order"],
            status=row.get("status", "planning"),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    async def list_by_project(
        self, project_id: uuid.UUID
    ) -> list[PhaseResponse]:
        result = await self.db.execute(
            select(project_phases)
            .where(project_phases.c.project_id == project_id)
            .order_by(project_phases.c.phase_order)
        )
        return [self._row_to_model(dict(row)) for row in result.mappings()]

    async def get_by_id(self, phase_id: uuid.UUID) -> PhaseResponse | None:
        result = await self.db.execute(
            select(project_phases).where(project_phases.c.id == phase_id)
        )
        row = result.mappings().first()
        return self._row_to_model(dict(row)) if row else None

    async def create(
        self, project_id: uuid.UUID, data: PhaseCreate
    ) -> PhaseResponse:
        now = datetime.now(timezone.utc)
        phase_id = uuid.uuid4()
        await self.db.execute(
            insert(project_phases).values(
                id=phase_id,
                project_id=project_id,
                name=data.name,
                start_date=data.start_date,
                end_date=data.end_date,
                allocation_type=data.allocation_type,
                required_hours=data.required_hours,
                required_headcount=data.required_headcount,
                budget=data.budget,
                phase_order=data.phase_order,
                status=data.status,
                created_at=now,
                updated_at=now,
            )
        )
        await self.db.flush()
        return PhaseResponse(
            id=phase_id,
            project_id=project_id,
            name=data.name,
            start_date=data.start_date,
            end_date=data.end_date,
            allocation_type=data.allocation_type,
            required_hours=data.required_hours,
            required_headcount=data.required_headcount,
            budget=data.budget,
            phase_order=data.phase_order,
            status=data.status,
            created_at=now,
            updated_at=now,
        )

    async def update(
        self, phase_id: uuid.UUID, data: PhaseUpdate
    ) -> PhaseResponse | None:
        values = data.model_dump(exclude_unset=True)
        if not values:
            return await self.get_by_id(phase_id)
        values["updated_at"] = datetime.now(timezone.utc)
        await self.db.execute(
            update(project_phases)
            .where(project_phases.c.id == phase_id)
            .values(**values)
        )
        await self.db.flush()
        return await self.get_by_id(phase_id)

    async def delete(self, phase_id: uuid.UUID) -> bool:
        result = await self.db.execute(
            delete(project_phases).where(project_phases.c.id == phase_id)
        )
        await self.db.flush()
        return result.rowcount > 0

    async def delete_by_project(self, project_id: uuid.UUID) -> int:
        result = await self.db.execute(
            delete(project_phases).where(
                project_phases.c.project_id == project_id
            )
        )
        await self.db.flush()
        return result.rowcount or 0
