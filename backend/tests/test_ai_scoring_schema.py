import pytest
from app.models import Task, TaskCreate, Priority, TaskStatus

def test_task_model_has_ai_reasoning():
    """Verify that the Task model has the ai_reasoning field."""
    task = Task(
        title="Test Task",
        user_id="user1",
        ai_relevance_score=85,
        ai_reasoning="This task is highly relevant because it aligns with your focus on AI."
    )
    assert task.ai_reasoning == "This task is highly relevant because it aligns with your focus on AI."

def test_task_create_dto_has_ai_reasoning():
    """Verify that the TaskCreate DTO has the ai_reasoning field."""
    # Note: TaskCreate might not need ai_reasoning if it's only set by the AI,
    # but the plan suggests extending the schema.
    task_create = TaskCreate(
        title="New Task",
        ai_reasoning="AI suggests this task."
    )
    assert hasattr(task_create, "ai_reasoning")
    assert task_create.ai_reasoning == "AI suggests this task."
