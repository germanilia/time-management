from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import require_role
from app.dao.role_dao import RoleDao
from app.dependencies import get_db
from app.enums.user_role import UserRole
from app.routers.auth_router import get_current_user
from app.schemas.auth import UserResponse
from app.schemas.base import MessageResponse, SuccessResponse
from app.schemas.role import RoleCreate, RoleResponse, RoleUpdate
from app.services.role_service import RoleService

router = APIRouter(prefix="/roles", tags=["roles"])


def get_role_dao(db: AsyncSession = Depends(get_db)) -> RoleDao:
    return RoleDao(db)


def get_role_service(
    dao: RoleDao = Depends(get_role_dao),
    db: AsyncSession = Depends(get_db),
) -> RoleService:
    return RoleService(dao, db)


@router.get("", response_model=SuccessResponse[list[RoleResponse]])
async def list_roles(
    service: RoleService = Depends(get_role_service),
    _current_user: UserResponse = Depends(get_current_user),
) -> SuccessResponse[list[RoleResponse]]:
    roles = await service.list_all()
    return SuccessResponse(data=roles)


@router.get("/{role_id}", response_model=SuccessResponse[RoleResponse])
async def get_role(
    role_id: UUID,
    service: RoleService = Depends(get_role_service),
    _current_user: UserResponse = Depends(get_current_user),
) -> SuccessResponse[RoleResponse]:
    role = await service.get_by_id(role_id)
    return SuccessResponse(data=role)


@router.post("", response_model=SuccessResponse[RoleResponse])
async def create_role(
    data: RoleCreate,
    service: RoleService = Depends(get_role_service),
    _current_user: UserResponse = Depends(require_role(UserRole.ADMIN)),
) -> SuccessResponse[RoleResponse]:
    role = await service.create(data)
    return SuccessResponse(data=role)


@router.put("/{role_id}", response_model=SuccessResponse[RoleResponse])
async def update_role(
    role_id: UUID,
    data: RoleUpdate,
    service: RoleService = Depends(get_role_service),
    _current_user: UserResponse = Depends(require_role(UserRole.ADMIN)),
) -> SuccessResponse[RoleResponse]:
    role = await service.update(role_id, data)
    return SuccessResponse(data=role)


@router.delete("/{role_id}", response_model=MessageResponse)
async def delete_role(
    role_id: UUID,
    service: RoleService = Depends(get_role_service),
    _current_user: UserResponse = Depends(require_role(UserRole.ADMIN)),
) -> MessageResponse:
    await service.delete(role_id)
    return MessageResponse(message="Role deleted successfully")
