import base64
import secrets
from datetime import datetime, timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from ..auth import get_current_user
from ..config import get_settings
from ..database import get_session
from ..models import User

router = APIRouter(prefix="/spotify", tags=["spotify"])

SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize"
SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_API_URL = "https://api.spotify.com/v1"

SPOTIFY_SCOPES = " ".join([
    "user-read-private",
    "user-read-email",
    "user-read-currently-playing",
    "user-read-playback-state",
    "user-modify-playback-state",
    "playlist-read-private",
    "playlist-read-collaborative",
])


def _basic_auth_header(client_id: str, client_secret: str) -> str:
    credentials = f"{client_id}:{client_secret}"
    return "Basic " + base64.b64encode(credentials.encode()).decode()


async def _refresh_spotify_token(user: User, session: AsyncSession) -> str:
    """Exchange refresh token for a new access token and persist it."""
    settings = get_settings()
    if not settings.spotify_client_id or not settings.spotify_client_secret:
        raise HTTPException(status_code=503, detail="Spotify not configured")
    if not user.spotify_refresh_token:
        raise HTTPException(status_code=401, detail="Spotify not connected")

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            SPOTIFY_TOKEN_URL,
            headers={"Authorization": _basic_auth_header(settings.spotify_client_id, settings.spotify_client_secret)},
            data={"grant_type": "refresh_token", "refresh_token": user.spotify_refresh_token},
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to refresh Spotify token")

    data = resp.json()
    user.spotify_access_token = data["access_token"]
    user.spotify_token_expiry = datetime.utcnow() + timedelta(seconds=data.get("expires_in", 3600))
    # Spotify may issue a new refresh token — persist it if so
    if "refresh_token" in data:
        user.spotify_refresh_token = data["refresh_token"]

    session.add(user)
    await session.commit()
    return user.spotify_access_token


@router.get("/auth-url")
async def get_auth_url(current_user: User = Depends(get_current_user)):
    settings = get_settings()
    if not settings.spotify_client_id:
        raise HTTPException(status_code=503, detail="Spotify not configured")

    state = secrets.token_urlsafe(16)
    params = (
        f"?response_type=code"
        f"&client_id={settings.spotify_client_id}"
        f"&scope={SPOTIFY_SCOPES.replace(' ', '%20')}"
        f"&redirect_uri={settings.spotify_redirect_uri}"
        f"&state={state}"
    )
    return {"url": SPOTIFY_AUTH_URL + params, "state": state}


class SpotifyCallbackRequest(BaseModel):
    code: str


@router.post("/callback")
async def spotify_callback(
    payload: SpotifyCallbackRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    settings = get_settings()
    if not settings.spotify_client_id or not settings.spotify_client_secret:
        raise HTTPException(status_code=503, detail="Spotify not configured")

    # Exchange authorization code for tokens
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            SPOTIFY_TOKEN_URL,
            headers={"Authorization": _basic_auth_header(settings.spotify_client_id, settings.spotify_client_secret)},
            data={
                "grant_type": "authorization_code",
                "code": payload.code,
                "redirect_uri": settings.spotify_redirect_uri,
            },
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Spotify token exchange failed: {resp.text}")

    token_data = resp.json()
    access_token = token_data["access_token"]

    # Fetch Spotify user profile
    async with httpx.AsyncClient() as client:
        profile_resp = await client.get(
            f"{SPOTIFY_API_URL}/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )

    display_name = None
    if profile_resp.status_code == 200:
        profile = profile_resp.json()
        display_name = profile.get("display_name") or profile.get("email")

    # Persist tokens against the Liminal user
    result = await session.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one()
    user.spotify_access_token = access_token
    user.spotify_refresh_token = token_data.get("refresh_token")
    user.spotify_token_expiry = datetime.utcnow() + timedelta(seconds=token_data.get("expires_in", 3600))
    user.spotify_display_name = display_name
    session.add(user)
    await session.commit()

    return {"connected": True, "display_name": display_name}


@router.get("/status")
async def spotify_status(current_user: User = Depends(get_current_user)):
    return {
        "connected": bool(current_user.spotify_access_token),
        "display_name": current_user.spotify_display_name,
    }


@router.get("/token")
async def get_spotify_token(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if not current_user.spotify_access_token:
        raise HTTPException(status_code=404, detail="Spotify not connected")

    # Refresh if expiring within 5 minutes
    needs_refresh = (
        current_user.spotify_token_expiry is None
        or current_user.spotify_token_expiry <= datetime.utcnow() + timedelta(minutes=5)
    )
    token = (
        await _refresh_spotify_token(current_user, session)
        if needs_refresh
        else current_user.spotify_access_token
    )
    return {"access_token": token}


@router.delete("/disconnect")
async def spotify_disconnect(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one()
    user.spotify_access_token = None
    user.spotify_refresh_token = None
    user.spotify_token_expiry = None
    user.spotify_display_name = None
    session.add(user)
    await session.commit()
    return {"disconnected": True}
