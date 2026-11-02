from datetime import datetime, timedelta
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.database import get_database
from app.core.security import verify_password, get_password_hash, create_access_token
from app.api.deps import get_current_user, serialize_mongo_doc
from app.schemas.user import UserCreate, UserLogin, UserOut, Token

router = APIRouter()

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncIOMotorDatabase = Depends(get_database)):
    # Check if username or email already exists
    existing_user = await db.users.find_one({
        "$or": [
            {"username": user_in.username.lower().strip()},
            {"email": user_in.email.lower().strip()}
        ]
    })
    if existing_user:
        if existing_user.get("username") == user_in.username.lower().strip():
            raise HTTPException(status_code=400, detail="Username is already taken")
        raise HTTPException(status_code=400, detail="Email is already registered")

    now = datetime.utcnow()
    # Default cool gradient avatar if none provided
    default_avatar = f"https://api.dicebear.com/7.x/avataaars/svg?seed={user_in.username}"
    
    user_doc = {
        "username": user_in.username.lower().strip(),
        "email": user_in.email.lower().strip(),
        "password_hash": get_password_hash(user_in.password),
        "full_name": user_in.full_name.strip(),
        "bio": "Hey there! I am using EChat.",
        "avatar_url": default_avatar,
        "cover_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
        "website": "",
        "location": "",
        "is_private": False,
        "created_at": now,
        "updated_at": now
    }

    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    
    user_dict = serialize_mongo_doc(user_doc)
    user_dict["followers_count"] = 0
    user_dict["following_count"] = 0
    user_dict["posts_count"] = 0
    user_out = UserOut(**user_dict)

    token = create_access_token(subject=str(result.inserted_id))
    return Token(access_token=token, token_type="bearer", user=user_out)

@router.post("/login", response_model=Token)
async def login(login_data: UserLogin, db: AsyncIOMotorDatabase = Depends(get_database)):
    identifier = login_data.email_or_username.lower().strip()
    user = await db.users.find_one({
        "$or": [
            {"username": identifier},
            {"email": identifier}
        ]
    })
    
    if not user or not verify_password(login_data.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    followers_count = await db.followers.count_documents({"following_id": str(user["_id"])})
    following_count = await db.followers.count_documents({"follower_id": str(user["_id"])})
    posts_count = await db.posts.count_documents({"user_id": str(user["_id"])})

    user_dict = serialize_mongo_doc(user)
    user_dict["followers_count"] = followers_count
    user_dict["following_count"] = following_count
    user_dict["posts_count"] = posts_count
    user_out = UserOut(**user_dict)

    token = create_access_token(subject=str(user["_id"]))
    return Token(access_token=token, token_type="bearer", user=user_out)

@router.get("/me", response_model=UserOut)
async def get_me(current_user: UserOut = Depends(get_current_user)):
    return current_user
