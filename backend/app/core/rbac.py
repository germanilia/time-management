from typing import Any, Callable, Coroutine

from fastapi import Depends

from app.core.exceptions import ForbiddenException
from app.enums.user_role import UserRole
from app.routers.auth_router import get_current_user
from app.schemas.auth import UserResponse


def require_role(
    *allowed_roles: UserRole,
) -> Callable[..., Coroutine[Any, Any, UserResponse]]:
    """FastAPI dependency factory that checks the current user's role."""

    async def _check(
        current_user: UserResponse = Depends(get_current_user),
    ) -> UserResponse:
        if current_user.role not in allowed_roles:
            raise ForbiddenException(
                f"Role '{current_user.role}' is not authorized for this action"
            )
        return current_user

    return _check
