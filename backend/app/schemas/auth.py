from uuid import UUID

from app.enums.user_role import UserRole
from app.schemas.base import JsonModel


class LoginRequest(JsonModel):
    email: str
    password: str


class TokenResponse(JsonModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(JsonModel):
    id: UUID
    email: str
    name: str
    role: UserRole
    is_active: bool
