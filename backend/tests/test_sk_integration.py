"""
Integration tests for Semantic Kernel agents.

Tests full conversation scenarios with mocked LLM responses.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch, ANY
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlmodel import SQLModel

from app.agents.core import AgentService
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
def mock_sk_environment():
    """Mock environment for SK orchestrator."""
    with patch.dict("os.environ", {"USE_SK_ORCHESTRATOR": "true"}):
        with patch("app.agents.sk_orchestrator.get_settings") as mock_settings:
            mock_settings.return_value.llm_provider = "local"
            mock_settings.return_value.llm_base_url = "http://localhost:1234"
            mock_settings.return_value.llm_api_key = "test-key"
            mock_settings.return_value.llm_model = "test-model"
            yield mock_settings


@pytest.mark.asyncio
async def test_full_task_creation_conversation(async_session, test_user, mock_sk_environment):
    """
    Test complete task creation conversation.

    User: "Create task to review code by Friday"
    Agent: Shows details, asks for confirmation
    User: "Yes"
    Agent: Creates task
    """
    service = AgentService(async_session, test_user.id)

    # Mock SK orchestrator to return confirmation request
    with patch("app.agents.sk_orchestrator.SKOrchestrator.process_request") as mock_process:
        # First call: Agent asks for confirmation
        mock_process.return_value = """I'll create a task with these details:
- Title: Review code
- Priority: 50 (Medium)
- Effort: 50 (Medium)
- Due: Friday
Would you like me to create this task?

pending_confirmation: {"action": "create_task", "details": {"title": "Review code", "priority_score": 50, "effort_score": 50, "value_score": 50, "due_date_natural": "Friday"}}
"""

        # User's initial request
        response1 = await service.process_request(
            [{"role": "user", "content": "Create task to review code by Friday"}]
        )

        assert "create a task" in response1["content"]
        assert "Review code" in response1["content"]
        assert "Priority: 50" in response1["content"]

        # Verify NO task was created yet
        tasks = await crud.get_tasks(async_session, test_user.id)
        assert len(tasks) == 0

    # Now mock the confirmation
    with patch("app.agents.sk_orchestrator.SKOrchestrator.process_request") as mock_process:
        with patch("app.websockets.manager") as mock_manager:
            mock_manager.broadcast = AsyncMock()
            # Second call: Agent executes creation
            mock_process.return_value = "✓ Created task: 'Review code' (Priority: 50, Due: Friday)"

            response2 = await service.process_request(
                [{"role": "user", "content": "yes"}],
                session_id=response1["session_id"]
            )

            assert "Created task" in response2["content"]


@pytest.mark.asyncio
async def test_task_completion_conversation(async_session, test_user, mock_sk_environment):
    """
    Test task completion conversation.

    Setup: Task already exists
    User: "Complete review code"
    Agent: Asks for confirmation
    User: "Yes"
    Agent: Marks task complete
    """
    # Create a task first
    task = await crud.create_task(
        async_session,
        crud.TaskCreate(title="Review code", status=TaskStatus.todo),
        test_user.id
    )

    service = AgentService(async_session, test_user.id)

    # Mock SK orchestrator
    with patch("app.agents.sk_orchestrator.SKOrchestrator.process_request") as mock_process:
        # First call: Agent asks for confirmation
        mock_process.return_value = f"""Mark 'Review code' as complete?

pending_confirmation: {{"action": "complete_task", "details": {{"id": "{task.id}"}}}}
"""

        response1 = await service.process_request(
            [{"role": "user", "content": "Complete review code"}]
        )

        assert "complete" in response1["content"].lower()

    # Confirm
    with patch("app.agents.sk_orchestrator.SKOrchestrator.process_request") as mock_process:
        with patch("app.websockets.manager") as mock_manager:
            mock_manager.broadcast = AsyncMock()
            mock_process.return_value = "✓ Marked 'Review code' as complete!"

            response2 = await service.process_request(
                [{"role": "user", "content": "yes"}],
                session_id=response1["session_id"]
            )

            assert "complete" in response2["content"].lower()


@pytest.mark.asyncio
async def test_task_cancellation_conversation(async_session, test_user, mock_sk_environment):
    """
    Test task creation cancellation.

    User: "Create task X"
    Agent: Asks for confirmation
    User: "No"
    Agent: Cancels, no task created
    """
    service = AgentService(async_session, test_user.id)

    # Mock initial request
    with patch("app.agents.sk_orchestrator.SKOrchestrator.process_request") as mock_process:
        mock_process.return_value = """I'll create a task...

pending_confirmation: {"action": "create_task", "details": {"title": "Cancelled Task"}}
"""

        response1 = await service.process_request(
            [{"role": "user", "content": "Create task X"}]
        )

    # User cancels
    with patch("app.agents.sk_orchestrator.SKOrchestrator.process_request") as mock_process:
        mock_process.return_value = "Okay, cancelled. What else can I help with?"

        response2 = await service.process_request(
            [{"role": "user", "content": "no"}],
            session_id=response1["session_id"]
        )

        assert "cancelled" in response2["content"].lower()

    # Verify no task was created
    tasks = await crud.get_tasks(async_session, test_user.id)
    assert len(tasks) == 0


@pytest.mark.asyncio
async def test_multiple_tasks_same_session(async_session, test_user, mock_sk_environment):
    """
    Test creating multiple tasks in same conversation.

    Should create Task 1, then Task 2, without interference.
    """
    service = AgentService(async_session, test_user.id)

    # Create first task
    with patch("app.agents.sk_orchestrator.SKOrchestrator.process_request") as mock_process:
        with patch("app.websockets.manager") as mock_manager:
            mock_manager.broadcast = AsyncMock()

            # First call: return confirmation request
            async def mock_process_first_call(msg, history=None):
                if msg == "Create task 1":
                    return """I'll create...
