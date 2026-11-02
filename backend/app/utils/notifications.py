from datetime import datetime
from typing import Optional, Dict, Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.websockets.manager import ws_manager
from app.api.deps import serialize_mongo_doc

async def create_and_send_notification(
    db: AsyncIOMotorDatabase,
    recipient_id: str,
    sender_id: str,
    notification_type: str,
    content: str,
    entity_id: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_preview: Optional[str] = None,
    data: Optional[Dict[str, Any]] = None
):
    # Don't notify oneself
    if recipient_id == sender_id:
        return None

    # Fetch sender info
    sender_doc = await db.users.find_one({"_id": ObjectId(sender_id)})
    if not sender_doc:
        return None
    
    sender_info = {
        "id": str(sender_doc["_id"]),
        "username": sender_doc.get("username", ""),
        "full_name": sender_doc.get("full_name", ""),
        "avatar_url": sender_doc.get("avatar_url", "")
    }

    notification_doc = {
        "recipient_id": str(recipient_id),
        "sender_id": str(sender_id),
        "sender": sender_info,
        "notification_type": notification_type,
        "content": content,
        "entity_id": str(entity_id) if entity_id else None,
        "entity_type": entity_type,
        "entity_preview": entity_preview,
        "is_read": False,
        "created_at": datetime.utcnow(),
        "data": data or {}
    }

    result = await db.notifications.insert_one(notification_doc)
    notification_doc["id"] = str(result.inserted_id)
    if "_id" in notification_doc:
        del notification_doc["_id"]

    # Send real-time notification via WebSocket
    await ws_manager.send_personal_message(
        {
            "type": "new_notification",
            "data": notification_doc
        },
        user_id=str(recipient_id)
    )

    return notification_doc
