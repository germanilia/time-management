import uuid

from app.core.exceptions import ConflictException, NotFoundException
from app.dao.employee_dao import EmployeeDao
from app.enums.employee_status import EmployeeStatus
from app.schemas.employee import EmployeeCreate, EmployeeResponse, EmployeeUpdate


class EmployeeService:
    def __init__(self, employee_dao: EmployeeDao) -> None:
        self.employee_dao = employee_dao

    async def list_all(
        self,
        status: EmployeeStatus | None = None,
        search: str | None = None,
        role_id: uuid.UUID | None = None,
    ) -> list[EmployeeResponse]:
        return await self.employee_dao.list_all(status=status, search=search, role_id=role_id)

    async def get_by_id(self, employee_id: uuid.UUID) -> EmployeeResponse:
        employee = await self.employee_dao.get_by_id(employee_id)
        if not employee:
            raise NotFoundException("Employee", str(employee_id))
        return employee

    async def create(self, data: EmployeeCreate) -> EmployeeResponse:
        existing = await self.employee_dao.get_by_email(data.email)
        if existing:
            raise ConflictException(
                f"Employee with email '{data.email}' already exists"
            )
        return await self.employee_dao.create(data)

    async def update(
        self, employee_id: uuid.UUID, data: EmployeeUpdate
    ) -> EmployeeResponse:
        existing = await self.employee_dao.get_by_id(employee_id)
        if not existing:
            raise NotFoundException("Employee", str(employee_id))
        result = await self.employee_dao.update(employee_id, data)
        if not result:
            raise NotFoundException("Employee", str(employee_id))
        return result

    async def delete(self, employee_id: uuid.UUID) -> None:
        existing = await self.employee_dao.get_by_id(employee_id)
        if not existing:
            raise NotFoundException("Employee", str(employee_id))
        await self.employee_dao.delete(employee_id)
