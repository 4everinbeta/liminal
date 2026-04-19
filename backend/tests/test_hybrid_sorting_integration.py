import pytest
from datetime import datetime, timedelta
from httpx import AsyncClient
from app.models import Priority, TaskStatus

@pytest.mark.asyncio
async def test_get_tasks_sorted_by_hybrid_score(authed_client: AsyncClient):
    """Verify that GET /tasks returns tasks sorted by hybrid score."""
    # 1. Create a high priority, soon-to-be-due task (High score)
    await authed_client.post("/tasks", json={
        "title": "High Score Task",
        "priority": "high",
        "due_date_natural": "today at 11pm"
    })
    
    # 2. Create a low priority, far-future task (Low score)
    await authed_client.post("/tasks", json={
        "title": "Low Score Task",
        "priority": "low",
        "due_date_natural": "next week"
    })
    
    # 3. Fetch tasks
    response = await authed_client.get("/tasks")
    assert response.status_code == 200
    tasks = response.json()
    
    # "High Score Task" should be first
    assert tasks[0]["title"] == "High Score Task"
    assert tasks[1]["title"] == "Low Score Task"

@pytest.mark.asyncio
async def test_done_tasks_at_bottom(authed_client: AsyncClient):
    """Verify that completed tasks are at the bottom regardless of score components."""
    # 1. Create a done task
    await authed_client.post("/tasks", json={
        "title": "Done Task",
        "status": "done",
        "priority": "high"
    })
    
    # 2. Create an active task
    await authed_client.post("/tasks", json={
        "title": "Active Task",
        "status": "backlog",
        "priority": "low"
    })
    
    # 3. Fetch tasks
    response = await authed_client.get("/tasks")
    assert response.status_code == 200
    tasks = response.json()
    
    # Active task should be above done task
    titles = [t["title"] for t in tasks]
    active_idx = titles.index("Active Task")
    done_idx = titles.index("Done Task")
    assert active_idx < done_idx
