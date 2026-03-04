from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import asyncio
import traceback

from .database import init_db, async_session
from .routers import auth, users, tasks, themes, llm, ws
from .agents.monitor import TaskMonitor

app = FastAPI(
    title="Liminal API",
    description="Productivity API built with FastAPI",
    version="1.2.0",
)

# CORS
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://liminal-frontend-production.up.railway.app",
]

# Add env vars
cors_env = os.getenv("CORS_ORIGINS", "")
if cors_env:
    origins.extend([o.strip() for o in cors_env.split(",") if o.strip()])

frontend_url = os.getenv("NEXT_PUBLIC_FRONTEND_BASE_URL")
if frontend_url:
    url = frontend_url.strip()
    origins.append(url)
    if url.endswith("/"):
        origins.append(url[:-1])
    else:
        origins.append(url + "/")

# Deduplicate
origins = list(set(origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.up\.railway\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    try:
        response = await call_next(request)
        return response
    except Exception as exc:
        origin = request.headers.get("origin")
        # If the origin is in our allowed list, use it. Otherwise use the first one or '*'
        allow_origin = origin if origin in origins else (origins[0] if origins else "*")
        
        print(f"CRITICAL ERROR: {request.method} {request.url.path} - {str(exc)}")
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"detail": f"Internal Server Error: {str(exc)}", "traceback": traceback.format_exc()},
            headers={
                "Access-Control-Allow-Origin": allow_origin,
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            }
        )

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.2.0",
        "database": str(engine.url.render_as_string(hide_password=True))
    }

@app.on_event("startup")
async def on_startup():
    if os.getenv("DEBUG_STARTUP", "").lower() in ("1", "true", "yes"):
        print(f"DEBUG: Allowed Origins: {origins}")
    await init_db()
    
    # Start the monitor as a background task
    monitor = TaskMonitor(async_session)
    asyncio.create_task(monitor.start())


@app.get("/")
async def root():
    return {"message": "Liminal API v1.2 Executive Mode 🚀"}

# Include Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(tasks.router)
app.include_router(themes.router)
app.include_router(llm.router)
app.include_router(ws.router)