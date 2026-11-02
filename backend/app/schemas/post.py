from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from app.schemas.user import UserOut

class MediaItem(BaseModel):
    url: str
    media_type: str = "image"  # "image" | "video"
    aspect_ratio: Optional[float] = 1.0

class CommentBase(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)

class CommentCreate(CommentBase):
    pass

class CommentOut(CommentBase):
    id: str
    post_id: str
    user: UserOut
    created_at: datetime
    likes_count: int = 0
    is_liked: Optional[bool] = False

class PostCreate(BaseModel):
    caption: Optional[str] = ""
    media: List[MediaItem] = []
    location: Optional[str] = ""
    tags: List[str] = []
    is_clip: bool = False

class PostUpdate(BaseModel):
    caption: Optional[str] = None
    location: Optional[str] = None
    tags: Optional[List[str]] = None

class PostOut(BaseModel):
    id: str
    user: UserOut
    caption: str = ""
    media: List[MediaItem] = []
    location: Optional[str] = ""
    tags: List[str] = []
    likes_count: int = 0
    comments_count: int = 0
    shares_count: int = 0
    views_count: int = 0
    is_liked: bool = False
    is_bookmarked: bool = False
    is_clip: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PostFeedResponse(BaseModel):
    items: List[PostOut]
    total: int
    has_more: bool
