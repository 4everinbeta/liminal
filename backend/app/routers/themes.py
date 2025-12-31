from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from typing import List, Optional
import uuid
from pydantic import BaseModel

from ..database import get_session
from ..models import User, Theme, ThemeCreate, Initiative, InitiativeCreate, Priority
from ..auth import get_current_user

router = APIRouter(tags=["themes"])

class ThemeUpdate(BaseModel):
    title: Optional[str] = None
    color: Optional[str] = None
    priority: Optional[Priority] = None
    order: Optional[int] = None

@router.post("/themes", response_model=Theme)
async def create_theme(
    theme_data: ThemeCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    new_theme = Theme(
        id=str(uuid.uuid4()),
        title=theme_data.title,
        color=theme_data.color or "#4F46E5",
        user_id=current_user.id,
        order=theme_data.order,
    )
    session.add(new_theme)
    await session.commit()
    await session.refresh(new_theme)
    return new_theme

@router.get("/themes", response_model=List[Theme])
async def get_themes(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    statement = select(Theme).where(Theme.user_id == current_user.id).order_by(Theme.order)
    result = await session.execute(statement)
    return result.scalars().all()

@router.patch("/themes/{theme_id}", response_model=Theme)
async def update_theme(
    theme_id: str,
    theme_update: ThemeUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    statement = select(Theme).where(Theme.id == theme_id, Theme.user_id == current_user.id)
    result = await session.execute(statement)
    theme = result.scalar_one_or_none()
    
    if not theme:
        raise HTTPException(status_code=404, detail="Theme not found")
        
    update_data = theme_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(theme, key, value)
        
    session.add(theme)
    await session.commit()
    await session.refresh(theme)
    return theme

@router.delete("/themes/{theme_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_theme(
    theme_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    statement = select(Theme).where(Theme.id == theme_id, Theme.user_id == current_user.id)
    result = await session.execute(statement)
    theme = result.scalar_one_or_none()
    
    if not theme:
        raise HTTPException(status_code=404, detail="Theme not found")
        
    await session.delete(theme)
    await session.commit()
    return None

@router.post("/initiatives", response_model=Initiative)
async def create_initiative(
    init_data: InitiativeCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    new_init = Initiative(
        id=str(uuid.uuid4()),
        title=init_data.title,
        description=init_data.description,
        status="active",
        theme_id=init_data.theme_id,
        user_id=current_user.id,
    )
    session.add(new_init)
    await session.commit()
    await session.refresh(new_init)
    return new_init

@router.get("/initiatives", response_model=List[Initiative])
async def get_initiatives(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    statement = select(Initiative).where(Initiative.user_id == current_user.id)
    result = await session.execute(statement)
    return result.scalars().all()
