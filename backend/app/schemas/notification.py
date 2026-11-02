from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel
from app.schemas.user import UserOut

class NotificationOut(BaseModel):
    id: str
    recipient_id: str
    sender_id: str
    sender: Optional[UserOut] = None
    notification_type: str  # "like_post", "comment_post", "follow", "message", "story_reaction", "mention"
    content: str
    entity_id: Optional[str] = None  # post_id, story_id, conversation_id
    entity_type: Optional[str] = None  # "post", "story", "conversation"
    entity_preview: Optional[str] = None
    is_read: bool = False
    created_at: datetime
    data: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

class NotificationCount(BaseModel):
    unread_count: int
