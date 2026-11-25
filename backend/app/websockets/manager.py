import json
import logging
from typing import Dict, Set, List, Any
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Maps user_id -> Set of active WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept(subprotocol="echat")
        sockets = self.active_connections.setdefault(user_id, set())
        first_connection = not sockets
        sockets.add(websocket)
        if first_connection:
            await self.broadcast_user_status(user_id, is_online=True)

    async def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                # Broadcast user offline status
                await self.broadcast_user_status(user_id, is_online=False)
        

    def is_user_online(self, user_id: str) -> bool:
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0

    def get_online_users(self) -> List[str]:
        return list(self.active_connections.keys())

    async def send_personal_message(self, message: Dict[str, Any], user_id: str):
        """Send message to all active sockets of a specific user."""
        payload = json.dumps(message, default=str)
        for connection in tuple(self.active_connections.get(user_id, ())):
            try:
                await connection.send_text(payload)
            except (OSError, RuntimeError, WebSocketDisconnect):
                logger.debug("Could not send to a closing WebSocket")

    async def send_to_users(self, message: Dict[str, Any], user_ids: List[str]):
        """Send message to multiple specific users."""
        for uid in user_ids:
            await self.send_personal_message(message, str(uid))

    async def broadcast_user_status(self, user_id: str, is_online: bool):
        """Notify all connected clients about user presence change."""
        payload = {
            "type": "presence_update",
            "data": {
                "user_id": user_id,
                "is_online": is_online
            }
        }
        await self.send_to_users(payload, [uid for uid in self.active_connections if uid != user_id])

ws_manager = ConnectionManager()
