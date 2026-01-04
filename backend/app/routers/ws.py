from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from ..websockets import manager
from ..auth import get_current_user, oauth2_scheme
from ..database import get_session
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError, jwt
from ..config import get_settings
from .. import auth

router = APIRouter()

async def get_user_from_token(token: str, session: AsyncSession) -> str:
    """
    Manually validate token for WebSocket since middleware/Depends might fail 
    differently in WS context or we need query param extraction.
    """
    settings = get_settings()
    try:
        # We try strict local validation first for speed
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload.get("sub")
    except JWTError:
        # If local fails, try OIDC decode (but that's async and complex here)
        # For MVP, let's assume valid JWT structure or call auth._decode_oidc_token
        # But _decode_oidc_token is async.
        try:
            payload = await auth._decode_oidc_token(token)
            return payload.get("sub")
        except Exception:
            return None

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str):
    # Note: We use a raw `token` query param for simplicity.
    # In prod, consider HTTP-only cookies or ticket-based auth for WS.
    
    # We need a session to verify user if needed, but get_user_from_token logic 
    # handles JWT decoding. We'll skip DB check for pure speed unless token is invalid.
    
    user_id = await get_user_from_token(token, None) # Session is None for now as we just decode
    
    if not user_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(websocket, user_id)
    try:
        while True:
            # Keep connection alive and listen for client pings if necessary
            data = await websocket.receive_text()
            # We can handle client messages here (e.g. "ping")
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
