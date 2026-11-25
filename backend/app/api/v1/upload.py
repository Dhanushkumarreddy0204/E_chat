import os
import re
import uuid
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from motor.motor_asyncio import AsyncIOMotorGridFSBucket

from app.core.database import get_gridfs
from app.api.deps import get_current_user
from app.schemas.user import UserOut

router = APIRouter()
MAX_UPLOAD_BYTES = 100 * 1024 * 1024

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
    if not re.fullmatch(r"\.[a-z0-9]{1,12}", file_ext):
        file_ext = ""
    
    # Determine type
    media_type = "file"
    for cat, exts in ALLOWED_EXTENSIONS.items():
        if file_ext in exts:
            media_type = cat
            break

    # Generate unique filename
    unique_filename = f"{uuid.uuid4().hex}{file_ext}"
    if fs is None:
        raise HTTPException(status_code=503, detail="Media storage is unavailable")
    if file.size == 0:
        raise HTTPException(status_code=400, detail="The uploaded file is empty")
    if file.size is not None and file.size > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Files must be 100 MiB or smaller")

    file_size = 0
    try:
        async with fs.open_upload_stream(
            unique_filename,
            metadata={
                "filename": file.filename,
                "media_type": media_type,
                "uploader_id": str(current_user.id)
            }
        ) as grid_in:
            while chunk := await file.read(1024 * 1024):
                file_size += len(chunk)
                if file_size > MAX_UPLOAD_BYTES:
                    raise HTTPException(status_code=413, detail="Files must be 100 MiB or smaller")
                await grid_in.write(chunk)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=503, detail="Could not store the uploaded file") from None
    
    return {
        "url": f"/uploads/{unique_filename}",
        "filename": file.filename,
        "media_type": media_type,
        "size": file_size
    }
