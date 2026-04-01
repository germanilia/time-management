import uuid

from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums.user_role import UserRole
from app.models.tables import users
from app.schemas.auth import UserResponse


class UserDao:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_email(self, email: str) -> tuple[UserResponse, str] | None:
        """Returns (user_response, password_hash) or None."""
        result = await self.db.execute(select(users).where(users.c.email == email))
        row = result.mappings().first()
        if not row:
            return None
        user = UserResponse(
            id=row["id"],
            email=row["email"],
            name=row["name"],
            role=row["role"],
            is_active=row["is_active"],
        )
        return user, row["password_hash"]

    async def get_by_id(self, user_id: uuid.UUID) -> UserResponse | None:
        result = await self.db.execute(select(users).where(users.c.id == user_id))
        row = result.mappings().first()
        if not row:
            return None
        return UserResponse(
            id=row["id"],
            email=row["email"],
            name=row["name"],
            role=row["role"],
            is_active=row["is_active"],
        )

    async def create(
        self, email: str, password_hash: str, name: str, role: UserRole = UserRole.VIEWER
    ) -> UserResponse:
        user_id = uuid.uuid4()
        await self.db.execute(
            insert(users).values(
                id=user_id,
                email=email,
                password_hash=password_hash,
                name=name,
                role=role,
            )
        )
        await self.db.flush()
        return UserResponse(
            id=user_id,
            email=email,
            name=name,
            role=role,
            is_active=True,
        )
