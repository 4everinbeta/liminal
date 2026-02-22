from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from ..database import get_session
from ..models import Task, TaskCreate, User
from ..auth import get_current_user
from .. import crud
from ..websockets import manager
from ..agents.prioritization import AIPrioritizationService

router = APIRouter(prefix="/tasks", tags=["tasks"])

@router.post("", response_model=Task, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_data: TaskCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    task = await crud.create_task(session, task_data, current_user.id)
    await manager.broadcast("refresh", current_user.id)
    return task

@router.get("/ai-suggestion", response_model=dict)
async def get_ai_suggestion(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    prioritization_service = AIPrioritizationService(session, current_user.id)
    suggestion = await prioritization_service.get_ai_suggestion()
    if not suggestion:
        raise HTTPException(status_code=404, detail="No active tasks or AI failed to provide a suggestion.")
    return suggestion

@router.get("", response_model=List[Task])
async def get_tasks(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return await crud.get_tasks(session, current_user.id)

@router.get("/deleted", response_model=List[Task])
async def get_deleted_tasks(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return await crud.get_deleted_tasks(session, current_user.id)

@router.post("/{task_id}/restore", response_model=Task)
async def restore_task(
    task_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    # Need to get even if is_deleted is True, so we don't use crud.get_task_by_id
    from sqlmodel import select
    statement = select(Task).where(Task.id == task_id, Task.user_id == current_user.id)
    result = await session.execute(statement)
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    restored_task = await crud.restore_task(session, task)
    await manager.broadcast("refresh", current_user.id)
    return restored_task

@router.patch("/{task_id}", response_model=Task)
async def update_task(
    task_id: str,
    task_update: dict,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    task = await crud.get_task_by_id(session, task_id, current_user.id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    updated_task = await crud.update_task(session, task, task_update)
    await manager.broadcast("refresh", current_user.id)
    return updated_task

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    task = await crud.get_task_by_id(session, task_id, current_user.id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    await crud.delete_task(session, task)
    await manager.broadcast("refresh", current_user.id)
    return None
