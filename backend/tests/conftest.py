import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import Settings
from app.dependencies import get_db
from app.models.tables import metadata

_test_settings = Settings(environment="dev")
_test_db_name = f"{_test_settings.db_name}-test"
_test_db_url_async = (
    f"postgresql+asyncpg://{_test_settings.db_user}:{_test_settings.db_password}"
    f"@{_test_settings.db_host}:{_test_settings.db_port}/{_test_db_name}"
)
_test_db_url_sync = (
    f"postgresql://{_test_settings.db_user}:{_test_settings.db_password}"
    f"@{_test_settings.db_host}:{_test_settings.db_port}/{_test_db_name}"
)


def _ensure_test_database() -> None:
    """Create the test database if it doesn't exist."""
    server_url = _test_settings.server_url_no_db
    engine = create_engine(server_url, isolation_level="AUTOCOMMIT")
    try:
        with engine.connect() as conn:
            result = conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :name"),
                {"name": _test_db_name},
            )
            if not result.scalar():
                conn.execute(text(f'CREATE DATABASE "{_test_db_name}"'))
    finally:
        engine.dispose()


def _create_tables() -> None:
    """Create all tables using sync engine (avoids asyncpg connection issues)."""
    engine = create_engine(_test_db_url_sync)
    metadata.create_all(engine)
    engine.dispose()


def _drop_tables() -> None:
    """Drop all tables using sync engine."""
    engine = create_engine(_test_db_url_sync)
    metadata.drop_all(engine)
    engine.dispose()


_ensure_test_database()

test_engine = create_async_engine(_test_db_url_async)
test_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


async def _seed_test_users() -> None:
    """Seed the test database with a default admin user for tests."""
    from app.database.seed import seed_users

    async with test_session() as session:
        await seed_users(session)


@pytest.fixture(autouse=True)
async def setup_db():
    _create_tables()
    await _seed_test_users()
    yield
    await test_engine.dispose()
    _drop_tables()


async def override_get_db():
    async with test_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# Skip lifespan startup (migrations/db creation) during tests
import app.main as _main_module  # noqa: E402

_main_module._skip_startup = True

from app.main import app  # noqa: E402

app.dependency_overrides[get_db] = override_get_db


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def db():
    async with test_session() as session:
        yield session
