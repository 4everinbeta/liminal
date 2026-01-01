from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from typing import List
from ..models import User, ChatRequest, ChatResponse, ChatMessage
from ..auth import get_current_user
from ..agents import AgentService
from .. import crud

router = APIRouter(prefix="/llm", tags=["llm"])

@router.get("/history/{session_id}", response_model=List[ChatMessage])
async def get_chat_history(
    session_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    # Verify ownership? crud.get_chat_session checks user_id
    chat_session = await crud.get_chat_session(session, session_id, current_user.id)
    if not chat_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return await crud.get_chat_history(session, session_id)

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
        result = await agent.process_request(messages, session_id=payload.session_id)
        return ChatResponse(content=result["content"], session_id=result["session_id"])
    except Exception as exc:
        # Log server-side; avoid leaking internals to clients.
        print(f"Agent Processing Error: {exc}")
        raise HTTPException(status_code=500, detail="Agent processing failed") from exc
