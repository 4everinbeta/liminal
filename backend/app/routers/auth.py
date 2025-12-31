from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
import os
import uuid

from ..database import get_session
from ..models import User, Token
from ..auth import (
    authenticate_basic_user,
    create_access_token,
)
from ..config import get_settings

try:
    from google.oauth2 import id_token as google_id_token
    from google.auth.transport import requests as google_requests
except ImportError:
    google_id_token = None
    google_requests = None

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=Token)
async def login_basic(user: User = Depends(authenticate_basic_user)):
    settings = get_settings()
    if not settings.enable_local_auth:
        raise HTTPException(status_code=404, detail="Not found")

    access_token = create_access_token(data={"sub": user.id, "iss": "local"})
    return Token(access_token=access_token)

@router.post("/google", response_model=Token)
async def login_google(id_token: str, session: AsyncSession = Depends(get_session)):
    settings = get_settings()
    if os.getenv("ENABLE_GOOGLE_TOKEN_LOGIN", "").lower() not in ("1", "true", "yes"):
        raise HTTPException(status_code=404, detail="Not found")
    if not google_id_token or not google_requests:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OIDC dependencies not installed",
        )

    try:
        idinfo = google_id_token.verify_oauth2_token(
            id_token,
            google_requests.Request(),
            settings.google_client_id or None,
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google ID token",
        )

    email = idinfo.get("email")
    sub = idinfo.get("sub")
    if not email or not sub:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google token missing required claims",
        )

    statement = select(User).where(User.email == email)
    result = await session.execute(statement)
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            id=str(uuid.uuid4()),
            email=email,
            google_sub=sub,
            name=idinfo.get("name"),
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

    access_token = create_access_token(data={"sub": user.id})
    return Token(access_token=access_token)
