import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException
from app.dao.role_dao import RoleDao
from app.models.tables import employees
from app.schemas.role import RoleCreate, RoleResponse, RoleUpdate


class RoleService:
    def __init__(self, role_dao: RoleDao, db: AsyncSession) -> None:
        self.role_dao = role_dao
        self.db = db

    async def list_all(self) -> list[RoleResponse]:
        return await self.role_dao.list_all()

    async def get_by_id(self, role_id: uuid.UUID) -> RoleResponse:
        role = await self.role_dao.get_by_id(role_id)
        if not role:
            raise NotFoundException("Role", str(role_id))
        return role

    async def create(self, data: RoleCreate) -> RoleResponse:
        existing = await self.role_dao.get_by_name(data.name)
        if existing:
            raise ConflictException(
                f"Role with name '{data.name}' already exists"
            )
        return await self.role_dao.create(data)

    async def update(
        self, role_id: uuid.UUID, data: RoleUpdate
    ) -> RoleResponse:
        existing = await self.role_dao.get_by_id(role_id)
        if not existing:
            raise NotFoundException("Role", str(role_id))
        if data.name and data.name != existing.name:
            duplicate = await self.role_dao.get_by_name(data.name)
            if duplicate:
                raise ConflictException(
                    f"Role with name '{data.name}' already exists"
                )
        result = await self.role_dao.update(role_id, data)
        if not result:
            raise NotFoundException("Role", str(role_id))
        return result

    async def delete(self, role_id: uuid.UUID) -> None:
        existing = await self.role_dao.get_by_id(role_id)
        if not existing:
            raise NotFoundException("Role", str(role_id))
        result = await self.db.execute(
            select(employees).where(employees.c.role_id == role_id).limit(1)
        )
        if result.first():
            raise ConflictException(
                f"Cannot delete role '{existing.name}': it is assigned to one or more employees"
            )
        await self.role_dao.delete(role_id)
