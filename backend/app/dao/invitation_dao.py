import secrets
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums.user_role import UserRole
from app.models.tables import invitation_codes
from app.schemas.auth import InvitationCodeResponse


class InvitationDao:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self,
        role: UserRole,
        created_by: uuid.UUID,
        expires_in_hours: int | None = None,
    ) -> InvitationCodeResponse:
        code_id = uuid.uuid4()
        code = secrets.token_urlsafe(32)
        expires_at = None
        if expires_in_hours:
            expires_at = datetime.now(timezone.utc) + timedelta(hours=expires_in_hours)

        await self.db.execute(
            insert(invitation_codes).values(
                id=code_id,
                code=code,
                role=role,
                created_by=created_by,
                expires_at=expires_at,
            )
        )
        await self.db.flush()
        return InvitationCodeResponse(
            id=code_id,
            code=code,
            role=role,
            created_by=created_by,
            used_by=None,
            used_at=None,
            expires_at=expires_at,
            created_at=datetime.now(timezone.utc),
        )

    async def get_by_code(self, code: str) -> InvitationCodeResponse | None:
        result = await self.db.execute(
            select(invitation_codes).where(invitation_codes.c.code == code)
        )
        row = result.mappings().first()
        if not row:
            return None
        return InvitationCodeResponse(
            id=row["id"],
            code=row["code"],
            role=row["role"],
            created_by=row["created_by"],
            used_by=row["used_by"],
            used_at=row["used_at"],
            expires_at=row["expires_at"],
            created_at=row["created_at"],
        )

    async def mark_used(
        self, code_id: uuid.UUID, used_by: uuid.UUID
    ) -> None:
        await self.db.execute(
            update(invitation_codes)
            .where(invitation_codes.c.id == code_id)
            .values(used_by=used_by, used_at=datetime.now(timezone.utc))
        )
        await self.db.flush()

    async def list_all(self) -> list[InvitationCodeResponse]:
        result = await self.db.execute(
            select(invitation_codes).order_by(invitation_codes.c.created_at.desc())
        )
        return [
            InvitationCodeResponse(
                id=row["id"],
                code=row["code"],
                role=row["role"],
                created_by=row["created_by"],
                used_by=row["used_by"],
                used_at=row["used_at"],
                expires_at=row["expires_at"],
                created_at=row["created_at"],
            )
            for row in result.mappings()
        ]
