"""
Tests for Semantic Kernel confirmation flows.

Critical tests to ensure no double task creation and proper multi-step flows.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlmodel import SQLModel

from app.agents.sk_orchestrator import SKOrchestrator
from app.models import User, Task, TaskStatus
from app import crud
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


@pytest.fixture
async def orchestrator(async_session, test_user):
    """Create SK orchestrator."""
    with patch("app.agents.sk_orchestrator.get_settings") as mock_settings:
        mock_settings.return_value.llm_provider = "local"
        mock_settings.return_value.llm_base_url = "http://localhost:1234"
        mock_settings.return_value.llm_api_key = "test-key"
        mock_settings.return_value.llm_model = "test-model"

        orchestrator = SKOrchestrator(async_session, test_user.id)
        yield orchestrator


@pytest.mark.asyncio
async def test_no_double_task_creation_on_initial_request(orchestrator, async_session, test_user):
    """
    CRITICAL TEST: Ensure task is NOT created on initial request.

    Task should only be created AFTER user confirms.
    """
    # Simulate initial request
    orchestrator.pending_confirmation = None

    # Simulate agent response with pending confirmation
    agent_response = """I'll create a task with these details:
- Title: Review code
- Priority: 50 (Medium)
Would you like me to create this task?

pending_confirmation: {"action": "create_task", "details": {"title": "Review code", "priority_score": 50, "effort_score": 50, "value_score": 50}}
"""

    # Extract pending confirmation
    await orchestrator._extract_pending_confirmation(agent_response)

    # Verify NO task was created yet
    tasks = await crud.get_tasks(async_session, test_user.id)
    assert len(tasks) == 0, "Task should NOT be created on initial request"

    # Verify pending confirmation was stored
    assert orchestrator.pending_confirmation is not None
    assert orchestrator.pending_confirmation["action"] == "create_task"


@pytest.mark.asyncio
async def test_task_created_only_after_confirmation(orchestrator, async_session, test_user):
    """
    CRITICAL TEST: Task should be created ONLY after user confirms.
    """
    # Set up pending confirmation
    orchestrator.pending_confirmation = {
        "action": "create_task",
        "details": {
            "title": "Review code",
            "priority_score": 50,
            "effort_score": 50,
            "value_score": 50
        }
    }

    # Verify no tasks yet
    tasks = await crud.get_tasks(async_session, test_user.id)
    assert len(tasks) == 0

    # User confirms
    with patch("app.websockets.manager") as mock_manager:
        mock_manager.broadcast = AsyncMock()
        await orchestrator._handle_pending_confirmation("yes")

    # NOW task should be created
    tasks = await crud.get_tasks(async_session, test_user.id)
    assert len(tasks) == 1
    assert tasks[0].title == "Review code"


@pytest.mark.asyncio
async def test_no_duplicate_on_repeated_confirmation(orchestrator, async_session, test_user):
    """
    CRITICAL TEST: Ensure pending confirmation is cleared after execution.

    If user says "yes" multiple times, task should NOT be created multiple times.
    """
    # Set up pending confirmation
    orchestrator.pending_confirmation = {
        "action": "create_task",
        "details": {
            "title": "Test Task",
            "priority_score": 50,
            "effort_score": 50,
            "value_score": 50
        }
    }

    # First confirmation - creates task
    with patch("app.websockets.manager") as mock_manager:
        mock_manager.broadcast = AsyncMock()
        result1 = await orchestrator._handle_pending_confirmation("yes")

    assert "Created task" in result1
    assert orchestrator.pending_confirmation is None  # Should be cleared

    # Second confirmation - should not create another task
    result2 = await orchestrator._handle_pending_confirmation("yes")

    # Should return error or re-route, NOT create duplicate
    assert "Created task" not in result2

    # Verify only ONE task was created
    tasks = await crud.get_tasks(async_session, test_user.id)
    assert len(tasks) == 1


@pytest.mark.asyncio
async def test_cancellation_prevents_task_creation(orchestrator, async_session, test_user):
    """Test that saying 'no' prevents task creation."""
    orchestrator.pending_confirmation = {
        "action": "create_task",
        "details": {
            "title": "Cancelled Task",
            "priority_score": 50,
            "effort_score": 50,
            "value_score": 50
        }
    }

    # User cancels
    result = await orchestrator._handle_pending_confirmation("no")

    assert "cancelled" in result.lower()

    # Verify NO task was created
    tasks = await crud.get_tasks(async_session, test_user.id)
    assert len(tasks) == 0


@pytest.mark.asyncio
async def test_multiple_confirmation_keywords(orchestrator, async_session, test_user):
    """Test that various confirmation keywords work."""
    keywords_that_should_confirm = ["yes", "y", "Yes", "YES", "confirm", "create it", "do it"]

    for idx, keyword in enumerate(keywords_that_should_confirm):
        # Set up new pending confirmation
        orchestrator.pending_confirmation = {
            "action": "create_task",
            "details": {
                "title": f"Task {idx}",
                "priority_score": 50,
                "effort_score": 50,
                "value_score": 50
            }
        }

        # Confirm with keyword
        with patch("app.websockets.manager") as mock_manager:
            mock_manager.broadcast = AsyncMock()
            result = await orchestrator._handle_pending_confirmation(keyword)

        assert "Created task" in result, f"Keyword '{keyword}' should confirm"

        # Verify task was created
        tasks = await crud.get_tasks(async_session, test_user.id)
        assert len(tasks) == idx + 1


@pytest.mark.asyncio
async def test_complete_task_confirmation_flow(orchestrator, async_session, test_user):
    """Test confirmation flow for completing a task."""
    # Create a task first
    task = await crud.create_task(
        async_session,
        crud.TaskCreate(title="Task to Complete", status=TaskStatus.todo),
        test_user.id
    )

    # Set up pending confirmation for completion
    orchestrator.pending_confirmation = {
        "action": "complete_task",
        "details": {"id": task.id}
    }

    # User confirms
    with patch("app.websockets.manager") as mock_manager:
        mock_manager.broadcast = AsyncMock()
        result = await orchestrator._handle_pending_confirmation("yes")

    assert "complete" in result.lower()

    # Verify task is now done
    updated_task = await crud.get_task_by_id(async_session, task.id, test_user.id)
    assert updated_task.status == TaskStatus.done


@pytest.mark.asyncio
async def test_update_task_confirmation_flow(orchestrator, async_session, test_user):
    """Test confirmation flow for updating a task."""
    # Create a task
    task = await crud.create_task(
        async_session,
        crud.TaskCreate(title="Task to Update", priority_score=50),
        test_user.id
    )

    # Set up pending confirmation for update
    orchestrator.pending_confirmation = {
        "action": "update_task",
        "details": {
            "id": task.id,
            "priority_score": 90
        }
    }

    # User confirms
    with patch("app.websockets.manager") as mock_manager:
        mock_manager.broadcast = AsyncMock()
        result = await orchestrator._handle_pending_confirmation("yes")

    assert "Updated" in result

    # Verify task was updated
    updated_task = await crud.get_task_by_id(async_session, task.id, test_user.id)
    assert updated_task.priority_score == 90


@pytest.mark.asyncio
async def test_confirmation_state_isolation(orchestrator, async_session, test_user):
    """
    Test that pending confirmations are properly isolated.

    If user has pending confirmation for Task A, saying 'yes' should NOT affect Task B.
    """
    # Create Task A
    task_a = await crud.create_task(
        async_session,
        crud.TaskCreate(title="Task A", status=TaskStatus.todo),
        test_user.id
    )

    # Set pending confirmation for completing Task A
    orchestrator.pending_confirmation = {
        "action": "complete_task",
        "details": {"id": task_a.id}
    }

    # Create Task B (separate operation)
    task_b = await crud.create_task(
        async_session,
        crud.TaskCreate(title="Task B", status=TaskStatus.todo),
        test_user.id
    )

    # User confirms - should only affect Task A
    with patch("app.websockets.manager") as mock_manager:
        mock_manager.broadcast = AsyncMock()
        await orchestrator._handle_pending_confirmation("yes")

    # Verify: Task A is done, Task B is still todo
    task_a_updated = await crud.get_task_by_id(async_session, task_a.id, test_user.id)
    task_b_updated = await crud.get_task_by_id(async_session, task_b.id, test_user.id)

    assert task_a_updated.status == TaskStatus.done
    assert task_b_updated.status == TaskStatus.todo


@pytest.mark.asyncio
async def test_nested_pending_confirmation_not_allowed(orchestrator):
    """
    Test that only one pending confirmation can exist at a time.

    If user has pending confirmation, new confirmation request should
    replace the old one (or handle gracefully).
    """
    # Set first pending confirmation
    orchestrator.pending_confirmation = {
        "action": "create_task",
        "details": {"title": "First Task"}
    }

    # Attempt to set second pending confirmation
    response_with_new_confirmation = """
pending_confirmation: {"action": "create_task", "details": {"title": "Second Task"}}
"""

    await orchestrator._extract_pending_confirmation(response_with_new_confirmation)

    # Should replace the first confirmation
    assert orchestrator.pending_confirmation is not None
    assert orchestrator.pending_confirmation["details"]["title"] == "Second Task"
