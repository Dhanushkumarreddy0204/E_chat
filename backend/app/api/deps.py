from typing import Optional
from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.core.security import decode_access_token
from app.schemas.user import AccountOut

bearer_scheme = HTTPBearer(auto_error=False)

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
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Optional[AccountOut]:
    payload = decode_access_token(credentials.credentials) if credentials else None
    user_id = payload.get("sub") if payload else None
    if not ObjectId.is_valid(user_id):
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
    return AccountOut(**user_dict)

async def get_current_user(
    user: Optional[AccountOut] = Depends(get_current_user_optional),
) -> AccountOut:
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
