import os
import json
import logging
import inspect
import mimetypes
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from gridfs.errors import NoFile
from jose import jwt, JWTError

from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection, db_manager, get_gridfs, is_mongo_connected
from app.api.v1 import api_router
from app.websockets.manager import ws_manager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MEDIA_MIME_TYPES = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".m4v": "video/x-m4v",
    ".ogv": "video/ogg",
    ".avi": "video/x-msvideo",
    ".mkv": "video/x-matroska",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
}

def resolve_content_type(filename: str, metadata_type: Optional[str] = None) -> str:
    if metadata_type and metadata_type != "application/octet-stream":
        return metadata_type
    ext = os.path.splitext(filename.lower())[1]
    if ext in MEDIA_MIME_TYPES:
        return MEDIA_MIME_TYPES[ext]
    guessed = mimetypes.guess_type(filename)[0]
    return guessed or "application/octet-stream"

def parse_byte_range(range_header: Optional[str], file_size: int) -> Optional[tuple[int, int]]:
    if not range_header or not range_header.startswith("bytes="):
        return None
    try:
        raw = range_header.replace("bytes=", "").strip()
        parts = raw.split("-")
        start_str = parts[0].strip()
        end_str = parts[1].strip() if len(parts) > 1 else ""

        if start_str and end_str:
            start = int(start_str)
            end = int(end_str)
        elif start_str:
            start = int(start_str)
            end = file_size - 1
        elif end_str:
            start = file_size - int(end_str)
            end = file_size - 1
        else:
            return None

        if start < 0 or start >= file_size or end < start:
            return None
        end = min(end, file_size - 1)
        return start, end
    except Exception:
        return None

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
# Supports HTTP 206 Partial Content and Range headers essential for video seeking/playback in modern browsers.
@app.get("/uploads/{filename:path}")
async def get_uploaded_media(filename: str, request: Request):
    range_header = request.headers.get("range")

    # 1. Fetch and stream from MongoDB GridFS
    fs = await get_gridfs()
    if fs is not None:
        try:
            grid_out = await fs.open_download_stream_by_name(filename)
            total_size = grid_out.length
            content_type = resolve_content_type(
                filename,
                grid_out.metadata.get("contentType") if grid_out.metadata else None
            )
            byte_range = parse_byte_range(range_header, total_size)

            if byte_range:
                start, end = byte_range
                content_length = end - start + 1
                seek_res = grid_out.seek(start)
                if inspect.isawaitable(seek_res):
                    await seek_res

                async def range_streamer():
                    bytes_remaining = content_length
                    try:
                        while bytes_remaining > 0:
                            chunk_size = min(bytes_remaining, 256 * 1024)
                            chunk = await grid_out.read(chunk_size)
                            if not chunk:
                                break
                            bytes_remaining -= len(chunk)
                            yield chunk
                    finally:
                        grid_out.close()

                return StreamingResponse(
                    range_streamer(),
                    status_code=206,
                    media_type=content_type,
                    headers={
                        "Content-Range": f"bytes {start}-{end}/{total_size}",
                        "Accept-Ranges": "bytes",
                        "Content-Length": str(content_length),
                        "Cache-Control": "public, max-age=31536000, immutable",
                        "Content-Disposition": f'inline; filename="{grid_out.filename or filename}"'
                    }
                )
            else:
                async def file_streamer():
                    try:
                        while chunk := await grid_out.readchunk():
                            yield chunk
                    finally:
                        grid_out.close()

                return StreamingResponse(
                    file_streamer(),
                    status_code=200,
                    media_type=content_type,
                    headers={
                        "Accept-Ranges": "bytes",
                        "Content-Length": str(total_size),
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
        total_size = os.path.getsize(local_path)
        content_type = resolve_content_type(filename)
        byte_range = parse_byte_range(range_header, total_size)

        if byte_range:
            start, end = byte_range
            content_length = end - start + 1

            def file_range_generator():
                with open(local_path, "rb") as f:
                    f.seek(start)
                    remaining = content_length
                    while remaining > 0:
                        chunk = f.read(min(remaining, 256 * 1024))
                        if not chunk:
                            break
                        remaining -= len(chunk)
                        yield chunk

            return StreamingResponse(
                file_range_generator(),
                status_code=206,
                media_type=content_type,
                headers={
                    "Content-Range": f"bytes {start}-{end}/{total_size}",
                    "Accept-Ranges": "bytes",
                    "Content-Length": str(content_length),
                    "Cache-Control": "public, max-age=31536000, immutable",
                    "Content-Disposition": f'inline; filename="{filename}"'
                }
            )

        return FileResponse(local_path, media_type=content_type, headers={"Accept-Ranges": "bytes"})

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

@app.get("/health")
async def health_check():
    db_ok = await is_mongo_connected()
    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
        "service": settings.PROJECT_NAME,
        "version": "1.0.0"
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
