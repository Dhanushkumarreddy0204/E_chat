from typing import Optional
from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.database import get_database
from app.schemas.user import UserOut

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def serialize_mongo_doc(doc: dict) -> dict:
    """Helper to convert MongoDB _id to string id recursively."""
    if not doc:
        return doc
    doc_copy = doc.copy()
    if "_id" in doc_copy:
        doc_copy["id"] = str(doc_copy["_id"])
        del doc_copy["_id"]
    return doc_copy

async def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Optional[UserOut]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
    except JWTError:
        return None

    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if user is None:
        return None
    
    # Calculate counts
    followers_count = await db.followers.count_documents({"following_id": str(user["_id"])})
    following_count = await db.followers.count_documents({"follower_id": str(user["_id"])})
    posts_count = await db.posts.count_documents({"user_id": str(user["_id"])})
    
    user_dict = serialize_mongo_doc(user)
    user_dict["followers_count"] = followers_count
    user_dict["following_count"] = following_count
    user_dict["posts_count"] = posts_count
    return UserOut(**user_dict)

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> UserOut:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise credentials_exception

    if user is None:
        raise credentials_exception

    followers_count = await db.followers.count_documents({"following_id": str(user["_id"])})
    following_count = await db.followers.count_documents({"follower_id": str(user["_id"])})
    posts_count = await db.posts.count_documents({"user_id": str(user["_id"])})

    user_dict = serialize_mongo_doc(user)
    user_dict["followers_count"] = followers_count
    user_dict["following_count"] = following_count
    user_dict["posts_count"] = posts_count
    return UserOut(**user_dict)
