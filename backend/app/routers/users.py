from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
import os
import uuid
from typing import Optional
from pydantic import BaseModel

from ..database import get_session
from ..models import User, UserCreate, Settings
from ..auth import get_current_user, get_password_hash
from ..config import get_settings

router = APIRouter(tags=["users"])

class SettingsUpdate(BaseModel):
    theme: Optional[str] = None
    focus_duration: Optional[int] = None
    break_duration: Optional[int] = None
    sound_enabled: Optional[bool] = None

@router.post("/users", response_model=User, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    session: AsyncSession = Depends(get_session),
):
    settings = get_settings()
    if not settings.enable_local_auth:
        raise HTTPException(status_code=404, detail="Not found")
    statement = select(User).where(User.email == user_data.email)
    result = await session.execute(statement)
    existing = result.scalar_one_or_none()
    if existing:
        # SECURITY: Disallow unauthenticated password "bootstrap" unless explicitly enabled.
        allow_bootstrap = os.getenv("ALLOW_PASSWORD_BOOTSTRAP", "").lower() in ("1", "true", "yes")
        if user_data.password and not existing.hashed_password and allow_bootstrap:
            existing.hashed_password = get_password_hash(user_data.password)
            session.add(existing)
            await session.commit()
            await session.refresh(existing)
            return existing
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    new_user = User(
        id=str(uuid.uuid4()),
        email=user_data.email,
        name=user_data.name,
        hashed_password=get_password_hash(user_data.password)
        if user_data.password
        else None,
    )
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)
    return new_user

@router.get("/me")
async def get_me(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    statement = select(Settings).where(Settings.user_id == current_user.id)
    result = await session.execute(statement)
    settings_row = result.scalar_one_or_none()

    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "created_at": current_user.created_at,
        "settings": settings_row,
    }

@router.patch("/me/settings")
async def update_me_settings(
    update: SettingsUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    statement = select(Settings).where(Settings.user_id == current_user.id)
    result = await session.execute(statement)
    settings_row = result.scalar_one_or_none()

    if not settings_row:
        settings_row = Settings(id=str(uuid.uuid4()), user_id=current_user.id)

    payload = update.dict(exclude_unset=True)
    for k, v in payload.items():
        setattr(settings_row, k, v)

    session.add(settings_row)
    await session.commit()
    await session.refresh(settings_row)
    return settings_row
