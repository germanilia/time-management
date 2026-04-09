import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.tables import project_statuses, roles, users

logger = logging.getLogger(__name__)

SEED_USERS = [
    {"email": "iliag@sela.co.il", "password": "Cowabunga1!", "name": "Ilia G", "role": "admin"},
    {
        "email": "shmuliks@sela.co.il",
        "password": "Cowabunga1!",
        "name": "Shmulik S",
        "role": "admin",
    },
    {"email": "mikis@sela.co.il", "password": "Cowabunga1!", "name": "Miki S", "role": "admin"},
    {"email": "baruchf@sela.co.il", "password": "Cowabunga1!", "name": "Baruch F", "role": "admin"},
    {
        "email": "avielh@selacloud.com",
        "password": "Cowabunga1!",
        "name": "Aviel H",
        "role": "admin",
    },
    {
        "email": "zafrirk@selacloud.com",
        "password": "Cowabunga1!",
        "name": "Zafrir K",
        "role": "admin",
    },
    {
        "email": "talo@selacloud.com",
        "password": "Cowabunga1!",
        "name": "Tal O",
        "role": "admin",
    },
    {
        "email": "evgenyl@selacloud.com",
        "password": "Cowabunga1!",
        "name": "Evgeny L",
        "role": "admin",
    },
]

SEED_ROLES = [
    {"name": "Developer", "default_hourly_rate": 150},
    {"name": "Architect", "default_hourly_rate": 250},
    {"name": "DevOps", "default_hourly_rate": 200},
]


async def seed_users(db: AsyncSession) -> None:
    """Create default users if they don't already exist. Safe to run on every startup."""
    for user_data in SEED_USERS:
        result = await db.execute(select(users).where(users.c.email == user_data["email"]))
        if result.first():
            logger.info("Seed user '%s' already exists, skipping", user_data["email"])
            continue

        await db.execute(
            users.insert().values(
                id=uuid.uuid4(),
                email=user_data["email"],
                password_hash=hash_password(user_data["password"]),
                name=user_data["name"],
                role=user_data["role"],
            )
        )
        logger.info("Created seed user '%s'", user_data["email"])

    await db.commit()


SEED_PROJECT_STATUSES = [
    {"name": "planning", "display_order": 0, "color": "gray", "is_default": True},
    {"name": "active", "display_order": 1, "color": "blue", "is_default": False},
    {"name": "waiting_assignment", "display_order": 2, "color": "yellow", "is_default": False},
    {"name": "completed", "display_order": 3, "color": "green", "is_default": False},
]


async def seed_project_statuses(db: AsyncSession) -> None:
    """Create default project statuses if they don't exist."""
    for status_data in SEED_PROJECT_STATUSES:
        result = await db.execute(
            select(project_statuses).where(
                project_statuses.c.name == status_data["name"]
            )
        )
        if result.first():
            logger.info(
                "Seed project status '%s' already exists, skipping",
                status_data["name"],
            )
            continue

        await db.execute(
            project_statuses.insert().values(
                id=uuid.uuid4(),
                name=status_data["name"],
                display_order=status_data["display_order"],
                color=status_data["color"],
                is_default=status_data["is_default"],
            )
        )
        logger.info("Created seed project status '%s'", status_data["name"])

    await db.commit()


async def seed_roles(db: AsyncSession) -> None:
    """Create default roles if they don't already exist. Safe to run on every startup."""
    for role_data in SEED_ROLES:
        result = await db.execute(select(roles).where(roles.c.name == role_data["name"]))
        if result.first():
            logger.info("Seed role '%s' already exists, skipping", role_data["name"])
            continue

        await db.execute(
            roles.insert().values(
                id=uuid.uuid4(),
                name=role_data["name"],
                default_hourly_rate=role_data["default_hourly_rate"],
            )
        )
        logger.info("Created seed role '%s'", role_data["name"])

    await db.commit()
