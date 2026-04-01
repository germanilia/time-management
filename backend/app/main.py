import fcntl
import logging
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path

from alembic.config import Config
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from alembic import command
from app.core.config import settings
from app.core.exceptions import AppException
from app.database.seed import seed_project_statuses, seed_roles, seed_users
from app.database.session import async_session, ensure_database_exists
from app.middleware.error_handler import app_exception_handler, validation_exception_handler
from app.routers import (
    analytics_router,
    assignment_router,
    auth_router,
    employee_router,
    funding_source_router,
    health_router,
    project_router,
    project_status_router,
    role_router,
)

logger = logging.getLogger(__name__)

_MIGRATION_LOCK = Path(tempfile.gettempdir()) / "sela-time-mgmt-migration.lock"


def _run_migrations() -> None:
    """Run Alembic migrations programmatically."""
    backend_dir = Path(__file__).resolve().parents[1]
    alembic_cfg = Config(str(backend_dir / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(backend_dir / "alembic"))
    alembic_cfg.set_main_option("sqlalchemy.url", settings.database_url_sync)
    command.upgrade(alembic_cfg, "head")
    logger.info("Migrations applied successfully")


_skip_startup = False


@asynccontextmanager
async def lifespan(application: FastAPI):
    if not _skip_startup:
        logging.basicConfig(level=logging.INFO)
        # File lock prevents multiple uvicorn workers from racing on
        # migrations and seeding. The second worker blocks here until
        # the first finishes, then runs migrations as a no-op.
        with open(_MIGRATION_LOCK, "w") as lock_file:
            fcntl.flock(lock_file, fcntl.LOCK_EX)
            try:
                ensure_database_exists()
                _run_migrations()
                async with async_session() as db:
                    await seed_roles(db)
                    await seed_users(db)
                    await seed_project_statuses(db)
            finally:
                fcntl.flock(lock_file, fcntl.LOCK_UN)
    yield


def create_app() -> FastAPI:
    application = FastAPI(
        title="SelaTimeManagement",
        description="Resource/Time Management API",
        version="0.1.0",
        lifespan=lifespan,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.add_exception_handler(AppException, app_exception_handler)
    application.add_exception_handler(RequestValidationError, validation_exception_handler)

    application.include_router(health_router.router)
    application.include_router(auth_router.router)
    application.include_router(employee_router.router)
    application.include_router(project_router.router)
    application.include_router(assignment_router.router)
    application.include_router(analytics_router.router)
    application.include_router(role_router.router)
    application.include_router(funding_source_router.router)
    application.include_router(project_status_router.router)

    from app.routers import settings_router  # noqa: E402

    application.include_router(settings_router.router)

    return application


app = create_app()
