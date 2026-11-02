from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.api.deps import get_current_user, serialize_mongo_doc
from app.schemas.chat import (
    ConversationCreate, ConversationUpdate, ConversationOut,
    MessageCreate, MessageOut, MessageReaction
)
from app.schemas.user import UserOut
from app.websockets.manager import ws_manager
from app.utils.notifications import create_and_send_notification

router = APIRouter()

async def populate_message_details(msg_doc: dict, db: AsyncIOMotorDatabase) -> MessageOut:
    sender_id = msg_doc.get("sender_id")
    sender_doc = await db.users.find_one({"_id": ObjectId(sender_id)}) if ObjectId.is_valid(sender_id) else None
    
    sender_out = None
    if sender_doc:
        s_dict = serialize_mongo_doc(sender_doc)
        sender_out = UserOut(**s_dict)
    
    m_dict = serialize_mongo_doc(msg_doc)
    m_dict["sender"] = sender_out
    
    # Check reply to
    if m_dict.get("reply_to_id") and ObjectId.is_valid(m_dict["reply_to_id"]):
        reply_doc = await db.messages.find_one({"_id": ObjectId(m_dict["reply_to_id"])})
        if reply_doc:
            m_dict["reply_to_message"] = serialize_mongo_doc(reply_doc)
            
    return MessageOut(**m_dict)

async def populate_conversation_details(conv_doc: dict, current_user_id: str, db: AsyncIOMotorDatabase) -> ConversationOut:
    conv_id = str(conv_doc["_id"])
    participant_ids = conv_doc.get("participants", [])
    
    participants = []
    for pid in participant_ids:
        if ObjectId.is_valid(pid):
            u_doc = await db.users.find_one({"_id": ObjectId(pid)})
            if u_doc:
                u_dict = serialize_mongo_doc(u_doc)
                u_dict["is_online"] = ws_manager.is_user_online(pid)
                participants.append(UserOut(**u_dict))

    # Last message
    last_msg = None
    last_msg_doc = await db.messages.find_one({"conversation_id": conv_id}, sort=[("created_at", -1)])
    if last_msg_doc:
        last_msg = await populate_message_details(last_msg_doc, db)

    # Unread count
    unread_count = await db.messages.count_documents({
        "conversation_id": conv_id,
        "sender_id": {"$ne": current_user_id},
        "read_by": {"$ne": current_user_id}
    })

    c_dict = serialize_mongo_doc(conv_doc)
    c_dict["participants"] = participants
    c_dict["last_message"] = last_msg
    c_dict["unread_count"] = unread_count
    return ConversationOut(**c_dict)

