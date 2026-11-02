import os
import json
import logging
import mimetypes
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from gridfs.errors import NoFile
from jose import jwt, JWTError

from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection, db_manager, get_gridfs
from app.api.v1 import api_router
from app.websockets.manager import ws_manager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
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

# Serve uploaded media directly from MongoDB GridFS (with disk fallback for backward compatibility)
@app.get("/uploads/{filename:path}")
async def get_uploaded_media(filename: str):
    # 1. Fetch and stream from MongoDB GridFS
    fs = await get_gridfs()
    if fs is not None:
        try:
            grid_out = await fs.open_download_stream_by_name(filename)
            content_type = None
            if grid_out.metadata:
                content_type = grid_out.metadata.get("contentType")
            if not content_type:
                content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"

            async def file_streamer():
                try:
                    while chunk := await grid_out.readchunk():
                        yield chunk
                finally:
                    grid_out.close()

            return StreamingResponse(
                file_streamer(),
                media_type=content_type,
                headers={
                    "Content-Length": str(grid_out.length),
                    "Cache-Control": "public, max-age=31536000, immutable",
                    "Content-Disposition": f'inline; filename="{grid_out.filename or filename}"'
                }
            )
        except NoFile:
            pass
        except Exception as e:
            logger.error(f"Error streaming {filename} from GridFS: {e}")

    # 2. Fallback to local disk if file exists on disk
    local_path = os.path.join(settings.UPLOAD_DIR, filename)
    if os.path.isfile(local_path):
        return FileResponse(local_path)

    raise HTTPException(status_code=404, detail="File not found")

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
