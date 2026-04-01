from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import require_role
from app.dao.assignment_dao import AssignmentDao
from app.dependencies import get_db
from app.enums.user_role import UserRole
from app.routers.auth_router import get_current_user
from app.schemas.assignment import AssignmentCreate, AssignmentResponse, AssignmentUpdate
from app.schemas.auth import UserResponse
from app.schemas.base import MessageResponse, SuccessResponse
from app.services.assignment_service import AssignmentService

router = APIRouter(prefix="/assignments", tags=["assignments"])


def get_assignment_dao(db: AsyncSession = Depends(get_db)) -> AssignmentDao:
    return AssignmentDao(db)


def get_assignment_service(
    dao: AssignmentDao = Depends(get_assignment_dao),
) -> AssignmentService:
    return AssignmentService(dao)


@router.get("", response_model=SuccessResponse[list[AssignmentResponse]])
async def list_assignments(
    project_id: UUID | None = Query(None, alias="projectId"),
    employee_id: UUID | None = Query(None, alias="employeeId"),
    start_date: date | None = Query(None, alias="startDate"),
    end_date: date | None = Query(None, alias="endDate"),
    phase_id: UUID | None = Query(None, alias="phaseId"),
    allocation_type: str | None = Query(None, alias="allocationType"),
    project_status: str | None = Query(None, alias="projectStatus"),
    service: AssignmentService = Depends(get_assignment_service),
    _current_user: UserResponse = Depends(get_current_user),
) -> SuccessResponse[list[AssignmentResponse]]:
    result = await service.list_all(
        project_id=project_id,
        employee_id=employee_id,
        start_date=start_date,
        end_date=end_date,
        phase_id=phase_id,
        allocation_type=allocation_type,
        project_status=project_status,
    )
    return SuccessResponse(data=result)


@router.get("/{assignment_id}", response_model=SuccessResponse[AssignmentResponse])
async def get_assignment(
    assignment_id: UUID,
    service: AssignmentService = Depends(get_assignment_service),
    _current_user: UserResponse = Depends(get_current_user),
) -> SuccessResponse[AssignmentResponse]:
    result = await service.get_by_id(assignment_id)
    return SuccessResponse(data=result)


@router.post("", response_model=SuccessResponse[AssignmentResponse])
async def create_assignment(
    data: AssignmentCreate,
    service: AssignmentService = Depends(get_assignment_service),
    _current_user: UserResponse = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER)),
) -> SuccessResponse[AssignmentResponse]:
    result = await service.create(data)
    return SuccessResponse(data=result)


@router.put("/{assignment_id}", response_model=SuccessResponse[AssignmentResponse])
async def update_assignment(
    assignment_id: UUID,
    data: AssignmentUpdate,
    service: AssignmentService = Depends(get_assignment_service),
    _current_user: UserResponse = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER)),
) -> SuccessResponse[AssignmentResponse]:
    result = await service.update(assignment_id, data)
    return SuccessResponse(data=result)


@router.delete("/{assignment_id}", response_model=MessageResponse)
async def delete_assignment(
    assignment_id: UUID,
    service: AssignmentService = Depends(get_assignment_service),
    _current_user: UserResponse = Depends(require_role(UserRole.ADMIN)),
) -> MessageResponse:
    await service.delete(assignment_id)
    return MessageResponse(message="Assignment deleted successfully")
