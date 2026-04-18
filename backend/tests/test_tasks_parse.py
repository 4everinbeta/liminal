"""
Tests for the natural language task parsing endpoint.
"""
import pytest
from unittest.mock import patch, MagicMock
from httpx import AsyncClient
from app.models import TaskParseResponse


@pytest.mark.asyncio
async def test_parse_task_basic(authed_client: AsyncClient):
    """Test basic task parsing."""
    mock_response = TaskParseResponse(
        title="Call Mom",
        due_date_natural="tomorrow",
        estimated_duration=15,
        priority="high",
        priority_score=90,
        effort_score=30,
        value_score=50
    )

    with patch("app.routers.tasks.TaskParsingService.parse_task", return_value=mock_response):
        request_data = {"input_text": "Call Mom tomorrow 15m !high"}
        response = await authed_client.post("/tasks/parse", json=request_data)

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Call Mom"
    assert "tomorrow" in data["due_date_natural"].lower()
    assert data["estimated_duration"] == 15
    assert data["priority"] == "high"


@pytest.mark.asyncio
async def test_parse_task_title_only(authed_client: AsyncClient):
    """Test parsing with only a title."""
    mock_response = TaskParseResponse(
        title="Buy groceries",
        due_date_natural=None,
        estimated_duration=None,
        priority=None
    )

    with patch("app.routers.tasks.TaskParsingService.parse_task", return_value=mock_response):
        request_data = {"input_text": "Buy groceries"}
        response = await authed_client.post("/tasks/parse", json=request_data)

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Buy groceries"
    assert data["due_date_natural"] is None
    assert data["estimated_duration"] is None
