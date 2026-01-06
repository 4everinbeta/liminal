"""
Tests for Semantic Kernel orchestrator.

Tests orchestrator routing, pending confirmations, and action execution.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from sqlmodel import create_engine, Session, SQLModel
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.agents.sk_orchestrator import SKOrchestrator
from app.models import User, Task, TaskStatus, Priority
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
    """Create SK orchestrator with mocked LLM service."""
    with patch("app.agents.sk_orchestrator.get_settings") as mock_settings:
        mock_settings.return_value.llm_provider = "local"
        mock_settings.return_value.llm_base_url = "http://localhost:1234"
        mock_settings.return_value.llm_api_key = "test-key"
        mock_settings.return_value.llm_model = "test-model"

        orchestrator = SKOrchestrator(async_session, test_user.id)
        yield orchestrator


@pytest.mark.asyncio
async def test_orchestrator_initialization(orchestrator):
    """Test that orchestrator initializes correctly."""
    assert orchestrator.session is not None
    assert orchestrator.user_id is not None
    assert orchestrator.kernel is not None
    assert orchestrator.pending_confirmation is None
    assert orchestrator.agents == []
    assert orchestrator.group_chat is None


@pytest.mark.asyncio
async def test_register_agent(orchestrator):
    """Test agent registration."""
    with patch("semantic_kernel.agents.ChatCompletionAgent") as MockAgent:
        mock_agent = MockAgent()
        mock_agent.name = "TestAgent"

        orchestrator.register_agent(mock_agent)

        assert len(orchestrator.agents) == 1
        assert orchestrator.agents[0] == mock_agent


@pytest.mark.asyncio
async def test_pending_confirmation_storage(orchestrator):
    """Test extracting and storing pending confirmations."""
    response_with_marker = """I'll create a task with these details:
- Title: Test Task
- Priority: 50 (Medium)

Would you like me to create this task?

pending_confirmation: {"action": "create_task", "details": {"title": "Test Task", "priority_score": 50}}
"""

    orchestrator._extract_pending_confirmation(response_with_marker)

    assert orchestrator.pending_confirmation is not None
    assert orchestrator.pending_confirmation["action"] == "create_task"
    assert orchestrator.pending_confirmation["details"]["title"] == "Test Task"


@pytest.mark.asyncio
async def test_pending_confirmation_invalid_json(orchestrator):
    """Test handling of invalid pending confirmation JSON."""
    response_with_bad_json = """pending_confirmation: {invalid json}"""

    orchestrator._extract_pending_confirmation(response_with_bad_json)

    # Should not crash, pending_confirmation should remain None
    assert orchestrator.pending_confirmation is None


@pytest.mark.asyncio
async def test_execute_action_create_task(orchestrator, async_session, test_user):
    """Test executing a create_task action."""
    action_details = {
        "title": "Test Task",
        "priority_score": 90,
        "effort_score": 50,
        "value_score": 50
    }

    with patch("app.websockets.manager") as mock_manager:
        mock_manager.broadcast = AsyncMock()
        result = await orchestrator._execute_action("create_task", action_details)

        assert "Created task" in result
        assert "Test Task" in result

        # Verify task was created
        from app import crud
        tasks = await crud.get_tasks(async_session, test_user.id)
        assert len(tasks) == 1
        assert tasks[0].title == "Test Task"
        assert tasks[0].priority_score == 90


@pytest.mark.asyncio
async def test_execute_action_complete_task(orchestrator, async_session, test_user):
    """Test executing a complete_task action."""
    # Create a task first
    from app import crud
    from app.models import TaskCreate

    task = await crud.create_task(
        async_session,
        TaskCreate(title="Task to Complete", status=TaskStatus.todo),
        test_user.id
    )

    action_details = {"id": task.id}

    with patch("app.websockets.manager") as mock_manager:
        mock_manager.broadcast = AsyncMock()
        result = await orchestrator._execute_action("complete_task", action_details)

        assert "Marked" in result
        assert "complete" in result

        # Verify task was completed
        updated_task = await crud.get_task_by_id(async_session, task.id, test_user.id)
        assert updated_task.status == TaskStatus.done


@pytest.mark.asyncio
async def test_execute_action_task_not_found(orchestrator):
    """Test executing action on non-existent task."""
    action_details = {"id": "non-existent-id"}

    with patch("app.websockets.manager"):
        result = await orchestrator._execute_action("complete_task", action_details)

        assert "Error" in result
        assert "not found" in result


@pytest.mark.asyncio
async def test_handle_pending_confirmation_yes(orchestrator, async_session, test_user):
    """Test handling user confirmation with 'yes'."""
    # Set up pending confirmation
    orchestrator.pending_confirmation = {
        "action": "create_task",
        "details": {
            "title": "Confirmed Task",
            "priority_score": 50,
            "effort_score": 50,
            "value_score": 50
        }
    }

    with patch("app.websockets.manager") as mock_manager:
        mock_manager.broadcast = AsyncMock()
        result = await orchestrator._handle_pending_confirmation("yes")

        assert "Created task" in result
        assert orchestrator.pending_confirmation is None  # Should be cleared

        # Verify task was created
        from app import crud
        tasks = await crud.get_tasks(async_session, test_user.id)
        assert len(tasks) == 1
        assert tasks[0].title == "Confirmed Task"


@pytest.mark.asyncio
async def test_handle_pending_confirmation_no(orchestrator):
    """Test handling user cancellation with 'no'."""
    orchestrator.pending_confirmation = {
        "action": "create_task",
        "details": {"title": "Cancelled Task"}
    }

    result = await orchestrator._handle_pending_confirmation("no")

    assert "cancelled" in result.lower()
    assert orchestrator.pending_confirmation is None  # Should be cleared


@pytest.mark.asyncio
async def test_handle_pending_confirmation_variants(orchestrator, async_session, test_user):
    """Test various confirmation keywords."""
    confirmation_keywords = ["yes", "y", "confirm", "create it", "do it"]

    for keyword in confirmation_keywords:
        orchestrator.pending_confirmation = {
            "action": "create_task",
            "details": {
                "title": f"Task for {keyword}",
                "priority_score": 50,
                "effort_score": 50,
                "value_score": 50
            }
        }

        with patch("app.websockets.manager") as mock_manager:
            mock_manager.broadcast = AsyncMock()
            result = await orchestrator._handle_pending_confirmation(keyword)

            assert "Created task" in result, f"Failed for keyword: {keyword}"
            assert orchestrator.pending_confirmation is None


@pytest.mark.asyncio
async def test_get_active_tasks_context(orchestrator, async_session, test_user):
    """Test getting active tasks context for agents."""
    from app import crud
    from app.models import TaskCreate

    # Create some tasks
    await crud.create_task(
        async_session,
        TaskCreate(title="Active Task 1", status=TaskStatus.todo),
        test_user.id
    )
    await crud.create_task(
        async_session,
        TaskCreate(title="Active Task 2", status=TaskStatus.in_progress),
        test_user.id
    )
    await crud.create_task(
        async_session,
        TaskCreate(title="Completed Task", status=TaskStatus.done),
        test_user.id
    )

    context = await orchestrator.get_active_tasks_context()

    assert "Active Task 1" in context
    assert "Active Task 2" in context
    assert "Completed Task" not in context  # Should exclude done tasks
    assert "Current Active Tasks" in context


@pytest.mark.asyncio
async def test_get_active_tasks_context_empty(orchestrator):
    """Test getting context when no active tasks."""
    context = await orchestrator.get_active_tasks_context()

    assert "No active tasks" in context
