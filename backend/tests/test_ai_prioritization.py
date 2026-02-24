import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.agents.prioritization import AIPrioritizationService
from app.models import Task, TaskStatus, Priority, User

@pytest.fixture
def mock_session():
    return AsyncMock()

@pytest.fixture
def mock_user():
    return User(id="test-user-123", email="test@example.com")

@pytest.fixture
def sample_tasks():
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    return [
        Task(id="1", title="Urgent Task", due_date=now + timedelta(hours=1), priority=Priority.high, priority_score=95, status=TaskStatus.in_progress, estimated_duration=30, value_score=80, effort_score=20),
        Task(id="2", title="Quick Win", due_date=now + timedelta(days=2), priority=Priority.medium, priority_score=60, status=TaskStatus.backlog, estimated_duration=15, value_score=70, effort_score=10),
        Task(id="3", title="Big Project", due_date=now + timedelta(days=7), priority=Priority.low, priority_score=30, status=TaskStatus.backlog, estimated_duration=120, value_score=95, effort_score=90),
    ]

@pytest.mark.asyncio
async def test_initialization(mock_session, mock_user):
    """Test that the service can be initialized."""
    with patch("app.agents.prioritization.get_settings") as mock_settings:
        mock_settings.return_value.llm_provider = "local" # Use a supported, mockable provider
        mock_settings.return_value.llm_model = "mock-model"
        mock_settings.return_value.llm_base_url = "http://localhost:1234/v1"
        
        service = AIPrioritizationService(mock_session, mock_user.id)
        assert service.user_id == mock_user.id
        assert service.session == mock_session

@pytest.mark.asyncio
async def test_prompt_generation(mock_session, mock_user, sample_tasks):
    """Test that the prompt is generated correctly."""
    with patch("app.agents.prioritization.get_settings") as mock_settings:
        mock_settings.return_value.llm_provider = "local"
        mock_settings.return_value.llm_model = "mock-model"
        mock_settings.return_value.llm_base_url = "http://localhost:1234/v1"

        service = AIPrioritizationService(mock_session, mock_user.id)
        
        # Mock crud.get_tasks to return our sample tasks
        # For this test, we don't need a full DB mock
        
        prompt = await service.get_prioritization_prompt(sample_tasks, "8 hours remaining")
        
        assert "You are an AI assistant designed to help a user with ADHD" in prompt
        assert "Urgency above all else" in prompt
        assert "**User's Active Tasks:**" in prompt
        assert "Title: Urgent Task" in prompt

@pytest.mark.asyncio
async def test_get_ai_suggestion_flow(mock_session, mock_user, sample_tasks):
    """Test the full flow of getting an AI suggestion."""
    import json
    
    # First call: update_task_scores
    response_scores = {
        "scores": [
            { "task_id": "1", "score": 90 },
            { "task_id": "2", "score": 60 },
            { "task_id": "3", "score": 30 }
        ],
        "strategy_summary": "This task is due very soon and is high priority."
    }
    
    mock_result = MagicMock()
    mock_result.__str__.return_value = json.dumps(response_scores)
    
    with patch("app.agents.prioritization.get_settings") as mock_settings, \
         patch("app.agents.prioritization.crud.get_tasks", new=AsyncMock(return_value=sample_tasks)), \
         patch("semantic_kernel.Kernel.invoke_prompt", new=AsyncMock(return_value=mock_result)):
        
        mock_settings.return_value.llm_provider = "local"
        mock_settings.return_value.llm_model = "mock-model"
        mock_settings.return_value.llm_base_url = "http://localhost:1234/v1"

        service = AIPrioritizationService(mock_session, mock_user.id)
        
        # Mock session.execute for update_task_scores
        mock_session.execute = AsyncMock()
        mock_session.execute.return_value = MagicMock(scalar_one_or_none=lambda: sample_tasks[0])

        suggestion = await service.get_ai_suggestion()
        
        assert suggestion is not None
        assert suggestion["suggested_task_id"] == "1"
        assert "due very soon" in suggestion["reasoning"]

@pytest.mark.asyncio
async def test_update_task_scores(mock_session, mock_user, sample_tasks):
    """Test updating all task scores."""
    import json
    
    response_data = {
        "scores": [
            { "task_id": "1", "score": 90 },
            { "task_id": "2", "score": 60 },
            { "task_id": "3", "score": 30 }
        ],
        "strategy_summary": "Prioritizing urgent tasks first."
    }
    mock_result = MagicMock()
    mock_result.__str__.return_value = json.dumps(response_data)
    
    with patch("app.agents.prioritization.get_settings") as mock_settings, \
         patch("app.agents.prioritization.crud.get_tasks", new=AsyncMock(return_value=sample_tasks)), \
         patch("semantic_kernel.Kernel.invoke_prompt", new=AsyncMock(return_value=mock_result)):
        
        mock_settings.return_value.llm_provider = "local"
        mock_settings.return_value.llm_model = "mock-model"
        mock_settings.return_value.llm_base_url = "http://localhost:1234/v1"

        service = AIPrioritizationService(mock_session, mock_user.id)
        
        # We need to mock the session.execute for the updates
        mock_session.execute = AsyncMock()
        mock_session.execute.side_effect = [
            MagicMock(scalar_one_or_none=lambda: sample_tasks[0]),
            MagicMock(scalar_one_or_none=lambda: sample_tasks[1]),
            MagicMock(scalar_one_or_none=lambda: sample_tasks[2])
        ]
        
        data = await service.update_task_scores()
        
        assert data is not None
        assert len(data["scores"]) == 3
        assert sample_tasks[0].ai_relevance_score == 90
        assert sample_tasks[1].ai_relevance_score == 60
        assert sample_tasks[2].ai_relevance_score == 30