pending_confirmation: {"action": "create_task", "details": {"title": "Task 1", "priority_score": 50, "effort_score": 50, "value_score": 50}}"""
                elif msg == "yes":
                    # Actually create the task
                    await crud.create_task(
                        async_session,
                        crud.TaskCreate(title="Task 1", priority_score=50, effort_score=50, value_score=50),
                        test_user.id
                    )
                    return "✓ Created task: 'Task 1'"

            mock_process.side_effect = mock_process_first_call

            response1 = await service.process_request(
                [{"role": "user", "content": "Create task 1"}]
            )
            response2 = await service.process_request(
                [{"role": "user", "content": "yes"}],
                session_id=response1["session_id"]
            )

    # Create second task
    with patch("app.agents.sk_orchestrator.SKOrchestrator.process_request") as mock_process:
        with patch("app.websockets.manager") as mock_manager:
            mock_manager.broadcast = AsyncMock()

            # Second call: return confirmation request and create task
            async def mock_process_second_call(msg, history=None):
                if msg == "Create task 2":
                    return """I'll create...
pending_confirmation: {"action": "create_task", "details": {"title": "Task 2", "priority_score": 50, "effort_score": 50, "value_score": 50}}"""
                elif msg == "yes":
                    # Actually create the task
                    await crud.create_task(
                        async_session,
                        crud.TaskCreate(title="Task 2", priority_score=50, effort_score=50, value_score=50),
                        test_user.id
                    )
                    return "✓ Created task: 'Task 2'"

            mock_process.side_effect = mock_process_second_call

            response3 = await service.process_request(
                [{"role": "user", "content": "Create task 2"}],
                session_id=response2["session_id"]
            )
            response4 = await service.process_request(
                [{"role": "user", "content": "yes"}],
                session_id=response3["session_id"]
            )

    # Verify both tasks were created
    tasks = await crud.get_tasks(async_session, test_user.id)
    assert len(tasks) == 2
    task_titles = [t.title for t in tasks]
    assert "Task 1" in task_titles
    assert "Task 2" in task_titles


@pytest.mark.asyncio
async def test_fuzzy_match_confirmation(async_session, test_user, mock_sk_environment):
    """
    Test fuzzy matching with confirmation.

    User: "Complete review code"
    Agent: Finds "Review cloud code for Yury" (75% match), asks for confirmation
    User: "Yes"
    Agent: Completes the matched task
    """
    # Create a task with similar name
    task = await crud.create_task(
        async_session,
        crud.TaskCreate(title="Review cloud code for Yury", status=TaskStatus.todo),
        test_user.id
    )

    service = AgentService(async_session, test_user.id)

    with patch("app.agents.sk_orchestrator.SKOrchestrator.process_request") as mock_process:
        # Agent finds fuzzy match and asks for confirmation
        mock_process.return_value = f"""I found 'Review cloud code for Yury' (75% match). Is this correct?

pending_confirmation: {{"action": "complete_task", "details": {{"id": "{task.id}"}}}}
"""

        response1 = await service.process_request(
            [{"role": "user", "content": "Complete review code"}]
        )

        assert "75% match" in response1["content"]
        assert "Review cloud code for Yury" in response1["content"]

    # User confirms
    with patch("app.agents.sk_orchestrator.SKOrchestrator.process_request") as mock_process:
        with patch("app.websockets.manager") as mock_manager:
            mock_manager.broadcast = AsyncMock()
            mock_process.return_value = "✓ Marked 'Review cloud code for Yury' as complete!"

            response2 = await service.process_request(
                [{"role": "user", "content": "yes"}],
                session_id=response1["session_id"]
            )

            assert "complete" in response2["content"].lower()


@pytest.mark.asyncio
async def test_context_preserved_across_messages(async_session, test_user, mock_sk_environment):
    """
    Test that conversation context is preserved.

    User: "What should I work on?"
    Agent: (TrackingAgent) "Work on Task X"
    User: "Create a task for it"
    Agent: (TaskAgent via handoff) Creates follow-up task
    """
    # Create an existing task
    await crud.create_task(
        async_session,
        crud.TaskCreate(title="Review code", status=TaskStatus.todo, priority_score=90),
        test_user.id
    )

    service = AgentService(async_session, test_user.id)

    # First message: Ask for suggestions
    with patch("app.agents.sk_orchestrator.SKOrchestrator.process_request") as mock_process:
        mock_process.return_value = "I recommend working on 'Review code' (High priority)"

        response1 = await service.process_request(
            [{"role": "user", "content": "What should I work on?"}]
        )

        assert "Review code" in response1["content"]

    # Second message: Create follow-up task (context preserved)
    with patch("app.agents.sk_orchestrator.SKOrchestrator.process_request") as mock_process:
        mock_process.return_value = """I'll create a follow-up task...

pending_confirmation: {"action": "create_task", "details": {"title": "Follow-up on Review code", "priority_score": 50, "effort_score": 50, "value_score": 50}}
"""

        response2 = await service.process_request(
            [{"role": "user", "content": "Create a task for it"}],
            session_id=response1["session_id"]
        )

        assert "follow-up" in response2["content"].lower()
