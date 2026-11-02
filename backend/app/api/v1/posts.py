from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.api.deps import get_current_user, get_current_user_optional, serialize_mongo_doc
from app.schemas.post import PostCreate, PostUpdate, PostOut, CommentCreate, CommentOut, PostFeedResponse
from app.schemas.user import UserOut
from app.utils.notifications import create_and_send_notification

router = APIRouter()

async def populate_post_details(post_doc: dict, current_user_id: Optional[str], db: AsyncIOMotorDatabase) -> PostOut:
    post_id = str(post_doc["_id"])
    user_id = post_doc.get("user_id")
    
    # User info
    user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
    if user_doc:
        u_followers = await db.followers.count_documents({"following_id": str(user_doc["_id"])})
        u_following = await db.followers.count_documents({"follower_id": str(user_doc["_id"])})
        u_posts = await db.posts.count_documents({"user_id": str(user_doc["_id"])})
        u_dict = serialize_mongo_doc(user_doc)
        u_dict["followers_count"] = u_followers
        u_dict["following_count"] = u_following
        u_dict["posts_count"] = u_posts
        author = UserOut(**u_dict)
    else:
        author = UserOut(
            id=user_id,
            username="deleted_user",
            email="deleted@echat.com",
            full_name="Deleted User",
            created_at=datetime.utcnow()
        )

    # Counts
    likes_count = await db.likes.count_documents({"post_id": post_id})
    comments_count = await db.comments.count_documents({"post_id": post_id})
    
    is_liked = False
    is_bookmarked = False
    if current_user_id:
        liked_doc = await db.likes.find_one({"post_id": post_id, "user_id": current_user_id})
        is_liked = bool(liked_doc)
        bookmark_doc = await db.bookmarks.find_one({"post_id": post_id, "user_id": current_user_id})
        is_bookmarked = bool(bookmark_doc)

    post_dict = serialize_mongo_doc(post_doc)
    post_dict["user"] = author
    post_dict["likes_count"] = likes_count
    post_dict["comments_count"] = comments_count
    post_dict["is_liked"] = is_liked
    post_dict["is_bookmarked"] = is_bookmarked
    return PostOut(**post_dict)

