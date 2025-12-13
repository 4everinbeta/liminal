"""
Tests for Task API endpoints - Full CRUD operations.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_task(authed_client: AsyncClient, sample_task_data):
    """Test creating a new task (CREATE)."""
    response = await authed_client.post("/tasks", json=sample_task_data)

    assert response.status_code == 201
    data = response.json()
    assert data["title"] == sample_task_data["title"]
    assert data["priority"] == sample_task_data["priority"]
    assert data["priority_score"] == sample_task_data["priority_score"]
    assert data["value_score"] == sample_task_data["value_score"]
    assert data["effort_score"] == sample_task_data["effort_score"]
    assert "id" in data


@pytest.mark.asyncio
async def test_create_task_with_initiative(authed_client: AsyncClient):
    """Test creating a task linked to an initiative."""
    # Create initiative
    initiative_data = {
        "title": "Test Initiative"
    }
    initiative_response = await authed_client.post("/initiatives", json=initiative_data)
    initiative_id = initiative_response.json()["id"]

    # Create task with initiative
    task_data = {
        "title": "Task with Initiative",
        "initiative_id": initiative_id
    }
    response = await authed_client.post("/tasks", json=task_data)

    assert response.status_code == 201
    data = response.json()
    assert data["initiative_id"] == initiative_id


@pytest.mark.asyncio
async def test_get_tasks_empty(authed_client: AsyncClient):
    """Test getting tasks when none exist (READ)."""
    response = await authed_client.get("/tasks")

    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_get_tasks_list(authed_client: AsyncClient):
    """Test getting list of tasks (READ)."""
    task1_data = {"title": "First Task", "priority": "high", "status": "todo"}
    await authed_client.post("/tasks", json=task1_data)

    task2_data = {"title": "Second Task", "priority": "low", "status": "in_progress"}
    await authed_client.post("/tasks", json=task2_data)

    response = await authed_client.get("/tasks")

    assert response.status_code == 200
    tasks = response.json()
    assert len(tasks) == 2
    assert tasks[0]["title"] == "Second Task"
    assert tasks[1]["title"] == "First Task"


@pytest.mark.asyncio
async def test_update_task(authed_client: AsyncClient):
    """Test updating a task (UPDATE)."""
    task_data = {"title": "Original Title", "status": "todo", "priority": "medium", "priority_score": 60, "effort_score": 40}
    create_response = await authed_client.post("/tasks", json=task_data)
    task_id = create_response.json()["id"]

    update_data = {"title": "Updated Title", "status": "in_progress", "priority": "high", "priority_score": 90, "effort_score": 70}
    response = await authed_client.patch(f"/tasks/{task_id}", json=update_data)

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated Title"
    assert data["status"] == "in_progress"
    assert data["priority_score"] == 90
    assert data["effort_score"] == 70


@pytest.mark.asyncio
async def test_update_task_value_score_and_notes(authed_client: AsyncClient):
    """Ensure value_score and notes can be updated."""
    task_data = {"title": "Quick Capture Task", "value_score": 20}
    create_response = await authed_client.post("/tasks", json=task_data)
    task_id = create_response.json()["id"]

    update_data = {"value_score": 95, "notes": "Needs focus before moving", "effort_score": 55}
    response = await authed_client.patch(f"/tasks/{task_id}", json=update_data)

    assert response.status_code == 200
    data = response.json()
    assert data["value_score"] == 95
    assert data["notes"] == "Needs focus before moving"
    assert data["effort_score"] == 55


@pytest.mark.asyncio
async def test_update_task_not_found(authed_client: AsyncClient):
    """Test updating a non-existent task returns 404."""
    response = await authed_client.patch("/tasks/non-existent-id", json={"status": "done"})
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_task_priority_levels(authed_client: AsyncClient):
    """Test creating tasks with different priority levels."""
    for priority, score in [("high", 90), ("medium", 60), ("low", 30)]:
        task_data = {"title": f"{priority} Task", "priority": priority, "priority_score": score}
        response = await authed_client.post("/tasks", json=task_data)
        assert response.status_code == 201
        assert response.json()["priority"] == priority
        assert response.json()["priority_score"] == score
