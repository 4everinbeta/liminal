from typing import AsyncGenerator
from sqlmodel import SQLModel, create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import os

# Database URL from environment variable
# Normalize the URL so SQLAlchemy always uses the asyncpg driver even if the
# incoming env var uses the shorter `postgres://` or `postgresql://` syntax.
raw_database_url = os.getenv(
    "DATABASE_URL", "postgresql+asyncpg://user:password@db:5432/liminal"
)

def ensure_async_driver(url: str) -> str:
    """Force asyncpg driver; required when Railway gives postgres:// URLs."""
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]
    if url.startswith("postgresql://"):
        return "postgresql+asyncpg://" + url[len("postgresql://") :]
    if url.startswith("postgresql+psycopg2://"):
        return "postgresql+asyncpg://" + url[len("postgresql+psycopg2://") :]
    return url

DATABASE_URL = ensure_async_driver(raw_database_url)

# Create Async Engine
engine = create_async_engine(
    DATABASE_URL,
    echo=os.getenv("SQL_ECHO", "").lower() in ("1", "true", "yes"),
    future=True,
)

# Create Async Session
async_session = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session

async def init_db():
    async with engine.begin() as conn:
        # In production, use Alembic for migrations. 
        # For scaffolding/dev, this creates tables automatically.
        await conn.run_sync(SQLModel.metadata.create_all)
        # Minimal migration: ensure new score columns exist
        await conn.execute(text("ALTER TABLE task ADD COLUMN IF NOT EXISTS priority_score INTEGER DEFAULT 50"))
        await conn.execute(text("ALTER TABLE task ADD COLUMN IF NOT EXISTS effort_score INTEGER DEFAULT 50"))
        await conn.execute(text("UPDATE task SET priority_score = 50 WHERE priority_score IS NULL"))
        await conn.execute(text("UPDATE task SET effort_score = COALESCE(effort_score, estimated_duration, 50) WHERE effort_score IS NULL"))

        # OIDC migration: issuer support (issuer+sub is the stable identity key)
        await conn.execute(text('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS oidc_issuer TEXT'))
