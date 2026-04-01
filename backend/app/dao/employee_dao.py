import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums.employee_status import EmployeeStatus
from app.models.tables import employees, roles
from app.schemas.employee import EmployeeCreate, EmployeeResponse, EmployeeUpdate


class EmployeeDao:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    @staticmethod
    def _row_to_model(row: dict) -> EmployeeResponse:
        return EmployeeResponse(
            id=row["id"],
            name=row["name"],
            email=row["email"],
            role_id=row["role_id"],
            role_name=row["role_name"],
            hourly_rate=row["hourly_rate"],
            effective_hourly_rate=(
                row["hourly_rate"]
                if row["hourly_rate"] is not None
                else row["role_default_rate"]
            ),
            job_percentage=row["job_percentage"],
            target_utilization_percentage=row["target_utilization_percentage"],
            status=row["status"],
            department=row["department"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    @staticmethod
    def _base_query():
        return select(
            employees,
            roles.c.name.label("role_name"),
            roles.c.default_hourly_rate.label("role_default_rate"),
        ).join(roles, employees.c.role_id == roles.c.id)

    async def list_all(
        self,
        status: EmployeeStatus | None = None,
        search: str | None = None,
        role_id: uuid.UUID | None = None,
    ) -> list[EmployeeResponse]:
        query = self._base_query()
        if status:
            query = query.where(employees.c.status == status)
        if search:
            query = query.where(employees.c.name.ilike(f"%{search}%"))
        if role_id is not None:
            query = query.where(employees.c.role_id == role_id)
        query = query.order_by(employees.c.name)
        result = await self.db.execute(query)
        return [self._row_to_model(dict(row)) for row in result.mappings()]

    async def get_by_id(self, employee_id: uuid.UUID) -> EmployeeResponse | None:
        result = await self.db.execute(
            self._base_query().where(employees.c.id == employee_id)
        )
        row = result.mappings().first()
        return self._row_to_model(dict(row)) if row else None

    async def get_by_email(self, email: str) -> EmployeeResponse | None:
        result = await self.db.execute(
            self._base_query().where(employees.c.email == email)
        )
        row = result.mappings().first()
        return self._row_to_model(dict(row)) if row else None

    async def create(self, data: EmployeeCreate) -> EmployeeResponse:
        now = datetime.now(timezone.utc)
        employee_id = uuid.uuid4()
        await self.db.execute(
            insert(employees).values(
                id=employee_id,
                name=data.name,
                email=data.email,
                role_id=data.role_id,
                hourly_rate=data.hourly_rate,
                job_percentage=data.job_percentage,
                target_utilization_percentage=data.target_utilization_percentage,
                department=data.department,
                created_at=now,
                updated_at=now,
            )
        )
        await self.db.flush()
        result = await self.get_by_id(employee_id)
        # Should always exist since we just inserted it
        assert result is not None
        return result

    async def update(
        self, employee_id: uuid.UUID, data: EmployeeUpdate
    ) -> EmployeeResponse | None:
        values = data.model_dump(exclude_unset=True)
        if not values:
            return await self.get_by_id(employee_id)
        values["updated_at"] = datetime.now(timezone.utc)
        await self.db.execute(
            update(employees).where(employees.c.id == employee_id).values(**values)
        )
        await self.db.flush()
        return await self.get_by_id(employee_id)

    async def delete(self, employee_id: uuid.UUID) -> bool:
        result = await self.db.execute(
            delete(employees).where(employees.c.id == employee_id)
        )
        await self.db.flush()
        return result.rowcount > 0
