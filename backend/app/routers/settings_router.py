from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import require_role
from app.dao.settings_dao import SettingsDao
from app.dependencies import get_db
from app.enums.user_role import UserRole
from app.routers.auth_router import get_current_user
from app.schemas.auth import UserResponse
from app.schemas.base import SuccessResponse
from app.schemas.settings import SettingsResponse, SettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"])


def get_settings_dao(db: AsyncSession = Depends(get_db)) -> SettingsDao:
    return SettingsDao(db)


@router.get("", response_model=SuccessResponse[SettingsResponse])
async def get_settings(
    dao: SettingsDao = Depends(get_settings_dao),
    _current_user: UserResponse = Depends(get_current_user),
) -> SuccessResponse[SettingsResponse]:
    result = await dao.get()
    return SuccessResponse(data=result)


@router.put("", response_model=SuccessResponse[SettingsResponse])
async def update_settings(
    data: SettingsUpdate,
    dao: SettingsDao = Depends(get_settings_dao),
    _current_user: UserResponse = Depends(require_role(UserRole.ADMIN)),
) -> SuccessResponse[SettingsResponse]:
    result = await dao.update(data)
    return SuccessResponse(data=result)
