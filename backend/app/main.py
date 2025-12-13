from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Literal
import uuid
import httpx
from pydantic import BaseModel

from . import crud
from .database import init_db, get_session
from .models import (
    Task,
    TaskCreate,
    TaskStatus,
    Priority,
    User,
    Theme,
    ThemeCreate,
    Initiative,
    InitiativeCreate,
    UserCreate,
    Token,
)
from .auth import (
    create_access_token,
    get_current_user,
    authenticate_basic_user,
    get_password_hash,
)
from .config import get_settings
from .agents import AgentService

try:
    from google.oauth2 import id_token as google_id_token
    from google.auth.transport import requests as google_requests
except ImportError:  # pragma: no cover - optional dependency for Google OIDC
    google_id_token = None
    google_requests = None


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    model: Optional[str] = None


class ChatResponse(BaseModel):
    content: str


app = FastAPI(
    title="Liminal API",
    description="Productivity API built with FastAPI",
    version="1.2.0",
)

# CORS
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    await init_db()


@app.get("/")
async def root():
    return {"message": "Liminal API v1.2 Executive Mode 🚀"}


# --- Auth ---

@app.post("/auth/login", response_model=Token)
async def login_basic(user: User = Depends(authenticate_basic_user)):
    access_token = create_access_token(data={"sub": user.id})
    return Token(access_token=access_token)


@app.post("/auth/google", response_model=Token)
async def login_google(id_token: str, session: AsyncSession = Depends(get_session)):
    settings = get_settings()
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


@app.post("/users", response_model=User, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    session: AsyncSession = Depends(get_session),
):
    statement = select(User).where(User.email == user_data.email)
    result = await session.execute(statement)
    existing = result.scalar_one_or_none()
    if existing:
        # Allow setting a password if the user exists without one (e.g., demo bootstrap)
        if user_data.password and not existing.hashed_password:
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


# --- Tasks ---

@app.post("/tasks", response_model=Task, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_data: TaskCreate,
    session: AsyncSession = Depends(get_session),
        current_user: User = Depends(get_current_user),
):
    return await crud.create_task(session, task_data, current_user.id)


@app.get("/tasks", response_model=List[Task])
async def get_tasks(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return await crud.get_tasks(session, current_user.id)


@app.patch("/tasks/{task_id}", response_model=Task)
async def update_task(
    task_id: str,
    task_update: dict,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    task = await crud.get_task_by_id(session, task_id, current_user.id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return await crud.update_task(session, task, task_update)


@app.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    task = await crud.get_task_by_id(session, task_id, current_user.id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    await crud.delete_task(session, task)
    return None


# --- Themes & Initiatives ---

@app.post("/themes", response_model=Theme)
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
    )
    session.add(new_theme)
    await session.commit()
    await session.refresh(new_theme)
    return new_theme


@app.get("/themes", response_model=List[Theme])
async def get_themes(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    statement = select(Theme).where(Theme.user_id == current_user.id)
    result = await session.execute(statement)
    return result.scalars().all()


@app.post("/initiatives", response_model=Initiative)
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


@app.get("/initiatives", response_model=List[Initiative])
async def get_initiatives(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    statement = select(Initiative).where(Initiative.user_id == current_user.id)
    result = await session.execute(statement)
    return result.scalars().all()


# --- LLM Proxy ---

@app.post("/llm/chat", response_model=ChatResponse)
async def chat_with_llm(
    payload: ChatRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Intelligent Agentic Chat.
    Routes requests to specialized agents (Task Manager, Q&A, Tracker).
    """
    agent = AgentService(session, current_user.id)
    messages = [m.dict() for m in payload.messages]
    
    try:
        content = await agent.process_request(messages)
        return ChatResponse(content=content)
    except Exception as exc:
        # Log the full error for debugging
        print(f"Agent Processing Error: {exc}")
        raise HTTPException(status_code=500, detail=f"Agent processing failed: {exc}") from exc