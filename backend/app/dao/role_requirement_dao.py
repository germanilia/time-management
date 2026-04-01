import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tables import role_requirements, roles
from app.schemas.role_requirement import RoleRequirementCreate, RoleRequirementResponse


class RoleRequirementDao:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    @staticmethod
    def _row_to_model(row: dict) -> RoleRequirementResponse:
        return RoleRequirementResponse(
            id=row["id"],
            project_id=row["project_id"],
            phase_id=row["phase_id"],
            role_id=row["role_id"],
            role_name=row["role_name"],
            allocation_percentage=row["allocation_percentage"],
            count=row["count"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    @staticmethod
    def _base_query():
        return select(
            role_requirements,
            roles.c.name.label("role_name"),
        ).join(roles, role_requirements.c.role_id == roles.c.id)

    async def list_by_phase(
        self, project_id: uuid.UUID, phase_id: uuid.UUID
    ) -> list[RoleRequirementResponse]:
        result = await self.db.execute(
            self._base_query().where(
                role_requirements.c.project_id == project_id,
                role_requirements.c.phase_id == phase_id,
            )
        )
        return [self._row_to_model(dict(row)) for row in result.mappings()]

    async def list_global(
        self, project_id: uuid.UUID
    ) -> list[RoleRequirementResponse]:
        result = await self.db.execute(
            self._base_query().where(
                role_requirements.c.project_id == project_id,
                role_requirements.c.phase_id.is_(None),
            )
        )
        return [self._row_to_model(dict(row)) for row in result.mappings()]

    async def create(
        self,
        project_id: uuid.UUID,
        data: RoleRequirementCreate,
        phase_id: uuid.UUID | None = None,
    ) -> RoleRequirementResponse:
        now = datetime.now(timezone.utc)
        req_id = uuid.uuid4()
        await self.db.execute(
            insert(role_requirements).values(
                id=req_id,
                project_id=project_id,
                phase_id=phase_id,
                role_id=data.role_id,
                allocation_percentage=data.allocation_percentage,
                count=data.count,
                created_at=now,
                updated_at=now,
            )
        )
        await self.db.flush()
        # Fetch the joined result to get role_name
        result = await self.db.execute(
            self._base_query().where(role_requirements.c.id == req_id)
        )
        row = result.mappings().first()
        assert row is not None
        return self._row_to_model(dict(row))

    async def delete(self, requirement_id: uuid.UUID) -> bool:
        result = await self.db.execute(
            delete(role_requirements).where(role_requirements.c.id == requirement_id)
        )
        await self.db.flush()
        return result.rowcount > 0

    async def delete_by_project(self, project_id: uuid.UUID) -> int:
        result = await self.db.execute(
            delete(role_requirements).where(
                role_requirements.c.project_id == project_id
            )
        )
        await self.db.flush()
        return result.rowcount or 0
