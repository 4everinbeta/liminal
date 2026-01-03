from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
import os
import uuid

from ..database import get_session
from ..models import User, Token
from pydantic import BaseModel, EmailStr
from ..auth import (
    authenticate_basic_user,
    create_access_token,
    create_password_reset_token,
    verify_password_reset_token,
    get_password_hash,
    _decode_oidc_token,
)
from ..models import User, Token, Settings as UserSettings
from ..config import get_settings

try:
    from google.oauth2 import id_token as google_id_token
    from google.auth.transport import requests as google_requests
except ImportError:
    google_id_token = None
    google_requests = None

router = APIRouter(prefix="/auth", tags=["auth"])

class RegisterRequest(BaseModel):
    id_token: str

@router.post("/register", response_model=Token)
async def register_user(
    payload: RegisterRequest,
    session: AsyncSession = Depends(get_session),
):
    settings = get_settings()
    try:
        claims = await _decode_oidc_token(payload.id_token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

    user_id = claims.get("sub")
    email = claims.get("email")
    name = claims.get("name")
    iss = claims.get("iss") or settings.oidc_issuer

    if not email:
        raise HTTPException(status_code=400, detail="Token missing email")

    # Check existence
    statement = select(User).where(User.email == email)
    result = await session.execute(statement)
    existing = result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(status_code=400, detail="User already registered")

    # Create
    new_user = User(
        id=str(uuid.uuid4()),
        email=email,
        name=name,
        google_sub=user_id,
        oidc_issuer=iss,
    )
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)

    # Init settings
    settings_row = UserSettings(id=str(uuid.uuid4()), user_id=new_user.id)
    session.add(settings_row)
    await session.commit()

    # Return access token (though frontend likely uses the OIDC one, we conform to Token model)
    # Actually, we don't issue tokens for OIDC users, they use the OIDC token.
    # But for compatibility with `Token` response model...
    # We can just return the SAME token or a dummy one if we are purely OIDC.
    # But `login_google` returns `create_access_token`. 
    # Wait, `login_google` creates a LOCAL token?
    # Yes. `access_token = create_access_token(data={"sub": user.id})`.
    # So we should do the same.
    
    access_token = create_access_token(data={"sub": new_user.id})
    return Token(access_token=access_token)

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

@router.post("/forgot-password")
async def forgot_password(
    payload: PasswordResetRequest,
    session: AsyncSession = Depends(get_session),
):
    settings = get_settings()
    if not settings.enable_local_auth:
        raise HTTPException(status_code=404, detail="Not found")

    statement = select(User).where(User.email == payload.email)
    result = await session.execute(statement)
    user = result.scalar_one_or_none()

    if user:
        # Generate token
        token = create_password_reset_token(user.email)
        # Mock sending email
        print(f"==========================================")
        print(f"MOCK EMAIL TO: {user.email}")
        print(f"SUBJECT: Password Reset Request")
        print(f"LINK: http://localhost:3000/reset-password?token={token}")
        print(f"==========================================")
    
    # Always return 200 for security (prevent email enumeration)
    return {"message": "If the email exists, a reset link has been sent."}

@router.post("/reset-password")
async def reset_password(
    payload: PasswordResetConfirm,
    session: AsyncSession = Depends(get_session),
):
    settings = get_settings()
    if not settings.enable_local_auth:
        raise HTTPException(status_code=404, detail="Not found")

    email = verify_password_reset_token(payload.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    statement = select(User).where(User.email == email)
    result = await session.execute(statement)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = get_password_hash(payload.new_password)
    session.add(user)
    await session.commit()

    return {"message": "Password updated successfully"}

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
