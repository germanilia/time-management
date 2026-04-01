from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac import require_role
from app.dao.funding_source_dao import FundingSourceDao
from app.dependencies import get_db
from app.enums.user_role import UserRole
from app.routers.auth_router import get_current_user
from app.schemas.auth import UserResponse
from app.schemas.base import MessageResponse, SuccessResponse
from app.schemas.funding_source import (
    FundingSourceCreate,
    FundingSourceResponse,
    FundingSourceUpdate,
)
from app.services.funding_source_service import FundingSourceService

router = APIRouter(prefix="/funding-sources", tags=["funding-sources"])


def get_funding_source_dao(
    db: AsyncSession = Depends(get_db),
) -> FundingSourceDao:
    return FundingSourceDao(db)


def get_funding_source_service(
    dao: FundingSourceDao = Depends(get_funding_source_dao),
    db: AsyncSession = Depends(get_db),
) -> FundingSourceService:
    return FundingSourceService(dao, db)


@router.get(
    "", response_model=SuccessResponse[list[FundingSourceResponse]]
)
async def list_funding_sources(
    service: FundingSourceService = Depends(get_funding_source_service),
    _current_user: UserResponse = Depends(get_current_user),
) -> SuccessResponse[list[FundingSourceResponse]]:
    sources = await service.list_all()
    return SuccessResponse(data=sources)


@router.get(
    "/{source_id}",
    response_model=SuccessResponse[FundingSourceResponse],
)
async def get_funding_source(
    source_id: UUID,
    service: FundingSourceService = Depends(get_funding_source_service),
    _current_user: UserResponse = Depends(get_current_user),
) -> SuccessResponse[FundingSourceResponse]:
    source = await service.get_by_id(source_id)
    return SuccessResponse(data=source)


@router.post(
    "", response_model=SuccessResponse[FundingSourceResponse]
)
async def create_funding_source(
    data: FundingSourceCreate,
    service: FundingSourceService = Depends(get_funding_source_service),
    _current_user: UserResponse = Depends(
        require_role(UserRole.ADMIN, UserRole.MANAGER)
    ),
) -> SuccessResponse[FundingSourceResponse]:
    source = await service.create(data)
    return SuccessResponse(data=source)


@router.put(
    "/{source_id}",
    response_model=SuccessResponse[FundingSourceResponse],
)
async def update_funding_source(
    source_id: UUID,
    data: FundingSourceUpdate,
    service: FundingSourceService = Depends(get_funding_source_service),
    _current_user: UserResponse = Depends(
        require_role(UserRole.ADMIN, UserRole.MANAGER)
    ),
) -> SuccessResponse[FundingSourceResponse]:
    source = await service.update(source_id, data)
    return SuccessResponse(data=source)


@router.delete("/{source_id}", response_model=MessageResponse)
async def delete_funding_source(
    source_id: UUID,
    service: FundingSourceService = Depends(get_funding_source_service),
    _current_user: UserResponse = Depends(require_role(UserRole.ADMIN)),
) -> MessageResponse:
    await service.delete(source_id)
    return MessageResponse(message="Funding source deleted successfully")
