from typing import List, Dict
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Map user_id to a list of their active WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def broadcast(self, message: str, user_id: str):
        """Send a message to all connections for a specific user."""
        if user_id in self.active_connections:
            # Iterate over a copy to avoid modification issues if disconnect happens concurrently
            for connection in self.active_connections[user_id][:]:
                try:
                    await connection.send_text(message)
                except Exception:
                    # Clean up dead connection if send fails
                    self.disconnect(connection, user_id)

manager = ConnectionManager()
