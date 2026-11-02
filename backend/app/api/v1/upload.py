import os
import uuid
import mimetypes
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from motor.motor_asyncio import AsyncIOMotorGridFSBucket

from app.core.config import settings
from app.core.database import get_gridfs
from app.api.deps import get_current_user
from app.schemas.user import UserOut

router = APIRouter()

ALLOWED_EXTENSIONS = {
    "image": [".jpg", ".jpeg", ".png", ".webp", ".gif"],
    "video": [".mp4", ".mov", ".webm", ".m4v"],
    "audio": [".mp3", ".wav", ".ogg", ".m4a"],
    "file": [".pdf", ".zip", ".doc", ".docx", ".txt"]
}

@router.post("/file")
async def upload_file(
    file: UploadFile = File(...),
    current_user: UserOut = Depends(get_current_user),
    fs: AsyncIOMotorGridFSBucket = Depends(get_gridfs)
):
    file_ext = os.path.splitext(file.filename or "")[1].lower()
    
    # Determine type
    media_type = "file"
    for cat, exts in ALLOWED_EXTENSIONS.items():
        if file_ext in exts:
            media_type = cat
            break

    # Generate unique filename
    unique_filename = f"{uuid.uuid4().hex}{file_ext}"
    content_type = file.content_type or mimetypes.guess_type(file.filename or "")[0] or "application/octet-stream"

    file_size = 0
    if fs is not None:
        grid_in = fs.open_upload_stream(
            unique_filename,
            metadata={
                "contentType": content_type,
                "filename": file.filename,
                "media_type": media_type,
                "uploader_id": str(current_user.id)
            }
        )
        try:
            while chunk := await file.read(1024 * 1024):
                await grid_in.write(chunk)
                file_size += len(chunk)
            await grid_in.close()
        except Exception as e:
            try:
                grid_in.abort()
            except Exception:
                pass
            raise HTTPException(status_code=500, detail=f"Failed to upload media to MongoDB: {str(e)}")
        finally:
            await file.close()
    else:
        # Fallback to local disk if DB/GridFS is unavailable (e.g. offline unit testing)
        upload_dir = settings.UPLOAD_DIR
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, unique_filename)
        try:
            with open(file_path, "wb") as buffer:
                while chunk := await file.read(1024 * 1024):
                    buffer.write(chunk)
                    file_size += len(chunk)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")
        finally:
            await file.close()

    url = f"{settings.BACKEND_URL}/uploads/{unique_filename}"
    
    return {
        "url": url,
        "filename": file.filename,
        "media_type": media_type,
        "size": file_size
    }