@router.post("/", response_model=PostOut, status_code=status.HTTP_201_CREATED)
async def create_post(
    post_in: PostCreate,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    now = datetime.utcnow()
    post_doc = {
        "user_id": current_user.id,
        "caption": post_in.caption,
        "media": [m.model_dump() for m in post_in.media],
        "location": post_in.location,
        "tags": post_in.tags,
        "shares_count": 0,
        "views_count": 0,
        "is_clip": post_in.is_clip,
        "created_at": now,
        "updated_at": now
    }

    result = await db.posts.insert_one(post_doc)
    post_doc["_id"] = result.inserted_id
    return await populate_post_details(post_doc, current_user.id, db)

@router.get("/feed", response_model=PostFeedResponse)
async def get_feed(
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=50),
    current_user: Optional[UserOut] = Depends(get_current_user_optional),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    skip = (page - 1) * limit
    current_id = current_user.id if current_user else None
    
    query = {}
    if current_user:
        # Get list of users followed by current user
        following_cursor = db.followers.find({"follower_id": current_user.id})
        following_ids = [doc["following_id"] async for doc in following_cursor]
        following_ids.append(current_user.id) # Include own posts
        
        # If user follows someone, prioritize their posts, or show discovery feed
        following_posts_count = await db.posts.count_documents({"user_id": {"$in": following_ids}, "is_clip": {"$ne": True}})
        if following_posts_count >= 1:
            query = {"user_id": {"$in": following_ids}, "is_clip": {"$ne": True}}
        else:
            query = {"is_clip": {"$ne": True}}  # Global feed
    else:
        query = {"is_clip": {"$ne": True}}
    
    total = await db.posts.count_documents(query)
    cursor = db.posts.find(query).sort("created_at", -1).skip(skip).limit(limit)

    items = []
    async for doc in cursor:
        items.append(await populate_post_details(doc, current_id, db))

    return PostFeedResponse(
        items=items,
        total=total,
        has_more=(skip + len(items)) < total
    )

@router.get("/explore", response_model=PostFeedResponse)
async def get_explore_posts(
    page: int = Query(1, ge=1),
    limit: int = Query(21, ge=1, le=60),
    current_user: Optional[UserOut] = Depends(get_current_user_optional),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    skip = (page - 1) * limit
    current_id = current_user.id if current_user else None
    
    query = {"is_clip": {"$ne": True}}
    total = await db.posts.count_documents(query)
    cursor = db.posts.find(query).sort("created_at", -1).skip(skip).limit(limit)

    items = []
    async for doc in cursor:
        items.append(await populate_post_details(doc, current_id, db))

    return PostFeedResponse(
        items=items,
        total=total,
        has_more=(skip + len(items)) < total
    )

@router.get("/clips", response_model=PostFeedResponse)
async def get_clips_feed(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    current_user: Optional[UserOut] = Depends(get_current_user_optional),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    skip = (page - 1) * limit
    current_id = current_user.id if current_user else None
    
    query = {"is_clip": True}
    total = await db.posts.count_documents(query)
    cursor = db.posts.find(query).sort("created_at", -1).skip(skip).limit(limit)

    items = []
    async for doc in cursor:
        items.append(await populate_post_details(doc, current_id, db))

    return PostFeedResponse(
        items=items,
        total=total,
        has_more=(skip + len(items)) < total
    )

@router.get("/user/{user_id_or_username}", response_model=List[PostOut])
async def get_user_posts(
    user_id_or_username: str,
    current_user: Optional[UserOut] = Depends(get_current_user_optional),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if ObjectId.is_valid(user_id_or_username):
        user_doc = await db.users.find_one({"_id": ObjectId(user_id_or_username)})
    else:
        user_doc = await db.users.find_one({"username": user_id_or_username.lower()})

    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    user_id = str(user_doc["_id"])
    cursor = db.posts.find({"user_id": user_id}).sort("created_at", -1)
    
    current_id = current_user.id if current_user else None
    posts = []
    async for doc in cursor:
        posts.append(await populate_post_details(doc, current_id, db))
    return posts

@router.get("/{post_id}", response_model=PostOut)
async def get_post_by_id(
    post_id: str,
    current_user: Optional[UserOut] = Depends(get_current_user_optional),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(post_id):
        raise HTTPException(status_code=400, detail="Invalid post ID")

    post_doc = await db.posts.find_one({"_id": ObjectId(post_id)})
    if not post_doc:
        raise HTTPException(status_code=404, detail="Post not found")

    current_id = current_user.id if current_user else None
    return await populate_post_details(post_doc, current_id, db)

@router.delete("/{post_id}")
async def delete_post(
    post_id: str,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(post_id):
        raise HTTPException(status_code=400, detail="Invalid post ID")

    post_doc = await db.posts.find_one({"_id": ObjectId(post_id)})
    if not post_doc:
        raise HTTPException(status_code=404, detail="Post not found")

    if post_doc.get("user_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this post")

    # Delete post and associated likes, comments, bookmarks
    await db.posts.delete_one({"_id": ObjectId(post_id)})
    await db.likes.delete_many({"post_id": post_id})
    await db.comments.delete_many({"post_id": post_id})
    await db.bookmarks.delete_many({"post_id": post_id})

    return {"status": "success", "message": "Post deleted successfully"}

# Like / Unlike
@router.post("/{post_id}/like")
async def toggle_like(
    post_id: str,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(post_id):
        raise HTTPException(status_code=400, detail="Invalid post ID")

    post_doc = await db.posts.find_one({"_id": ObjectId(post_id)})
    if not post_doc:
        raise HTTPException(status_code=404, detail="Post not found")

    existing_like = await db.likes.find_one({"post_id": post_id, "user_id": current_user.id})

    if existing_like:
        await db.likes.delete_one({"_id": existing_like["_id"]})
        likes_count = await db.likes.count_documents({"post_id": post_id})
        return {"is_liked": False, "likes_count": likes_count}
    else:
        await db.likes.insert_one({
            "post_id": post_id,
            "user_id": current_user.id,
            "created_at": datetime.utcnow()
        })
        likes_count = await db.likes.count_documents({"post_id": post_id})

        # Send notification to post owner
        if post_doc["user_id"] != current_user.id:
            await create_and_send_notification(
                db=db,
                recipient_id=post_doc["user_id"],
                sender_id=current_user.id,
                notification_type="like_post",
                content=f"{current_user.full_name} liked your post.",
                entity_id=post_id,
                entity_type="post",
                entity_preview=post_doc.get("caption", "")[:60]
            )

        return {"is_liked": True, "likes_count": likes_count}

@router.post("/{post_id}/view")
async def record_view(
    post_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(post_id):
        raise HTTPException(status_code=400, detail="Invalid post ID")
        
    result = await db.posts.update_one(
        {"_id": ObjectId(post_id)},
        {"$inc": {"views_count": 1}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
        
    return {"status": "success"}

# Comments
@router.get("/{post_id}/comments", response_model=List[CommentOut])
async def get_comments(
    post_id: str,
    current_user: Optional[UserOut] = Depends(get_current_user_optional),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    cursor = db.comments.find({"post_id": post_id}).sort("created_at", 1)
    comments = []
    current_id = current_user.id if current_user else None
    
    async for c_doc in cursor:
        user_doc = await db.users.find_one({"_id": ObjectId(c_doc["user_id"])}) if ObjectId.is_valid(c_doc.get("user_id", "")) else None
        if user_doc:
            from app.api.v1.users import populate_user_details
            user_out = await populate_user_details(user_doc, current_id, db)
        else:
            user_out = UserOut(
                id=c_doc.get("user_id", "deleted"),
                username="deleted",
                email="deleted@echat.com",
                full_name="Deleted User",
                created_at=datetime.utcnow()
            )

        c_dict = serialize_mongo_doc(c_doc)
        c_dict["user"] = user_out
        comments.append(CommentOut(**c_dict))

    return comments

@router.post("/{post_id}/comments", response_model=CommentOut)
async def add_comment(
    post_id: str,
    comment_in: CommentCreate,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(post_id):
        raise HTTPException(status_code=400, detail="Invalid post ID")

    post_doc = await db.posts.find_one({"_id": ObjectId(post_id)})
    if not post_doc:
        raise HTTPException(status_code=404, detail="Post not found")

    now = datetime.utcnow()
    comment_doc = {
        "post_id": post_id,
        "user_id": current_user.id,
        "content": comment_in.content.strip(),
        "created_at": now,
        "likes_count": 0
    }

    result = await db.comments.insert_one(comment_doc)
    comment_doc["_id"] = result.inserted_id

    # Send notification to post owner
    if post_doc["user_id"] != current_user.id:
        await create_and_send_notification(
            db=db,
            recipient_id=post_doc["user_id"],
            sender_id=current_user.id,
            notification_type="comment_post",
            content=f"{current_user.full_name} commented: {comment_in.content[:40]}",
            entity_id=post_id,
            entity_type="post",
            entity_preview=comment_in.content[:60]
        )

    c_dict = serialize_mongo_doc(comment_doc)
    c_dict["user"] = current_user
    return CommentOut(**c_dict)

# Bookmarks
@router.post("/{post_id}/bookmark")
async def toggle_bookmark(
    post_id: str,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    existing = await db.bookmarks.find_one({"post_id": post_id, "user_id": current_user.id})
    if existing:
        await db.bookmarks.delete_one({"_id": existing["_id"]})
        return {"is_bookmarked": False, "message": "Post removed from saved"}
    else:
        await db.bookmarks.insert_one({
            "post_id": post_id,
            "user_id": current_user.id,
            "created_at": datetime.utcnow()
        })
        return {"is_bookmarked": True, "message": "Post saved successfully"}

@router.get("/saved/all", response_model=List[PostOut])
async def get_saved_posts(
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    cursor = db.bookmarks.find({"user_id": current_user.id}).sort("created_at", -1)
    posts = []
    async for b_doc in cursor:
        if ObjectId.is_valid(b_doc["post_id"]):
            p_doc = await db.posts.find_one({"_id": ObjectId(b_doc["post_id"])})
            if p_doc:
                posts.append(await populate_post_details(p_doc, current_user.id, db))
    return posts
