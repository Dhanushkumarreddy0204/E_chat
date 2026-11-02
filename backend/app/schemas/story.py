from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from app.schemas.user import UserOut

class StoryCreate(BaseModel):
    media_url: str
    media_type: str = "image"  # "image" | "video"
    caption: Optional[str] = ""
    duration_seconds: int = 5
    background_color: Optional[str] = "#000000"

class StoryReactionCreate(BaseModel):
    emoji: str

class StoryOut(BaseModel):
    id: str
    user_id: str
    user: UserOut
    media_url: str
    media_type: str
    caption: Optional[str] = ""
    duration_seconds: int = 5
    background_color: Optional[str] = "#000000"
    created_at: datetime
    expires_at: datetime
    views_count: int = 0
    is_viewed: bool = False
    reactions_count: int = 0

    class Config:
        from_attributes = True

class UserStoryGroup(BaseModel):
    user: UserOut
    stories: List[StoryOut]
    has_unseen: bool = True
