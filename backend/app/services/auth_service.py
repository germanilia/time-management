from app.core.exceptions import UnauthorizedException
from app.core.security import create_access_token, verify_password
from app.dao.user_dao import UserDao
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
)


class AuthService:
    def __init__(self, user_dao: UserDao) -> None:
        self.user_dao = user_dao

    async def login(self, request: LoginRequest) -> TokenResponse:
        result = await self.user_dao.get_by_email(request.email)
        if not result:
            raise UnauthorizedException("Invalid email or password")
        user, password_hash = result
        if not verify_password(request.password, password_hash):
            raise UnauthorizedException("Invalid email or password")
        token = create_access_token({"sub": str(user.id)})
        return TokenResponse(access_token=token)
