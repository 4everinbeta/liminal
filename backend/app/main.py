from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from .database import init_db
from .routers import auth, users, tasks, themes, llm

app = FastAPI(
    title="Liminal API",
    description="Productivity API built with FastAPI",
    version="1.2.0",
)

# CORS
origins_env = os.getenv("CORS_ORIGINS", "").strip()
origins = (
    [o.strip() for o in origins_env.split(",") if o.strip()]
    if origins_env
    else [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://liminal-frontend-production.up.railway.app",
    ]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    if os.getenv("DEBUG_STARTUP", "").lower() in ("1", "true", "yes"):
        print(f"DEBUG: Allowed Origins: {origins}")
    await init_db()


@app.get("/")
async def root():
    return {"message": "Liminal API v1.2 Executive Mode 🚀"}

# Include Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(tasks.router)
app.include_router(themes.router)
app.include_router(llm.router)