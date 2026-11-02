import json
import logging
from typing import Dict, Set, List, Any, Optional
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Maps user_id -> Set of active WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Maps conversation_id -> Set of user_ids currently focused/viewing that chat
        self.conversation_rooms: Dict[str, Set[str]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
            # Broadcast user online status
            await self.broadcast_user_status(user_id, is_online=True)
        
        self.active_connections[user_id].add(websocket)
        logger.info(f"User {user_id} connected. Total active sessions: {len(self.active_connections[user_id])}")

    async def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                # Broadcast user offline status
                await self.broadcast_user_status(user_id, is_online=False)
        
        # Clean up conversation rooms
        for conv_id, users in list(self.conversation_rooms.items()):
            users.discard(user_id)
            if not users:
                self.conversation_rooms.pop(conv_id, None)

        logger.info(f"User {user_id} disconnected.")

    def is_user_online(self, user_id: str) -> bool:
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0

    def get_online_users(self) -> List[str]:
        return list(self.active_connections.keys())

    async def send_personal_message(self, message: Dict[str, Any], user_id: str):
        """Send message to all active sockets of a specific user."""
        if user_id in self.active_connections:
            dead_sockets = set()
            payload = json.dumps(message, default=str)
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(payload)
                except Exception as e:
                    logger.error(f"Error sending message to user {user_id}: {e}")
                    dead_sockets.add(connection)
            
            for dead in dead_sockets:
                self.active_connections[user_id].discard(dead)

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
        await self.broadcast_all(payload)

    async def broadcast_all(self, message: Dict[str, Any]):
        """Broadcast event to every connected client across the system."""
        payload = json.dumps(message, default=str)
        for user_id, sockets in list(self.active_connections.items()):
            dead_sockets = set()
            for connection in sockets:
                try:
                    await connection.send_text(payload)
                except Exception:
                    dead_sockets.add(connection)
            for dead in dead_sockets:
                sockets.discard(dead)

    def join_conversation(self, conversation_id: str, user_id: str):
        if conversation_id not in self.conversation_rooms:
            self.conversation_rooms[conversation_id] = set()
        self.conversation_rooms[conversation_id].add(user_id)

    def leave_conversation(self, conversation_id: str, user_id: str):
        if conversation_id in self.conversation_rooms:
            self.conversation_rooms[conversation_id].discard(user_id)

ws_manager = ConnectionManager()
