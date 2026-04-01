from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import require_role
from app.dao.project_status_dao import ProjectStatusDao
from app.dependencies import get_db
from app.enums.user_role import UserRole
from app.routers.auth_router import get_current_user
from app.schemas.auth import UserResponse
from app.schemas.base import MessageResponse, SuccessResponse
from app.schemas.project_status import (
    ProjectStatusCreate,
    ProjectStatusResponse,
    ProjectStatusUpdate,
)
from app.services.project_status_service import ProjectStatusService

router = APIRouter(prefix="/project-statuses", tags=["project-statuses"])


def get_project_status_dao(
    db: AsyncSession = Depends(get_db),
) -> ProjectStatusDao:
    return ProjectStatusDao(db)


def get_project_status_service(
    dao: ProjectStatusDao = Depends(get_project_status_dao),
    db: AsyncSession = Depends(get_db),
) -> ProjectStatusService:
    return ProjectStatusService(dao, db)


@router.get(
    "", response_model=SuccessResponse[list[ProjectStatusResponse]]
)
async def list_project_statuses(
    service: ProjectStatusService = Depends(get_project_status_service),
    _current_user: UserResponse = Depends(get_current_user),
) -> SuccessResponse[list[ProjectStatusResponse]]:
    statuses = await service.list_all()
    return SuccessResponse(data=statuses)


@router.get(
    "/{status_id}",
    response_model=SuccessResponse[ProjectStatusResponse],
)
async def get_project_status(
    status_id: UUID,
    service: ProjectStatusService = Depends(get_project_status_service),
    _current_user: UserResponse = Depends(get_current_user),
) -> SuccessResponse[ProjectStatusResponse]:
    status = await service.get_by_id(status_id)
    return SuccessResponse(data=status)


@router.post(
    "", response_model=SuccessResponse[ProjectStatusResponse]
)
async def create_project_status(
    data: ProjectStatusCreate,
    service: ProjectStatusService = Depends(get_project_status_service),
    _current_user: UserResponse = Depends(
        require_role(UserRole.ADMIN, UserRole.MANAGER)
    ),
) -> SuccessResponse[ProjectStatusResponse]:
    status = await service.create(data)
    return SuccessResponse(data=status)


@router.put(
    "/{status_id}",
    response_model=SuccessResponse[ProjectStatusResponse],
)
async def update_project_status(
    status_id: UUID,
    data: ProjectStatusUpdate,
    service: ProjectStatusService = Depends(get_project_status_service),
    _current_user: UserResponse = Depends(
        require_role(UserRole.ADMIN, UserRole.MANAGER)
    ),
) -> SuccessResponse[ProjectStatusResponse]:
    status = await service.update(status_id, data)
    return SuccessResponse(data=status)


@router.delete("/{status_id}", response_model=MessageResponse)
async def delete_project_status(
    status_id: UUID,
    service: ProjectStatusService = Depends(get_project_status_service),
    _current_user: UserResponse = Depends(require_role(UserRole.ADMIN)),
) -> MessageResponse:
    await service.delete(status_id)
    return MessageResponse(message="Project status deleted successfully")
