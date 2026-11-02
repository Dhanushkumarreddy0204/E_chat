import os
import json
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from jose import jwt, JWTError

from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection, db_manager
from app.api.v1 import api_router
from app.websockets.manager import ws_manager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    yield
    # Shutdown
    await close_mongo_connection()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static uploads
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include API v1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "EChat Backend API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    # Authenticate via JWT token query param
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001, reason="Invalid token")
            return
    except JWTError:
        await websocket.close(code=4001, reason="Authentication failed")
        return

    await ws_manager.connect(websocket, user_id)
    try:
        while True:
            raw_data = await websocket.receive_text()
            try:
                msg = json.loads(raw_data)
                event_type = msg.get("type")
                data = msg.get("data", {})

                if event_type == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
                
                elif event_type == "typing_start":
                    conv_id = data.get("conversation_id")
                    recipient_ids = data.get("recipient_ids", [])
                    await ws_manager.send_to_users(
                        {
                            "type": "user_typing",
                            "data": {
                                "user_id": user_id,
                                "conversation_id": conv_id,
                                "is_typing": True
                            }
                        },
                        user_ids=[uid for uid in recipient_ids if uid != user_id]
                    )

                elif event_type == "typing_stop":
                    conv_id = data.get("conversation_id")
                    recipient_ids = data.get("recipient_ids", [])
                    await ws_manager.send_to_users(
                        {
                            "type": "user_typing",
                            "data": {
                                "user_id": user_id,
                                "conversation_id": conv_id,
                                "is_typing": False
                            }
                        },
                        user_ids=[uid for uid in recipient_ids if uid != user_id]
                    )

                elif event_type == "join_room":
                    conv_id = data.get("conversation_id")
                    if conv_id:
                        ws_manager.join_conversation(conv_id, user_id)

                elif event_type == "leave_room":
                    conv_id = data.get("conversation_id")
                    if conv_id:
                        ws_manager.leave_conversation(conv_id, user_id)

            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket, user_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await ws_manager.disconnect(websocket, user_id)
