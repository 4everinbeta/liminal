from datetime import datetime, timedelta
import json
import time
from typing import Optional, Any, Dict
import uuid

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, HTTPBasic, HTTPBasicCredentials
from jose import JWTError, jwt, jwk
from jose.utils import base64url_decode
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from .config import get_settings
from .database import get_session
from .models import User, TokenData, Settings as UserSettings


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
basic_scheme = HTTPBasic()

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

_JWKS_CACHE: Dict[str, Any] = {"ts": 0.0, "jwks": None, "jwks_url": None}
_JWKS_TTL_SECONDS = 3600


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_password_reset_token(email: str) -> str:
    settings = get_settings()
    expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode = {"sub": email, "type": "reset", "exp": expire}
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt

def verify_password_reset_token(token: str) -> Optional[str]:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        if payload.get("type") != "reset":
            return None
        return payload.get("sub")
    except JWTError:
        return None

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Local/dev JWTs only (ENABLE_LOCAL_AUTH=1)."""
    settings = get_settings()
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta
        if expires_delta is not None
        else timedelta(minutes=settings.access_token_expires_minutes)
    )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


async def _get_oidc_jwks(settings) -> dict:
    if not settings.oidc_issuer and not settings.oidc_jwks_url:
        raise JWTError("OIDC not configured")

    now = time.time()
    if _JWKS_CACHE["jwks"] and now - _JWKS_CACHE["ts"] < _JWKS_TTL_SECONDS:
        return _JWKS_CACHE["jwks"]

    jwks_url = settings.oidc_jwks_url
    if not jwks_url:
        well_known = settings.oidc_issuer.rstrip("/") + "/.well-known/openid-configuration"
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(well_known)
            r.raise_for_status()
            jwks_url = r.json().get("jwks_uri")

    if not jwks_url:
        raise JWTError("OIDC JWKS URL not available")

    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(jwks_url)
        r.raise_for_status()
        jwks = r.json()

    _JWKS_CACHE.update({"ts": now, "jwks": jwks, "jwks_url": jwks_url})
    return jwks


def _select_jwk(jwks: dict, kid: Optional[str]) -> Optional[dict]:
    keys = jwks.get("keys", [])
    if not kid:
        return keys[0] if keys else None
    for k in keys:
        if k.get("kid") == kid:
            return k
    return None


def _audience_matches(aud_claim: Any, expected: str) -> bool:
    if not expected:
        return True
    if aud_claim is None:
        return False
    if isinstance(aud_claim, str):
        return aud_claim == expected
    if isinstance(aud_claim, list):
        return expected in aud_claim
    return False


async def _decode_oidc_token(token: str) -> dict:
    settings = get_settings()
    jwks = await _get_oidc_jwks(settings)

    header = jwt.get_unverified_header(token)
    kid = header.get("kid")
    alg = header.get("alg") or "RS256"

    key_dict = _select_jwk(jwks, kid)
    if not key_dict:
        # refresh once
        _JWKS_CACHE.update({"ts": 0.0, "jwks": None})
        jwks = await _get_oidc_jwks(settings)
        key_dict = _select_jwk(jwks, kid)

    if not key_dict:
        raise JWTError("No matching JWK")

    key = jwk.construct(key_dict)
    message, encoded_sig = token.rsplit(".", 1)
    decoded_sig = base64url_decode(encoded_sig.encode())
    if not key.verify(message.encode(), decoded_sig):
        raise JWTError("Signature verification failed")

    pem = key.to_pem().decode()
    audience = settings.oidc_audience or None
    issuer = settings.oidc_issuer or None

    try:
        return jwt.decode(token, pem, algorithms=[alg], audience=audience, issuer=issuer)
    except JWTError:
        # Keycloak often places the client_id in `azp` and uses other values in `aud`.
        # If an explicit audience is configured, accept tokens where aud OR azp matches.
        if not audience:
            raise

        payload = jwt.decode(
            token,
            pem,
            algorithms=[alg],
            issuer=issuer,
            options={"verify_aud": False},
        )

        azp = payload.get("azp")
        if not _audience_matches(payload.get("aud"), audience) and azp != audience:
            raise

        return payload


async def _get_local_user(user_id: str, session: AsyncSession) -> Optional[User]:
    statement = select(User).where(User.id == user_id)
    result = await session.execute(statement)
    return result.scalar_one_or_none()


async def _get_oidc_user(
    payload: dict,
    session: AsyncSession,
    settings: Any
) -> User:
    user_id = payload.get("sub")
    iss = payload.get("iss") or settings.oidc_issuer
    email = payload.get(settings.oidc_email_claim) or payload.get("email")
    name = payload.get(settings.oidc_name_claim) or payload.get("name")

    if not user_id or not iss:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing sub or iss claims"
        )

    # 1. Try finding by stable identity (sub + issuer)
    statement = select(User).where(User.google_sub == user_id, User.oidc_issuer == iss)
    result = await session.execute(statement)
    user = result.scalar_one_or_none()

    if user:
        return user

    # 2. Link by email on first login if allowed
    if email:
        statement = select(User).where(User.email == email)
        result = await session.execute(statement)
        user = result.scalar_one_or_none()
        if user:
            # Auto-link existing user
            user.google_sub = user_id
            user.oidc_issuer = iss
            session.add(user)
            await session.commit()
            await session.refresh(user)
            return user

    # 3. Create new user (JIT Provisioning)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="OIDC token missing email claim for new user creation",
        )

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

    # Initialize settings for new user
    settings_row = UserSettings(
        id=str(uuid.uuid4()),
        user_id=new_user.id,
    )
    session.add(settings_row)
    await session.commit()

    return new_user


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_session),
) -> User:
    settings = get_settings()
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # 1. Peek at claims to determine token type (Local vs OIDC)
    try:
        unverified_claims = jwt.get_unverified_claims(token)
    except JWTError:
        raise credentials_exception

    iss = unverified_claims.get("iss")
    
    # 2. Local Auth Path
    # Local tokens either have no 'iss' (legacy) or iss='liminal-local' (future)
    is_local = (
        settings.enable_local_auth 
        and (iss is None or iss == "liminal-local" or iss == "local")
    )

    if is_local:
        try:
            payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
            user_id: str = payload.get("sub")
            if user_id is None:
                raise credentials_exception
        except JWTError:
            raise credentials_exception
            
        user = await _get_local_user(user_id, session)
        if user is None:
            raise credentials_exception
        return user

    # 3. OIDC Path
    try:
        payload = await _decode_oidc_token(token)
    except Exception as e:
        # Log error here in a real app
        raise credentials_exception

    return await _get_oidc_user(payload, session, settings)


async def authenticate_basic_user(
    credentials: HTTPBasicCredentials = Depends(basic_scheme),
    session: AsyncSession = Depends(get_session),
) -> User:
    settings = get_settings()
    if not settings.enable_local_auth:
        raise HTTPException(status_code=404, detail="Not found")

    statement = select(User).where(User.email == credentials.username)
    result = await session.execute(statement)
    user = result.scalar_one_or_none()
    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Basic"},
        )

    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Basic"},
        )

    return user

