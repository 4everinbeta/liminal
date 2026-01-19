from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import httpx

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
    
    history = await crud.get_chat_history(session, session_id)
    # Filter out internal state messages
    return [msg for msg in history if not (msg.role == "system" and msg.content.startswith("SK_STATE:"))]

@router.delete("/history/{session_id}", status_code=204)
async def delete_chat_history(
    session_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    chat_session = await crud.get_chat_session(session, session_id, current_user.id)
    if not chat_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    await crud.clear_chat_history(session, session_id)
    return None

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
        return ChatResponse(
            content=result["content"], 
            session_id=result["session_id"],
            pending_confirmation=result.get("pending_confirmation"),
            confirmation_options=result.get("confirmation_options")
        )
    except ValueError as exc:
        # Configuration errors (missing env vars, invalid settings)
        print(f"Agent Configuration Error: {exc}")
        raise HTTPException(status_code=500, detail=f"Agent configuration error: {str(exc)}") from exc
    except (httpx.ConnectError, httpx.ReadTimeout, httpx.WriteTimeout) as exc:
        print(f"LLM Connection Error: {exc}")
        raise HTTPException(status_code=503, detail=f"Could not connect to LLM service: {str(exc)}") from exc
    except Exception as exc:
        # Log server-side with full traceback
        import traceback
        import openai
        
        # Check for OpenAI connection errors (since we can't easily import them at top level without dependency check)
        if isinstance(exc, openai.APIConnectionError):
             print(f"OpenAI/LLM Connection Error: {exc}")
             raise HTTPException(status_code=503, detail=f"Could not connect to LLM provider: {str(exc)}") from exc

        # Check for Semantic Kernel wrapped errors
        try:
            # Try to import ServiceResponseException from likely locations (depends on SK version)
            try:
                from semantic_kernel.exceptions import ServiceResponseException
            except ImportError:
                from semantic_kernel.exceptions.service_exceptions import ServiceResponseException

            if isinstance(exc, ServiceResponseException):
                 print(f"Semantic Kernel Service Error: {exc}")
                 # Check if inner exception is connection error
                 if hasattr(exc, 'inner_exception') and isinstance(exc.inner_exception, openai.APIConnectionError):
                      raise HTTPException(status_code=503, detail=f"Could not connect to LLM provider (SK): {str(exc.inner_exception)}") from exc
        except ImportError:
            pass
        except Exception:
            # Fallback if SK inspection fails
            pass

        print(f"Agent Processing Error: {exc}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Agent processing failed: {str(exc)}") from exc