@router.get("/conversations", response_model=List[ConversationOut])
async def get_conversations(
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    cursor = db.conversations.find({
        "participants": current_user.id
    }).sort("updated_at", -1)

    conversations = []
    async for doc in cursor:
        conversations.append(await populate_conversation_details(doc, current_user.id, db))
    return conversations

@router.post("/conversations", response_model=ConversationOut)
async def create_or_get_conversation(
    conv_in: ConversationCreate,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    # Ensure current user is in participants
    all_participants = list(set([current_user.id] + conv_in.participant_ids))
    
    # If 1-to-1 conversation, check if already exists
    if not conv_in.is_group and len(all_participants) == 2:
        other_id = [p for p in all_participants if p != current_user.id][0]
        existing = await db.conversations.find_one({
            "is_group": False,
            "participants": {"$all": [current_user.id, other_id], "$size": 2}
        })
        if existing:
            return await populate_conversation_details(existing, current_user.id, db)

    now = datetime.utcnow()
    conv_doc = {
        "is_group": conv_in.is_group,
        "group_name": conv_in.group_name if conv_in.is_group else None,
        "group_avatar": conv_in.group_avatar or "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&q=80",
        "group_admins": [current_user.id] if conv_in.is_group else [],
        "participants": all_participants,
        "created_at": now,
        "updated_at": now
    }

    result = await db.conversations.insert_one(conv_doc)
    conv_doc["_id"] = result.inserted_id
    
    conv_out = await populate_conversation_details(conv_doc, current_user.id, db)
    
    # Notify participants via WebSocket
    await ws_manager.send_to_users(
        {
            "type": "new_conversation",
            "data": conv_out.model_dump()
        },
        user_ids=[p for p in all_participants if p != current_user.id]
    )

    return conv_out

@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageOut])
async def get_conversation_messages(
    conversation_id: str,
    limit: int = Query(50, ge=1, le=100),
    before_id: Optional[str] = None,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(conversation_id):
        raise HTTPException(status_code=400, detail="Invalid conversation ID")

    conv = await db.conversations.find_one({"_id": ObjectId(conversation_id), "participants": current_user.id})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found or access denied")

    query = {"conversation_id": conversation_id}
    if before_id and ObjectId.is_valid(before_id):
        query["_id"] = {"$lt": ObjectId(before_id)}

    cursor = db.messages.find(query).sort("created_at", -1).limit(limit)
    messages = []
    async for doc in cursor:
        messages.append(await populate_message_details(doc, db))

    # Mark unread messages as read
    await db.messages.update_many(
        {"conversation_id": conversation_id, "sender_id": {"$ne": current_user.id}, "read_by": {"$ne": current_user.id}},
        {"$addToSet": {"read_by": current_user.id}}
    )

    return list(reversed(messages))

@router.post("/messages", response_model=MessageOut)
async def send_message(
    msg_in: MessageCreate,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(msg_in.conversation_id):
        raise HTTPException(status_code=400, detail="Invalid conversation ID")

    conv = await db.conversations.find_one({
        "_id": ObjectId(msg_in.conversation_id),
        "participants": current_user.id
    })
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found or not a participant")

    now = datetime.utcnow()
    msg_doc = {
        "conversation_id": msg_in.conversation_id,
        "sender_id": current_user.id,
        "content": msg_in.content,
        "message_type": msg_in.message_type,
        "media_url": msg_in.media_url,
        "media_name": msg_in.media_name,
        "media_size": msg_in.media_size,
        "reply_to_id": msg_in.reply_to_id,
        "reactions": [],
        "read_by": [current_user.id],
        "is_edited": False,
        "is_deleted": False,
        "created_at": now,
        "updated_at": now
    }

    result = await db.messages.insert_one(msg_doc)
    msg_doc["_id"] = result.inserted_id

    # Update conversation's updated_at
    await db.conversations.update_one(
        {"_id": ObjectId(msg_in.conversation_id)},
        {"$set": {"updated_at": now}}
    )

    populated_msg = await populate_message_details(msg_doc, db)
    
    # Broadcast to other participants in the conversation
    other_participants = [p for p in conv["participants"] if p != current_user.id]
    await ws_manager.send_to_users(
        {
            "type": "new_message",
            "data": populated_msg.model_dump()
        },
        user_ids=other_participants
    )

    # Trigger notification
    for recipient_id in other_participants:
        title_prefix = f"[{conv.get('group_name')}] " if conv.get("is_group") else ""
        content_preview = msg_in.content[:50] if msg_in.content else f"Sent an attachment ({msg_in.message_type})"
        await create_and_send_notification(
            db=db,
            recipient_id=recipient_id,
            sender_id=current_user.id,
            notification_type="message",
            content=f"{title_prefix}{current_user.full_name}: {content_preview}",
            entity_id=msg_in.conversation_id,
            entity_type="conversation"
        )

    return populated_msg

@router.post("/messages/{message_id}/react")
async def react_to_message(
    message_id: str,
    emoji: str = Query(..., min_length=1),
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(message_id):
        raise HTTPException(status_code=400, detail="Invalid message ID")

    msg = await db.messages.find_one({"_id": ObjectId(message_id)})
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    conv = await db.conversations.find_one({"_id": ObjectId(msg["conversation_id"]), "participants": current_user.id})
    if not conv:
        raise HTTPException(status_code=403, detail="Access denied")

    # Remove existing reaction from this user if any
    await db.messages.update_one(
        {"_id": ObjectId(message_id)},
        {"$pull": {"reactions": {"user_id": current_user.id}}}
    )

    # Add new reaction
    new_reaction = {
        "user_id": current_user.id,
        "username": current_user.username,
        "emoji": emoji,
        "created_at": datetime.utcnow()
    }
    await db.messages.update_one(
        {"_id": ObjectId(message_id)},
        {"$push": {"reactions": new_reaction}}
    )

    # Broadcast reaction update
    await ws_manager.send_to_users(
        {
            "type": "message_reaction",
            "data": {
                "message_id": message_id,
                "conversation_id": msg["conversation_id"],
                "reaction": new_reaction
            }
        },
        user_ids=conv["participants"]
    )

    return {"status": "success", "reaction": new_reaction}

@router.post("/conversations/{conversation_id}/read")
async def mark_conversation_read(
    conversation_id: str,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(conversation_id):
        raise HTTPException(status_code=400, detail="Invalid conversation ID")

    conv = await db.conversations.find_one({
        "_id": ObjectId(conversation_id),
        "participants": current_user.id
    })
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found or access denied")

    await db.messages.update_many(
        {"conversation_id": conversation_id, "read_by": {"$ne": current_user.id}},
        {"$addToSet": {"read_by": current_user.id}}
    )

    await ws_manager.send_to_users(
        {
            "type": "messages_read",
            "data": {
                "conversation_id": conversation_id,
                "reader_id": current_user.id
            }
        },
        user_ids=[p for p in conv["participants"] if p != current_user.id]
    )

    return {"status": "success"}
