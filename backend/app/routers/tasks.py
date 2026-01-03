from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from ..database import get_session
from ..models import Task, TaskCreate, User
from ..auth import get_current_user
from .. import crud
from ..websockets import manager

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

@router.get("", response_model=List[Task])
async def get_tasks(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return await crud.get_tasks(session, current_user.id)

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
