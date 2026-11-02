from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from app.schemas.user import UserOut

class MessageReaction(BaseModel):
    user_id: str
    username: str
    emoji: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class MessageCreate(BaseModel):
    conversation_id: str
    content: Optional[str] = ""
    message_type: str = "text"  # "text" | "image" | "video" | "audio" | "file"
    media_url: Optional[str] = None
    media_name: Optional[str] = None
    media_size: Optional[int] = None
    reply_to_id: Optional[str] = None

class MessageOut(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    sender: Optional[UserOut] = None
    content: Optional[str] = ""
    message_type: str = "text"
    media_url: Optional[str] = None
    media_name: Optional[str] = None
    media_size: Optional[int] = None
    reply_to_id: Optional[str] = None
    reply_to_message: Optional[Dict[str, Any]] = None
    reactions: List[MessageReaction] = []
    read_by: List[str] = []
    is_edited: bool = False
    is_deleted: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ConversationCreate(BaseModel):
    participant_ids: List[str]
    is_group: bool = False
    group_name: Optional[str] = None
    group_avatar: Optional[str] = None

class ConversationUpdate(BaseModel):
    group_name: Optional[str] = None
    group_avatar: Optional[str] = None

class ConversationOut(BaseModel):
    id: str
    is_group: bool = False
    group_name: Optional[str] = None
    group_avatar: Optional[str] = None
    group_admins: List[str] = []
    participants: List[UserOut] = []
    last_message: Optional[MessageOut] = None
    unread_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
