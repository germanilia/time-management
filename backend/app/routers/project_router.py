from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import require_role
from app.dao.assignment_dao import AssignmentDao
from app.dao.phase_dao import PhaseDao
from app.dao.project_dao import ProjectDao
from app.dao.role_requirement_dao import RoleRequirementDao
from app.dependencies import get_db
from app.enums.project_status import ProjectStatus
from app.enums.user_role import UserRole
from app.routers.auth_router import get_current_user
from app.schemas.auth import UserResponse
from app.schemas.base import MessageResponse, SuccessResponse
from app.schemas.project import (
    PhaseCreate,
    PhaseResponse,
    ProjectCreate,
    ProjectUpdate,
    ProjectWithPhasesResponse,
)
from app.schemas.role_requirement import RoleRequirementCreate, RoleRequirementResponse
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["projects"])


def get_project_dao(db: AsyncSession = Depends(get_db)) -> ProjectDao:
    return ProjectDao(db)


def get_phase_dao(db: AsyncSession = Depends(get_db)) -> PhaseDao:
    return PhaseDao(db)


def get_role_requirement_dao(db: AsyncSession = Depends(get_db)) -> RoleRequirementDao:
    return RoleRequirementDao(db)


def get_assignment_dao(db: AsyncSession = Depends(get_db)) -> AssignmentDao:
    return AssignmentDao(db)


def get_project_service(
    project_dao: ProjectDao = Depends(get_project_dao),
    phase_dao: PhaseDao = Depends(get_phase_dao),
    role_req_dao: RoleRequirementDao = Depends(get_role_requirement_dao),
    assignment_dao: AssignmentDao = Depends(get_assignment_dao),
) -> ProjectService:
    return ProjectService(project_dao, phase_dao, role_req_dao, assignment_dao)


@router.get("", response_model=SuccessResponse[list[ProjectWithPhasesResponse]])
async def list_projects(
    status: ProjectStatus | None = Query(None),
    funding_source_id: UUID | None = Query(None, alias="fundingSourceId"),
    service: ProjectService = Depends(get_project_service),
    _current_user: UserResponse = Depends(get_current_user),
) -> SuccessResponse[list[ProjectWithPhasesResponse]]:
    result = await service.list_all(
        status=status, funding_source_id=funding_source_id
    )
    return SuccessResponse(data=result)


@router.get(
    "/{project_id}", response_model=SuccessResponse[ProjectWithPhasesResponse]
)
async def get_project(
    project_id: UUID,
    service: ProjectService = Depends(get_project_service),
    _current_user: UserResponse = Depends(get_current_user),
) -> SuccessResponse[ProjectWithPhasesResponse]:
    result = await service.get_by_id(project_id)
    return SuccessResponse(data=result)


@router.post("", response_model=SuccessResponse[ProjectWithPhasesResponse])
async def create_project(
    data: ProjectCreate,
    service: ProjectService = Depends(get_project_service),
    _current_user: UserResponse = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER)),
) -> SuccessResponse[ProjectWithPhasesResponse]:
    result = await service.create(data)
    return SuccessResponse(data=result)


@router.put(
    "/{project_id}", response_model=SuccessResponse[ProjectWithPhasesResponse]
)
async def update_project(
    project_id: UUID,
    data: ProjectUpdate,
    service: ProjectService = Depends(get_project_service),
    _current_user: UserResponse = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER)),
) -> SuccessResponse[ProjectWithPhasesResponse]:
    result = await service.update(project_id, data)
    return SuccessResponse(data=result)


@router.delete("/{project_id}", response_model=MessageResponse)
async def delete_project(
    project_id: UUID,
    service: ProjectService = Depends(get_project_service),
    _current_user: UserResponse = Depends(require_role(UserRole.ADMIN)),
) -> MessageResponse:
    await service.delete(project_id)
    return MessageResponse(message="Project deleted successfully")


# --- Phase sub-routes ---


