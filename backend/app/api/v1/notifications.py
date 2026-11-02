from typing import List
from bson import ObjectId
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.api.deps import get_current_user, serialize_mongo_doc
from app.schemas.notification import NotificationOut, NotificationCount
from app.schemas.user import UserOut

router = APIRouter()

@router.get("/", response_model=List[NotificationOut])
async def get_notifications(
    limit: int = Query(30, ge=1, le=100),
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    cursor = db.notifications.find({
        "recipient_id": current_user.id
    }).sort("created_at", -1).limit(limit)

    notifications = []
    async for doc in cursor:
        sender_doc = await db.users.find_one({"_id": ObjectId(doc["sender_id"])}) if ObjectId.is_valid(doc.get("sender_id")) else None
        sender_out = None
        if sender_doc:
            sender_out = UserOut(**serialize_mongo_doc(sender_doc))

        n_dict = serialize_mongo_doc(doc)
        n_dict["sender"] = sender_out
        notifications.append(NotificationOut(**n_dict))

    return notifications

@router.get("/unread-count", response_model=NotificationCount)
async def get_unread_count(
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    count = await db.notifications.count_documents({
        "recipient_id": current_user.id,
        "is_read": False
    })
    return NotificationCount(unread_count=count)

@router.post("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if ObjectId.is_valid(notification_id):
        await db.notifications.update_one(
            {"_id": ObjectId(notification_id), "recipient_id": current_user.id},
            {"$set": {"is_read": True}}
        )
    return {"status": "success"}

@router.post("/read-all")
async def mark_all_notifications_read(
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    await db.notifications.update_many(
        {"recipient_id": current_user.id, "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"status": "success"}
