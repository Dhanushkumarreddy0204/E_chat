import json
import inspect
import logging
import re
from pathlib import Path
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse, Response
from gridfs.errors import NoFile
from bson import ObjectId
from pymongo.errors import PyMongoError

from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection, get_database, get_gridfs, is_mongo_connected
from app.api.v1 import api_router
from app.core.security import decode_access_token
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
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
}

def parse_byte_range(range_header: str, file_size: int) -> Optional[tuple[int, int]]:
    match = re.fullmatch(r"bytes=([0-9]{0,20})-([0-9]{0,20})", range_header.strip())
    if not match or not file_size:
        return None
    first, last = match.groups()
    if first:
        start = int(first)
        end = min(int(last), file_size - 1) if last else file_size - 1
        return (start, end) if start <= end else None
    if last and int(last) > 0:
        return max(0, file_size - int(last)), file_size - 1
    return None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    try:
        yield
    finally:
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
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Accept-Ranges", "Content-Range"],
)

@app.exception_handler(RequestValidationError)
async def request_validation_error(request: Request, exc: RequestValidationError):
    # Validation errors can otherwise echo submitted passwords and other input.
    return JSONResponse(
        status_code=422,
        content={"detail": [{key: err[key] for key in ("loc", "msg", "type")} for err in exc.errors()]},
    )

@app.api_route("/uploads/{filename}", methods=["GET", "HEAD"], include_in_schema=False)
async def get_uploaded_media(filename: str, request: Request):
    if "\x00" in filename or "\\" in filename:
        raise HTTPException(status_code=404, detail="File not found")
    content_type = MEDIA_MIME_TYPES.get(Path(filename).suffix.lower(), "application/octet-stream")
    headers = {"X-Content-Type-Options": "nosniff"}
    if content_type == "application/octet-stream":
        headers["Content-Disposition"] = "attachment"

    fs = await get_gridfs()
    if fs is not None:
        try:
            grid_out = await fs.open_download_stream_by_name(filename)
        except NoFile:
            pass
        except PyMongoError:
            logger.warning("Could not open a GridFS download")
            raise HTTPException(status_code=503, detail="Media storage is unavailable") from None
        else:
            total_size = grid_out.length
            headers.update({
                "Accept-Ranges": "bytes",
                "Content-Length": str(total_size),
                "Cache-Control": "public, max-age=31536000, immutable",
            })
            # Ignore multi-range requests and ranges for HEAD.
            range_header = request.headers.get("range")
            start, length, status_code = 0, total_size, 200
            if request.method == "GET" and range_header and range_header.startswith("bytes=") and "," not in range_header:
                byte_range = parse_byte_range(range_header, total_size)
                if byte_range is None:
                    grid_out.close()
                    raise HTTPException(status_code=416, headers={"Content-Range": f"bytes */{total_size}"})
                start, end = byte_range
                length, status_code = end - start + 1, 206
                headers["Content-Range"] = f"bytes {start}-{end}/{total_size}"
                headers["Content-Length"] = str(length)

            if request.method == "HEAD":
                grid_out.close()
                return Response(media_type=content_type, headers=headers)

            async def stream_media():
                remaining = length
                try:
                    if start:
                        seek = grid_out.seek(start)
                        if inspect.isawaitable(seek):
                            await seek
                    while remaining:
                        chunk = await grid_out.read(min(remaining, 256 * 1024))
                        if not chunk:
                            break
                        remaining -= len(chunk)
                        yield chunk
                finally:
                    grid_out.close()

            return StreamingResponse(stream_media(), status_code=status_code, media_type=content_type, headers=headers)

    # Serve local files saved by earlier versions, confined to the upload directory.
    upload_dir = Path(settings.UPLOAD_DIR).resolve()
    local_path = (upload_dir / filename).resolve()
    if local_path.parent == upload_dir and local_path.is_file():
        return FileResponse(local_path, media_type=content_type, headers=headers)

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
    return JSONResponse(status_code=200 if db_ok else 503, content={
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
        "service": settings.PROJECT_NAME,
        "version": "1.0.0"
    })

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    origin = websocket.headers.get("origin")
    same_origin = f"{websocket.url.scheme.replace('ws', 'http', 1)}://{websocket.url.netloc}"
    if origin and origin != same_origin and origin not in settings.BACKEND_CORS_ORIGINS:
        await websocket.close(code=1008)
        return

    protocols = websocket.scope.get("subprotocols", [])
    payload = decode_access_token(protocols[1]) if len(protocols) == 2 and protocols[0] == "echat" else None
    user_id = payload.get("sub") if payload else None
    db = await get_database()
    if not ObjectId.is_valid(user_id) or not await db.users.find_one({"_id": ObjectId(user_id)}, {"_id": 1}):
        await websocket.close(code=1008)
        return

    await ws_manager.connect(websocket, user_id)
    try:
        while True:
            raw_data = await websocket.receive_text()
            try:
                msg = json.loads(raw_data)
            except json.JSONDecodeError:
                continue
            if not isinstance(msg, dict):
                continue

            event_type = msg.get("type")
            if event_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
            elif event_type in ("typing_start", "typing_stop"):
                data = msg.get("data")
                conv_id = data.get("conversation_id") if isinstance(data, dict) else None
                if not ObjectId.is_valid(conv_id):
                    continue
                conversation = await db.conversations.find_one(
                    {"_id": ObjectId(conv_id), "participants": user_id}, {"participants": 1}
                )
                if conversation:
                    await ws_manager.send_to_users(
                        {
                            "type": "user_typing",
                            "data": {
                                "user_id": user_id,
                                "conversation_id": conv_id,
                                "is_typing": event_type == "typing_start",
                            },
                        },
                        user_ids=[uid for uid in conversation["participants"] if uid != user_id],
                    )
    except WebSocketDisconnect:
        pass
    finally:
        await ws_manager.disconnect(websocket, user_id)
