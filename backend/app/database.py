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
        # For scaffolding/dev, this creates tables automatically if they don't exist.
        await conn.run_sync(SQLModel.metadata.create_all)
        
        # --- SAFEGUARD MIGRATIONS ---
        # Ensure 'user' table has 'oidc_issuer' and 'updated_at'
        await conn.execute(text('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS oidc_issuer TEXT'))
        await conn.execute(text('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()'))
        
        # Ensure 'theme' table has 'order', 'created_at', 'updated_at'
        await conn.execute(text('ALTER TABLE theme ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0'))
        await conn.execute(text('ALTER TABLE theme ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()'))
        await conn.execute(text('ALTER TABLE theme ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()'))

        # Ensure 'initiative' table has 'created_at', 'updated_at'
        await conn.execute(text('ALTER TABLE initiative ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()'))
        await conn.execute(text('ALTER TABLE initiative ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()'))
        
        # Ensure 'task' table has score columns
        await conn.execute(text("ALTER TABLE task ADD COLUMN IF NOT EXISTS priority_score INTEGER DEFAULT 50"))
        await conn.execute(text("ALTER TABLE task ADD COLUMN IF NOT EXISTS effort_score INTEGER DEFAULT 50"))
        await conn.execute(text("ALTER TABLE task ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITHOUT TIME ZONE"))
        await conn.execute(text("ALTER TABLE task ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE"))
        
        # Backfill defaults if needed
        await conn.execute(text("UPDATE task SET priority_score = 50 WHERE priority_score IS NULL"))
        await conn.execute(text("UPDATE task SET effort_score = COALESCE(effort_score, estimated_duration, 50) WHERE effort_score IS NULL"))
        await conn.execute(text("UPDATE task SET is_deleted = FALSE WHERE is_deleted IS NULL"))

