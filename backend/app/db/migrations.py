import asyncio

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import text

from app.config import settings
from app.db.models import Base
from app.logging_config import get_logger

logger = get_logger(__name__)


async def run_migrations() -> None:
    logger.info("migration_started", database_url=settings.database_url)

    engine = create_async_engine(settings.database_url, echo=False)

    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)

    await engine.dispose()

    logger.info("migration_completed")


def migrate() -> None:
    asyncio.run(run_migrations())


async def get_session() -> async_sessionmaker[AsyncSession]:
    engine = create_async_engine(settings.database_url, echo=False)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    return async_session


if __name__ == "__main__":
    migrate()
