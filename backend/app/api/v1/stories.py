from typing import List, Optional
from datetime import datetime, timedelta
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database
from app.api.deps import get_current_user, get_current_user_optional, serialize_mongo_doc
from app.schemas.story import StoryCreate, StoryOut, StoryReactionCreate, UserStoryGroup
from app.schemas.user import UserOut
from app.utils.notifications import create_and_send_notification

router = APIRouter()

async def populate_story_details(story_doc: dict, current_user_id: Optional[str], db: AsyncIOMotorDatabase) -> StoryOut:
    story_id = str(story_doc["_id"])
    user_id = story_doc.get("user_id")

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
            username="unknown",
            email="unknown@echat.com",
            full_name="User",
            created_at=datetime.utcnow()
        )

    views_count = await db.story_views.count_documents({"story_id": story_id})
    
    is_viewed = False
    if current_user_id:
        view_doc = await db.story_views.find_one({"story_id": story_id, "user_id": current_user_id})
        is_viewed = bool(view_doc)

    s_dict = serialize_mongo_doc(story_doc)
    s_dict["user_id"] = user_id
    s_dict["user"] = author
    s_dict["views_count"] = views_count
    s_dict["is_viewed"] = is_viewed
    return StoryOut(**s_dict)

@router.post("/", response_model=StoryOut, status_code=status.HTTP_201_CREATED)
async def create_story(
    story_in: StoryCreate,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    now = datetime.utcnow()
    expires_at = now + timedelta(hours=24)

    story_doc = {
        "user_id": current_user.id,
        "media_url": story_in.media_url,
        "media_type": story_in.media_type,
        "caption": story_in.caption,
        "duration_seconds": story_in.duration_seconds,
        "background_color": story_in.background_color,
        "created_at": now,
        "expires_at": expires_at
    }

    result = await db.stories.insert_one(story_doc)
    story_doc["_id"] = result.inserted_id
    return await populate_story_details(story_doc, current_user.id, db)

@router.get("/feed", response_model=List[UserStoryGroup])
async def get_stories_feed(
    current_user: Optional[UserOut] = Depends(get_current_user_optional),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    now = datetime.utcnow()
    current_id = current_user.id if current_user else None

    # Fetch active stories (expires_at > now)
    query = {"expires_at": {"$gt": now}}
    cursor = db.stories.find(query).sort("created_at", 1)

    # Group stories by user_id
    user_stories_map = {}
    async for s_doc in cursor:
        uid = s_doc["user_id"]
        if uid not in user_stories_map:
            user_stories_map[uid] = []
        user_stories_map[uid].append(s_doc)

    groups: List[UserStoryGroup] = []

    # If current user is logged in, place their stories first
    all_user_ids = list(user_stories_map.keys())
    if current_id and current_id in all_user_ids:
        all_user_ids.remove(current_id)
        all_user_ids.insert(0, current_id)

    for uid in all_user_ids:
        raw_stories = user_stories_map[uid]
        populated_stories: List[StoryOut] = []
        has_unseen = False

        for s_doc in raw_stories:
            story_out = await populate_story_details(s_doc, current_id, db)
            populated_stories.append(story_out)
            if not story_out.is_viewed and uid != current_id:
                has_unseen = True

        if populated_stories:
            group_user = populated_stories[0].user
            groups.append(UserStoryGroup(
                user=group_user,
                stories=populated_stories,
                has_unseen=has_unseen
            ))

    return groups

@router.post("/{story_id}/view")
async def mark_story_viewed(
    story_id: str,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(story_id):
        raise HTTPException(status_code=400, detail="Invalid story ID")

    story_doc = await db.stories.find_one({"_id": ObjectId(story_id)})
    if not story_doc:
        raise HTTPException(status_code=404, detail="Story not found")

    existing = await db.story_views.find_one({"story_id": story_id, "user_id": current_user.id})
    if not existing:
        await db.story_views.insert_one({
            "story_id": story_id,
            "user_id": current_user.id,
            "viewed_at": datetime.utcnow()
        })

    return {"status": "success", "message": "Story marked as viewed"}

@router.post("/{story_id}/react")
async def react_to_story(
    story_id: str,
    reaction: StoryReactionCreate,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(story_id):
        raise HTTPException(status_code=400, detail="Invalid story ID")

    story_doc = await db.stories.find_one({"_id": ObjectId(story_id)})
    if not story_doc:
        raise HTTPException(status_code=404, detail="Story not found")

    # Send notification & dm to story owner
    if story_doc["user_id"] != current_user.id:
        await create_and_send_notification(
            db=db,
            recipient_id=story_doc["user_id"],
            sender_id=current_user.id,
            notification_type="story_reaction",
            content=f"{current_user.full_name} reacted {reaction.emoji} to your story.",
            entity_id=story_id,
            entity_type="story",
            entity_preview=reaction.emoji
        )

    return {"status": "success", "message": f"Reacted {reaction.emoji} to story"}

@router.delete("/{story_id}")
async def delete_story(
    story_id: str,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if not ObjectId.is_valid(story_id):
        raise HTTPException(status_code=400, detail="Invalid story ID")

    story_doc = await db.stories.find_one({"_id": ObjectId(story_id)})
    if not story_doc:
        raise HTTPException(status_code=404, detail="Story not found")

    if story_doc.get("user_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this story")

    await db.stories.delete_one({"_id": ObjectId(story_id)})
    await db.story_views.delete_many({"story_id": story_id})

    return {"status": "success", "message": "Story deleted"}
