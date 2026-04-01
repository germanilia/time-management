import logging

import sqlalchemy
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

logger = logging.getLogger(__name__)

engine = create_async_engine(settings.database_url, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


def ensure_database_exists() -> None:
    """Create the database if it does not exist. Connects to 'postgres' db to check/create."""
    db_name = settings.db_name
    server_engine = create_engine(settings.server_url_no_db, isolation_level="AUTOCOMMIT")
    try:
        with server_engine.connect() as conn:
            result = conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :name"),
                {"name": db_name},
            )
            if not result.scalar():
                conn.execute(text(f'CREATE DATABASE "{db_name}"'))
                logger.info("Created database '%s'", db_name)
            else:
                logger.info("Database '%s' already exists", db_name)
    except sqlalchemy.exc.OperationalError:
        logger.exception("Could not connect to PostgreSQL server to ensure database exists")
        raise
    finally:
        server_engine.dispose()
