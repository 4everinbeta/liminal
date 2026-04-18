"""
Tests for the natural language task parsing endpoint.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_parse_task_basic(authed_client: AsyncClient):
    """Test basic task parsing."""
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
    request_data = {"input_text": "Buy groceries"}
    response = await authed_client.post("/tasks/parse", json=request_data)

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Buy groceries"
    assert data["due_date_natural"] is None
    assert data["estimated_duration"] is None
