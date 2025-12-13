from typing import AsyncGenerator
from sqlmodel import SQLModel, create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import os

# Database URL from environment variable
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:password@db:5432/liminal")

# Create Async Engine
engine = create_async_engine(DATABASE_URL, echo=True, future=True)

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
