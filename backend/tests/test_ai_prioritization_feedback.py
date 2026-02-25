import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.agents.prioritization import AIPrioritizationService
from app.models import Task, TaskStatus, Priority, User, AISuggestionStatus

@pytest.fixture
def mock_session():
    return AsyncMock()

@pytest.fixture
def mock_user():
    return User(id="test-user-123", email="test@example.com")

@pytest.fixture
def sample_tasks_with_feedback():
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    return [
        Task(
            id="1", 
            title="Accepted Task", 
            due_date=now + timedelta(hours=1), 
            priority=Priority.high, 
            status=TaskStatus.in_progress,
            ai_suggestion_status=AISuggestionStatus.accepted
        ),
        Task(
            id="2", 
            title="Dismissed Task", 
            due_date=now + timedelta(days=2), 
            priority=Priority.medium, 
            status=TaskStatus.backlog,
            ai_suggestion_status=AISuggestionStatus.dismissed
        ),
        Task(
            id="3", 
            title="Ignored Task", 
            due_date=now + timedelta(days=7), 
            priority=Priority.low, 
            status=TaskStatus.backlog,
            ai_suggestion_status=AISuggestionStatus.ignored
        ),
    ]

@pytest.mark.asyncio
async def test_prompt_includes_feedback(mock_session, mock_user, sample_tasks_with_feedback):
    """Test that the prompt includes the AI suggestion status (feedback)."""
    with patch("app.agents.prioritization.get_settings") as mock_settings:
        mock_settings.return_value.llm_provider = "local"
        mock_settings.return_value.llm_model = "mock-model"
        mock_settings.return_value.llm_base_url = "http://localhost:1234/v1"

        service = AIPrioritizationService(mock_session, mock_user.id)
        
        prompt = await service.get_list_prioritization_prompt(sample_tasks_with_feedback, "8 hours remaining")
        
        assert "Feedback: accepted" in prompt
        assert "Feedback: dismissed" in prompt
        assert "Feedback: ignored" in prompt
