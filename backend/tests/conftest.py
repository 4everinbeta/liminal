"""
Pytest configuration and fixtures for API testing.
"""
import pytest
import pytest_asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlmodel import SQLModel
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import get_session

# Use in-memory SQLite for tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False}
)

test_session_maker = sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Create a fresh database session for each test."""
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    async with test_session_maker() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create an async HTTP client for testing."""
    async def override_get_session():
        yield db_session

    app.dependency_overrides[get_session] = override_get_session

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="function")
async def authed_client(client: AsyncClient, sample_user_data) -> AsyncClient:
    """Create an authenticated client."""
    # Create user with password
    user_data = {
        "email": sample_user_data["email"],
        "name": sample_user_data["name"],
        "password": "testpassword"
    }
    await client.post("/users", json=user_data)

    # Login
    response = await client.post(
        "/auth/login",
        auth=(sample_user_data["email"], "testpassword")
    )
    token = response.json()["access_token"]
    
    # Set headers
    client.headers["Authorization"] = f"Bearer {token}"
    return client


@pytest.fixture
def sample_user_data():
    return {
        "email": "test@example.com",
        "name": "Test User"
    }


@pytest.fixture
def sample_theme_data():
    return {
        "title": "AI Enablement",
        "color": "#4F46E5"
    }


@pytest.fixture
def sample_initiative_data():
    return {
        "title": "Build ML Pipeline",
        "description": "Create automated ML training pipeline"
    }


@pytest.fixture
def sample_task_data():
    return {
        "title": "Write unit tests",
        "priority": "high",
        "priority_score": 90,
        "status": "backlog",
        "estimated_duration": 120,
        "effort_score": 70,
        "value_score": 75
    }
