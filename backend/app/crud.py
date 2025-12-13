from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, col, or_
import uuid
from .models import Task, TaskCreate, TaskStatus, Priority

async def create_task(session: AsyncSession, task_data: TaskCreate, user_id: str) -> Task:
    def score_to_priority_label(score: int) -> Priority:
        if score >= 67:
            return Priority.high
        if score >= 34:
            return Priority.medium
        return Priority.low

    # Normalize numeric <-> enum for compatibility
    normalized_priority_score = task_data.priority_score or 50
    normalized_priority = score_to_priority_label(normalized_priority_score)
    
    if task_data.priority:
        if task_data.priority == Priority.high:
            normalized_priority_score = max(normalized_priority_score, 90)
        elif task_data.priority == Priority.medium:
            normalized_priority_score = max(normalized_priority_score, 60)
        else:
            normalized_priority_score = max(normalized_priority_score, 30)

    normalized_effort = task_data.effort_score or task_data.estimated_duration or 50

    new_task = Task(
        id=str(uuid.uuid4()),
        title=task_data.title,
        description=task_data.description,
        notes=task_data.notes,
        status=task_data.status or TaskStatus.backlog,
        priority=normalized_priority,
        priority_score=normalized_priority_score,
        due_date=task_data.due_date,
        value_score=task_data.value_score,
        order=task_data.order,
        estimated_duration=task_data.estimated_duration or normalized_effort,
        effort_score=normalized_effort,
        actual_duration=task_data.actual_duration,
        parent_id=task_data.parent_id,
        initiative_id=task_data.initiative_id,
        theme_id=task_data.theme_id,
        user_id=user_id,
    )
    session.add(new_task)
    await session.commit()
    await session.refresh(new_task)
    return new_task

async def get_tasks(session: AsyncSession, user_id: str) -> List[Task]:
    statement = (
        select(Task)
        .where(Task.user_id == user_id)
        .order_by(Task.created_at.desc())
    )
    result = await session.execute(statement)
    return result.scalars().all()

async def get_stale_tasks(session: AsyncSession, user_id: str, days: int = 7) -> List[Task]:
    threshold_date = datetime.utcnow() - timedelta(days=days)
    statement = (
        select(Task)
        .where(Task.user_id == user_id)
        .where(Task.status != TaskStatus.done)
        .where(Task.created_at < threshold_date)
        .order_by(Task.created_at.asc())
    )
    result = await session.execute(statement)
    return result.scalars().all()
async def get_task_by_id(session: AsyncSession, task_id: str, user_id: str) -> Optional[Task]:
    statement = select(Task).where(
        Task.id == task_id,
        Task.user_id == user_id,
    )
    result = await session.execute(statement)
    return result.scalar_one_or_none()

async def update_task(session: AsyncSession, task: Task, task_update: dict) -> Task:
    allowed_fields = {
        "title",
        "description",
        "status",
        "priority",
        "priority_score",
        "due_date",
        "order",
        "estimated_duration",
        "effort_score",
        "actual_duration",
        "value_score",
        "notes",
        "theme_id",
        "initiative_id",
    }
    for key, value in task_update.items():
        if key in allowed_fields:
            setattr(task, key, value)
            # Keep enum and numeric priority in sync
            if key == "priority_score":
                ps = int(value)
                if ps >= 67:
                    task.priority = Priority.high
                elif ps >= 34:
                    task.priority = Priority.medium
                else:
                    task.priority = Priority.low
            if key == "priority":
                if value == Priority.high:
                    task.priority_score = max(task.priority_score, 90)
                elif value == Priority.medium:
                    task.priority_score = max(task.priority_score, 60)
                else:
                    task.priority_score = max(task.priority_score, 30)
            if key == "effort_score" and not task_update.get("estimated_duration"):
                task.estimated_duration = value
            if key == "estimated_duration" and not task_update.get("effort_score"):
                task.effort_score = value

    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task

async def delete_task(session: AsyncSession, task: Task) -> None:
    await session.delete(task)
    await session.commit()

async def search_tasks(session: AsyncSession, user_id: str, query: str) -> List[Task]:
    statement = (
        select(Task)
        .where(Task.user_id == user_id)
        .where(
            or_(
                col(Task.title).ilike(f"%{query}%"),
                col(Task.description).ilike(f"%{query}%")
            )
        )
        .order_by(Task.created_at.desc())
        .limit(5)
    )
    result = await session.execute(statement)
    return result.scalars().all()
