from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    bio: Optional[str] = ""
    avatar_url: Optional[str] = ""
    cover_url: Optional[str] = ""
    website: Optional[str] = ""
    location: Optional[str] = ""
    is_private: bool = False

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=30)
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str

class UserLogin(BaseModel):
    email_or_username: str
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None
    website: Optional[str] = None
    location: Optional[str] = None
    is_private: Optional[bool] = None

class UserOut(UserBase):
    id: str
    followers_count: int = 0
    following_count: int = 0
    posts_count: int = 0
    is_following: Optional[bool] = False
    is_online: Optional[bool] = False
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class TokenPayload(BaseModel):
    sub: Optional[str] = None
