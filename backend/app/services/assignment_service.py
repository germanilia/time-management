import uuid
from datetime import date

from app.core.exceptions import NotFoundException
from app.dao.assignment_dao import AssignmentDao
from app.schemas.assignment import (
    AssignmentCreate,
    AssignmentResponse,
    AssignmentUpdate,
)


class AssignmentService:
    def __init__(self, assignment_dao: AssignmentDao) -> None:
        self.assignment_dao = assignment_dao

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
        return await self.assignment_dao.list_all(
            project_id=project_id,
            employee_id=employee_id,
            start_date=start_date,
            end_date=end_date,
            phase_id=phase_id,
            allocation_type=allocation_type,
            project_status=project_status,
        )

    async def get_by_id(
        self, assignment_id: uuid.UUID
    ) -> AssignmentResponse:
        assignment = await self.assignment_dao.get_by_id(assignment_id)
        if not assignment:
            raise NotFoundException("Assignment", str(assignment_id))
        return assignment

    async def create(self, data: AssignmentCreate) -> AssignmentResponse:
        return await self.assignment_dao.create(data)

    async def update(
        self, assignment_id: uuid.UUID, data: AssignmentUpdate
    ) -> AssignmentResponse:
        existing = await self.assignment_dao.get_by_id(assignment_id)
        if not existing:
            raise NotFoundException("Assignment", str(assignment_id))
        result = await self.assignment_dao.update(assignment_id, data)
        if not result:
            raise NotFoundException("Assignment", str(assignment_id))
        return result

    async def delete(self, assignment_id: uuid.UUID) -> None:
        existing = await self.assignment_dao.get_by_id(assignment_id)
        if not existing:
            raise NotFoundException("Assignment", str(assignment_id))
        await self.assignment_dao.delete(assignment_id)
