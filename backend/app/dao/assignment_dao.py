import uuid
from datetime import date, datetime, timezone

from sqlalchemy import and_, delete, insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tables import project_assignments, projects
from app.schemas.assignment import AssignmentCreate, AssignmentResponse, AssignmentUpdate


class AssignmentDao:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    @staticmethod
    def _row_to_model(row: dict) -> AssignmentResponse:
        return AssignmentResponse(
            id=row["id"],
            project_id=row["project_id"],
            phase_id=row["phase_id"],
            employee_id=row["employee_id"],
            allocation_type=row["allocation_type"],
            allocated_hours=row["allocated_hours"],
            allocation_percentage=row["allocation_percentage"],
            hourly_rate_override=row["hourly_rate_override"],
            start_date=row["start_date"],
            end_date=row["end_date"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    async def list_all(
        self,
        project_id: uuid.UUID | None = None,
        employee_id: uuid.UUID | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        phase_id: uuid.UUID | None = None,
        allocation_type: str | None = None,
        project_status: str | None = None,
    ) -> list[AssignmentResponse]:
        pa = project_assignments
        query = select(pa).order_by(pa.c.start_date)
        if project_id:
            query = query.where(pa.c.project_id == project_id)
        if employee_id:
            query = query.where(pa.c.employee_id == employee_id)
        if start_date:
            query = query.where(pa.c.end_date >= start_date)
        if end_date:
            query = query.where(pa.c.start_date <= end_date)
        if phase_id:
            query = query.where(pa.c.phase_id == phase_id)
        if allocation_type:
            query = query.where(pa.c.allocation_type == allocation_type)
        if project_status:
            project_ids_subquery = select(projects.c.id).where(
                projects.c.status == project_status
            )
            query = query.where(pa.c.project_id.in_(project_ids_subquery))
        result = await self.db.execute(query)
        return [self._row_to_model(dict(row)) for row in result.mappings()]

    async def get_by_id(
        self, assignment_id: uuid.UUID
    ) -> AssignmentResponse | None:
        result = await self.db.execute(
            select(project_assignments).where(
                project_assignments.c.id == assignment_id
            )
        )
        row = result.mappings().first()
        return self._row_to_model(dict(row)) if row else None

    async def get_overlapping(
        self,
        employee_id: uuid.UUID,
        start_date: date,
        end_date: date,
        exclude_id: uuid.UUID | None = None,
    ) -> list[AssignmentResponse]:
        """Find all assignments for an employee that overlap a date range."""
        pa = project_assignments
        conditions = [
            pa.c.employee_id == employee_id,
            pa.c.start_date <= end_date,
            pa.c.end_date >= start_date,
        ]
        if exclude_id:
            conditions.append(pa.c.id != exclude_id)
        result = await self.db.execute(
            select(pa).where(and_(*conditions))
        )
        return [self._row_to_model(dict(row)) for row in result.mappings()]

    async def get_all_overlapping(
        self,
        start_date: date,
        end_date: date,
    ) -> list[AssignmentResponse]:
        """Fetch ALL assignments overlapping a date range (across all employees)."""
        pa = project_assignments
        result = await self.db.execute(
            select(pa).where(
                and_(pa.c.start_date <= end_date, pa.c.end_date >= start_date)
            )
        )
        return [self._row_to_model(dict(row)) for row in result.mappings()]

    async def list_by_phase(
        self, phase_id: uuid.UUID
    ) -> list[AssignmentResponse]:
        pa = project_assignments
        result = await self.db.execute(
            select(pa).where(pa.c.phase_id == phase_id).order_by(pa.c.start_date)
        )
        return [self._row_to_model(dict(row)) for row in result.mappings()]

    async def create(self, data: AssignmentCreate) -> AssignmentResponse:
        now = datetime.now(timezone.utc)
        assignment_id = uuid.uuid4()
        await self.db.execute(
            insert(project_assignments).values(
                id=assignment_id,
                project_id=data.project_id,
                phase_id=data.phase_id,
                employee_id=data.employee_id,
                allocation_type=data.allocation_type,
                allocated_hours=data.allocated_hours,
                allocation_percentage=data.allocation_percentage,
                hourly_rate_override=data.hourly_rate_override,
                start_date=data.start_date,
                end_date=data.end_date,
                created_at=now,
                updated_at=now,
            )
        )
        await self.db.flush()
        return AssignmentResponse(
            id=assignment_id,
            project_id=data.project_id,
            phase_id=data.phase_id,
            employee_id=data.employee_id,
            allocation_type=data.allocation_type,
            allocated_hours=data.allocated_hours,
            allocation_percentage=data.allocation_percentage,
            hourly_rate_override=data.hourly_rate_override,
            start_date=data.start_date,
            end_date=data.end_date,
            created_at=now,
            updated_at=now,
        )

    async def update(
        self, assignment_id: uuid.UUID, data: AssignmentUpdate
    ) -> AssignmentResponse | None:
        values = data.model_dump(exclude_unset=True)
        if not values:
            return await self.get_by_id(assignment_id)
        values["updated_at"] = datetime.now(timezone.utc)
        await self.db.execute(
            update(project_assignments)
            .where(project_assignments.c.id == assignment_id)
            .values(**values)
        )
        await self.db.flush()
        return await self.get_by_id(assignment_id)

    async def delete(self, assignment_id: uuid.UUID) -> bool:
        result = await self.db.execute(
            delete(project_assignments).where(
                project_assignments.c.id == assignment_id
            )
        )
        await self.db.flush()
        return result.rowcount > 0
