from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..models import User, ChatRequest, ChatResponse
from ..auth import get_current_user
from ..agents import AgentService

router = APIRouter(prefix="/llm", tags=["llm"])

@router.post("/chat", response_model=ChatResponse)
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
        # Log server-side; avoid leaking internals to clients.
        print(f"Agent Processing Error: {exc}")
        raise HTTPException(status_code=500, detail="Agent processing failed") from exc
