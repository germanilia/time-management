from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import UnauthorizedException
from app.core.security import decode_access_token
from app.dao.user_dao import UserDao
from app.dependencies import get_db
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    UserResponse,
)
from app.schemas.base import SuccessResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)


def get_user_dao(db: AsyncSession = Depends(get_db)) -> UserDao:
    return UserDao(db)


def get_auth_service(
    user_dao: UserDao = Depends(get_user_dao),
) -> AuthService:
    return AuthService(user_dao)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    user_dao: UserDao = Depends(get_user_dao),
) -> UserResponse:
    if not credentials:
        raise UnauthorizedException("Missing authentication token")
    payload = decode_access_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedException("Invalid token payload")
    user = await user_dao.get_by_id(UUID(user_id))
    if not user:
        raise UnauthorizedException("User not found")
    return user


@router.post("/login", response_model=SuccessResponse[TokenResponse])
async def login(
    request: LoginRequest,
    service: AuthService = Depends(get_auth_service),
) -> SuccessResponse[TokenResponse]:
    token = await service.login(request)
    return SuccessResponse(data=token)


@router.get("/me", response_model=SuccessResponse[UserResponse])
async def me(
    current_user: UserResponse = Depends(get_current_user),
) -> SuccessResponse[UserResponse]:
    return SuccessResponse(data=current_user)


