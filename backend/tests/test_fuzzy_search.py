import pytest
from sqlmodel import create_engine, Session, SQLModel
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app import crud
from app.models import Task, TaskCreate, TaskStatus, Priority, User
import uuid

@pytest.fixture
async def async_session():
    """Create an in-memory async SQLite database for testing."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
        connect_args={"check_same_thread": False}
    )

    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    async_session_maker = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session_maker() as session:
        yield session

    await engine.dispose()

@pytest.fixture
async def test_user(async_session):
    """Create a test user."""
    user = User(id=str(uuid.uuid4()), email="test@example.com", name="Test User")
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)
    return user

@pytest.mark.asyncio
async def test_fuzzy_search_exact_match(async_session, test_user):
    """Test that exact matches return 100% score."""
    # Create a task
    task_data = TaskCreate(
        title="Review code",
        status=TaskStatus.todo,
        priority=Priority.high
    )
    task = await crud.create_task(async_session, task_data, test_user.id)

    # Search for exact match
    results = await crud.search_tasks(async_session, test_user.id, "Review code")

    assert len(results) == 1
    assert results[0][0].id == task.id
    assert results[0][1] == 100.0  # Exact match score

@pytest.mark.asyncio
async def test_fuzzy_search_partial_match(async_session, test_user):
    """Test that partial matches are found with fuzzy matching."""
    # Create a task with a longer title
    task_data = TaskCreate(
        title="Review cloud code for Yury",
        status=TaskStatus.todo,
        priority=Priority.medium
    )
    task = await crud.create_task(async_session, task_data, test_user.id)

    # Search with a shorter query
    results = await crud.search_tasks(async_session, test_user.id, "Review code")

    # Should find the task with fuzzy matching
    assert len(results) >= 1
    assert results[0][0].id == task.id
    # token_set_ratio gives 100 when all query tokens are in the target
    # This is correct behavior - all words in "Review code" appear in the task title
    assert results[0][1] >= 60

@pytest.mark.asyncio
async def test_fuzzy_search_multiple_matches(async_session, test_user):
    """Test that multiple similar tasks are returned sorted by relevance."""
    # Create multiple tasks
    tasks = [
        TaskCreate(title="Review code", status=TaskStatus.todo),
        TaskCreate(title="Review cloud code", status=TaskStatus.todo),
        TaskCreate(title="Review documentation", status=TaskStatus.todo),
    ]

    created_tasks = []
    for task_data in tasks:
        task = await crud.create_task(async_session, task_data, test_user.id)
        created_tasks.append(task)

    # Search for "Review"
    results = await crud.search_tasks(async_session, test_user.id, "Review")

    # Should return multiple matches
    assert len(results) >= 2
    # Scores should be in descending order
    scores = [score for _, score in results]
    assert scores == sorted(scores, reverse=True)

@pytest.mark.asyncio
async def test_fuzzy_search_ignores_completed_tasks(async_session, test_user):
    """Test that completed tasks are excluded from search results."""
    # Create an active task and a completed task
    active_task = await crud.create_task(
        async_session,
        TaskCreate(title="Review code", status=TaskStatus.todo),
        test_user.id
    )

    completed_task = await crud.create_task(
        async_session,
        TaskCreate(title="Review code completed", status=TaskStatus.done),
        test_user.id
    )

    # Search for "Review code"
    results = await crud.search_tasks(async_session, test_user.id, "Review code")

    # Should only return the active task
    task_ids = [task.id for task, _ in results]
    assert active_task.id in task_ids
    assert completed_task.id not in task_ids

@pytest.mark.asyncio
async def test_fuzzy_search_below_threshold(async_session, test_user):
    """Test that tasks below similarity threshold are not returned."""
    # Create a task with very different title
    task = await crud.create_task(
        async_session,
        TaskCreate(title="Buy groceries", status=TaskStatus.todo),
        test_user.id
    )

    # Search for completely different query
    results = await crud.search_tasks(async_session, test_user.id, "Review code", similarity_threshold=60)

    # Should not return the unrelated task
    assert len(results) == 0

@pytest.mark.asyncio
async def test_fuzzy_search_case_insensitive(async_session, test_user):
    """Test that search is case insensitive."""
    task = await crud.create_task(
        async_session,
        TaskCreate(title="Review Code", status=TaskStatus.todo),
        test_user.id
    )

    # Search with lowercase
    results = await crud.search_tasks(async_session, test_user.id, "review code")

    assert len(results) == 1
    assert results[0][0].id == task.id
