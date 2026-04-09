import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums.billing_type import BillingType
from app.enums.project_status import ProjectStatus
from app.models.tables import funding_sources, projects
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate


class ProjectDao:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    @staticmethod
    def _row_to_model(row: dict) -> ProjectResponse:
        return ProjectResponse(
            id=row["id"],
            name=row["name"],
            customer=row.get("customer", ""),
            description=row["description"],
            salesforce_link=row.get("salesforce_link"),
            start_date=row["start_date"],
            end_date=row["end_date"],
            status=row["status"],
            billing_type=row.get("billing_type", BillingType.TIME_AND_MATERIALS),
            fixed_price_amount=row.get("fixed_price_amount"),
            funding_source_id=row.get("funding_source_id"),
            funding_source_name=row.get("funding_source_name"),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    def _base_query(self) -> select:
        return (
            select(
                projects,
                funding_sources.c.name.label("funding_source_name"),
            )
            .outerjoin(
                funding_sources,
                projects.c.funding_source_id == funding_sources.c.id,
            )
        )

    async def list_all(
        self,
        status: ProjectStatus | None = None,
        funding_source_id: uuid.UUID | None = None,
    ) -> list[ProjectResponse]:
        query = self._base_query().order_by(projects.c.start_date)
        if status:
            query = query.where(projects.c.status == status)
        if funding_source_id:
            query = query.where(
                projects.c.funding_source_id == funding_source_id
            )
        result = await self.db.execute(query)
        return [self._row_to_model(dict(row)) for row in result.mappings()]

    async def get_by_id(self, project_id: uuid.UUID) -> ProjectResponse | None:
        query = self._base_query().where(projects.c.id == project_id)
        result = await self.db.execute(query)
        row = result.mappings().first()
        return self._row_to_model(dict(row)) if row else None

    async def create(self, data: ProjectCreate) -> ProjectResponse:
        now = datetime.now(timezone.utc)
        project_id = uuid.uuid4()
        await self.db.execute(
            insert(projects).values(
                id=project_id,
                name=data.name,
                customer=data.customer,
                description=data.description,
                salesforce_link=data.salesforce_link,
                start_date=data.start_date,
                end_date=data.end_date,
                billing_type=data.billing_type,
                fixed_price_amount=data.fixed_price_amount,
                funding_source_id=data.funding_source_id,
                created_at=now,
                updated_at=now,
            )
        )
        await self.db.flush()
        return await self.get_by_id(project_id)  # type: ignore[return-value]

    async def update(
        self, project_id: uuid.UUID, data: ProjectUpdate
    ) -> ProjectResponse | None:
        values = data.model_dump(exclude_unset=True, exclude={"phases"})
        if not values:
            return await self.get_by_id(project_id)
        values["updated_at"] = datetime.now(timezone.utc)
        await self.db.execute(
            update(projects).where(projects.c.id == project_id).values(**values)
        )
        await self.db.flush()
        return await self.get_by_id(project_id)

    async def delete(self, project_id: uuid.UUID) -> bool:
        result = await self.db.execute(
            delete(projects).where(projects.c.id == project_id)
        )
        await self.db.flush()
        return result.rowcount > 0