@router.get(
    "/{project_id}/phases", response_model=SuccessResponse[list[PhaseResponse]]
)
async def list_phases(
    project_id: UUID,
    service: ProjectService = Depends(get_project_service),
    _current_user: UserResponse = Depends(get_current_user),
) -> SuccessResponse[list[PhaseResponse]]:
    result = await service.list_phases(project_id)
    return SuccessResponse(data=result)


@router.post(
    "/{project_id}/phases", response_model=SuccessResponse[PhaseResponse]
)
async def add_phase(
    project_id: UUID,
    data: PhaseCreate,
    service: ProjectService = Depends(get_project_service),
    _current_user: UserResponse = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER)),
) -> SuccessResponse[PhaseResponse]:
    result = await service.add_phase(project_id, data)
    return SuccessResponse(data=result)


@router.delete(
    "/{project_id}/phases/{phase_id}", response_model=MessageResponse
)
async def delete_phase(
    project_id: UUID,
    phase_id: UUID,
    service: ProjectService = Depends(get_project_service),
    _current_user: UserResponse = Depends(require_role(UserRole.ADMIN)),
) -> MessageResponse:
    await service.delete_phase(project_id, phase_id)
    return MessageResponse(message="Phase deleted successfully")


# --- Role requirement sub-routes ---


@router.post(
    "/{project_id}/phases/{phase_id}/role-requirements",
    response_model=SuccessResponse[RoleRequirementResponse],
)
async def add_phase_role_requirement(
    project_id: UUID,
    phase_id: UUID,
    data: RoleRequirementCreate,
    dao: RoleRequirementDao = Depends(get_role_requirement_dao),
    _current_user: UserResponse = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER)),
) -> SuccessResponse[RoleRequirementResponse]:
    result = await dao.create(project_id, data, phase_id=phase_id)
    return SuccessResponse(data=result)


@router.get(
    "/{project_id}/phases/{phase_id}/role-requirements",
    response_model=SuccessResponse[list[RoleRequirementResponse]],
)
async def list_phase_role_requirements(
    project_id: UUID,
    phase_id: UUID,
    dao: RoleRequirementDao = Depends(get_role_requirement_dao),
    _current_user: UserResponse = Depends(get_current_user),
) -> SuccessResponse[list[RoleRequirementResponse]]:
    result = await dao.list_by_phase(project_id, phase_id)
    return SuccessResponse(data=result)


@router.post(
    "/{project_id}/role-requirements",
    response_model=SuccessResponse[RoleRequirementResponse],
)
async def add_global_role_requirement(
    project_id: UUID,
    data: RoleRequirementCreate,
    dao: RoleRequirementDao = Depends(get_role_requirement_dao),
    _current_user: UserResponse = Depends(require_role(UserRole.ADMIN, UserRole.MANAGER)),
) -> SuccessResponse[RoleRequirementResponse]:
    result = await dao.create(project_id, data, phase_id=None)
    return SuccessResponse(data=result)


@router.get(
    "/{project_id}/role-requirements",
    response_model=SuccessResponse[list[RoleRequirementResponse]],
)
async def list_global_role_requirements(
    project_id: UUID,
    dao: RoleRequirementDao = Depends(get_role_requirement_dao),
    _current_user: UserResponse = Depends(get_current_user),
) -> SuccessResponse[list[RoleRequirementResponse]]:
    result = await dao.list_global(project_id)
    return SuccessResponse(data=result)


@router.delete(
    "/{project_id}/role-requirements/{requirement_id}",
    response_model=MessageResponse,
)
async def delete_role_requirement(
    project_id: UUID,
    requirement_id: UUID,
    dao: RoleRequirementDao = Depends(get_role_requirement_dao),
    _current_user: UserResponse = Depends(require_role(UserRole.ADMIN)),
) -> MessageResponse:
    await dao.delete(requirement_id)
    return MessageResponse(message="Role requirement deleted successfully")
