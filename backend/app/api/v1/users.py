from typing import List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime

from app.core.database import get_database
from app.api.deps import get_current_user, get_current_user_optional, serialize_mongo_doc
from app.schemas.user import UserOut, UserUpdate
from app.websockets.manager import ws_manager
from app.utils.notifications import create_and_send_notification

router = APIRouter()

async def populate_user_details(user_doc: dict, current_user_id: Optional[str], db: AsyncIOMotorDatabase) -> UserOut:
    user_id = str(user_doc["_id"])
    followers_count = await db.followers.count_documents({"following_id": user_id})
    following_count = await db.followers.count_documents({"follower_id": user_id})
    posts_count = await db.posts.count_documents({"user_id": user_id})
    
    is_following = False
    if current_user_id and current_user_id != user_id:
        existing = await db.followers.find_one({"follower_id": current_user_id, "following_id": user_id})
        is_following = bool(existing)
        
    user_dict = serialize_mongo_doc(user_doc)
    user_dict.pop("hashed_password", None)
    user_dict.pop("password_hash", None)
    user_dict.pop("password", None)
    user_dict["followers_count"] = followers_count
    user_dict["following_count"] = following_count
    user_dict["posts_count"] = posts_count
    user_dict["is_following"] = is_following
    user_dict["is_online"] = ws_manager.is_user_online(user_id)
    return UserOut(**user_dict)

@router.get("/search", response_model=List[UserOut])
async def search_users(
    q: str = Query(..., min_length=1),
    limit: int = 20,
    current_user: Optional[UserOut] = Depends(get_current_user_optional),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    current_id = current_user.id if current_user else None
    cursor = db.users.find({
        "$or": [
            {"username": {"$regex": q, "$options": "i"}},
            {"full_name": {"$regex": q, "$options": "i"}},
            {"bio": {"$regex": q, "$options": "i"}}
        ]
    }).limit(limit)

    users = []
    async for doc in cursor:
        user_out = await populate_user_details(doc, current_id, db)
        users.append(user_out)
    return users

@router.get("/suggestions", response_model=List[UserOut])
async def get_user_suggestions(
    limit: int = 10,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    # Find who the current user already follows
    following_cursor = db.followers.find({"follower_id": current_user.id})
    following_ids = [doc["following_id"] async for doc in following_cursor]
    following_ids.append(current_user.id)  # exclude self

    cursor = db.users.find({
        "_id": {"$nin": [ObjectId(uid) for uid in following_ids if ObjectId.is_valid(uid)]}
    }).limit(limit)

    suggestions = []
    async for doc in cursor:
        user_out = await populate_user_details(doc, current_user.id, db)
        suggestions.append(user_out)
    return suggestions

@router.get("/{user_id}/followers", response_model=List[UserOut])
async def get_followers(
    user_id: str,
    limit: int = 50,
    current_user: Optional[UserOut] = Depends(get_current_user_optional),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    cursor = db.followers.find({"following_id": user_id}).limit(limit)
    follower_ids = [ObjectId(doc["follower_id"]) async for doc in cursor if ObjectId.is_valid(doc["follower_id"])]
    
    users = []
    current_id = current_user.id if current_user else None
    if follower_ids:
        users_cursor = db.users.find({"_id": {"$in": follower_ids}})
        async for doc in users_cursor:
            users.append(await populate_user_details(doc, current_id, db))
    return users

@router.get("/{user_id}/following", response_model=List[UserOut])
async def get_following(
    user_id: str,
    limit: int = 50,
    current_user: Optional[UserOut] = Depends(get_current_user_optional),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    cursor = db.followers.find({"follower_id": user_id}).limit(limit)
    following_ids = [ObjectId(doc["following_id"]) async for doc in cursor if ObjectId.is_valid(doc["following_id"])]
    
    users = []
    current_id = current_user.id if current_user else None
    if following_ids:
        users_cursor = db.users.find({"_id": {"$in": following_ids}})
        async for doc in users_cursor:
            users.append(await populate_user_details(doc, current_id, db))
    return users

@router.get("/{username_or_id}", response_model=UserOut)
async def get_user_profile(
    username_or_id: str,
    current_user: Optional[UserOut] = Depends(get_current_user_optional),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {}
    if ObjectId.is_valid(username_or_id):
        query = {"$or": [{"_id": ObjectId(username_or_id)}, {"username": username_or_id.lower()}]}
    else:
        query = {"username": username_or_id.lower()}

    user_doc = await db.users.find_one(query)
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    current_id = current_user.id if current_user else None
    return await populate_user_details(user_doc, current_id, db)

@router.put("/profile", response_model=UserOut)
async def update_profile(
    user_update: UserUpdate,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    update_data = {k: v for k, v in user_update.model_dump().items() if v is not None}
    if not update_data:
        return current_user

    update_data["updated_at"] = datetime.utcnow()
    await db.users.update_one(
        {"_id": ObjectId(current_user.id)},
        {"$set": update_data}
    )

    updated_doc = await db.users.find_one({"_id": ObjectId(current_user.id)})
    return await populate_user_details(updated_doc, current_user.id, db)

@router.post("/{user_id}/follow")
async def follow_user(
    user_id: str,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot follow yourself")

    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=404, detail="User not found")

    target_user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = await db.followers.find_one({
        "follower_id": current_user.id,
        "following_id": user_id
    })

    if existing:
        return {"status": "already_following", "message": "You are already following this user"}

    await db.followers.insert_one({
        "follower_id": current_user.id,
        "following_id": user_id,
        "created_at": datetime.utcnow()
    })

    # Send notification to target user
    await create_and_send_notification(
        db=db,
        recipient_id=user_id,
        sender_id=current_user.id,
        notification_type="follow",
        content=f"{current_user.full_name} started following you.",
        entity_id=current_user.id,
        entity_type="user"
    )

    return {"status": "success", "message": f"Successfully followed {target_user.get('username')}"}

@router.delete("/{user_id}/unfollow")
async def unfollow_user(
    user_id: str,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    result = await db.followers.delete_one({
        "follower_id": current_user.id,
        "following_id": user_id
    })

    if result.deleted_count == 0:
        return {"status": "not_following", "message": "You were not following this user"}

    return {"status": "success", "message": "Successfully unfollowed user"}
