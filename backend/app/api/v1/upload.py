import os
import uuid
import shutil
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from app.core.config import settings
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
    current_user: UserOut = Depends(get_current_user)
):
    upload_dir = settings.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)

    file_ext = os.path.splitext(file.filename or "")[1].lower()
    
    # Determine type
    media_type = "file"
    for cat, exts in ALLOWED_EXTENSIONS.items():
        if file_ext in exts:
            media_type = cat
            break

    # Generate unique filename
    unique_filename = f"{uuid.uuid4().hex}{file_ext}"
    file_path = os.path.join(upload_dir, unique_filename)

    try:
        # Standard async streaming chunk write with fallback
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        file_size = os.path.getsize(file_path)
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
