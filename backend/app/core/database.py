import re
import logging
from typing import Optional
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorGridFSBucket
from app.core.config import settings

logger = logging.getLogger(__name__)

# Global MongoDB client and database instances
client: Optional[AsyncIOMotorClient] = None
db: Optional[AsyncIOMotorDatabase] = None
fs: Optional[AsyncIOMotorGridFSBucket] = None

def mask_mongodb_uri(uri: str) -> str:
    """Mask credentials in MongoDB connection string for secure logging."""
    if not uri:
        return ""
    return re.sub(r":([^/@]+)@", r":****@", uri)

def clean_mongodb_uri(uri: str) -> str:
    """Strip accidental angle brackets and surrounding URI template markup."""
    if not uri:
        return uri
    cleaned = uri.strip()
    cleaned = re.sub(r"://<([^>]+)>:", r"://\1:", cleaned)
    cleaned = re.sub(r":<([^>]+)>@", r":\1@", cleaned)
    cleaned = re.sub(r"@<([^>]+)>", r"@\1", cleaned)
    cleaned = cleaned.replace("<", "").replace(">", "")
    return cleaned

class DatabaseManager:
    """Compatibility wrapper preserving db_manager attribute access."""
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None
    fs: Optional[AsyncIOMotorGridFSBucket] = None
    connected: bool = False

db_manager = DatabaseManager()

def _sync_manager():
    db_manager.client = client
    db_manager.db = db
    db_manager.fs = fs
    db_manager.connected = (db is not None)

async def get_database() -> AsyncIOMotorDatabase:
    """
    FastAPI dependency that provides the initialized MongoDB database instance to API routes.
    Raises HTTP 503 if the database was not initialized at startup.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is not initialized. Please verify MongoDB Atlas configuration."
        )
    return db

async def get_gridfs() -> AsyncIOMotorGridFSBucket:
    """
    FastAPI dependency that provides the initialized GridFS bucket for media storage/retrieval.
    """
    global fs
    if fs is None and db is not None:
        fs = AsyncIOMotorGridFSBucket(db)
        _sync_manager()
    return fs

async def is_mongo_connected() -> bool:
    """Check if MongoDB connection is active and responsive."""
    if client is None or db is None:
        return False
    try:
        await client.admin.command("ping")
        return True
    except Exception:
        return False

def _is_placeholder_url(url: str) -> bool:
    """Return True if the MONGODB_URL still contains template or angle-bracketed values."""
    if re.search(r"<[^<>]+>", url):
        return True
    return any(token in url.lower() for token in (
        "db_username",
        "db_password",
        "cluster-address",
    ))

async def connect_to_mongo():
    """
    Initialize MongoDB Atlas / Motor client, validate live connectivity,
    and establish both the client and database handles before API endpoints use them.
    Fails startup clearly if Atlas is unavailable or unconfigured.
    """
    global client, db, fs

    raw_url = clean_mongodb_uri(settings.MONGODB_URL)
    masked_url = mask_mongodb_uri(raw_url)

    # Fail startup immediately if credentials are still unconfigured template placeholders
    if _is_placeholder_url(raw_url):
        err_msg = (
            f"Cannot start application: MONGODB_URL contains placeholder tokens ({masked_url}).\n"
            "Please configure your valid MongoDB Atlas credentials in backend/.env before starting the server."
        )
        logger.critical(err_msg)
        db = None
        client = None
        fs = None
        _sync_manager()
        raise RuntimeError(err_msg)

    logger.info(f"Connecting to MongoDB Atlas at {masked_url}...")

    try:
        client = AsyncIOMotorClient(
            raw_url,
            maxPoolSize=50,
            minPoolSize=10,
            serverSelectionTimeoutMS=5000,
        )

        # Validate live connectivity via ping before proceeding
        await client.admin.command("ping")
        db = client[settings.DATABASE_NAME]
        fs = AsyncIOMotorGridFSBucket(db)
        _sync_manager()

        logger.info(f"MongoDB connected successfully: {settings.DATABASE_NAME} (GridFS ready)")
        print("MongoDB connected successfully")

        # Initialize essential indexes
        await create_db_indexes()

    except Exception as e:
        logger.critical(
            f"Failed to establish live connection to MongoDB at {masked_url}: {e}\n"
            "Startup failed. Please check:\n"
            "  1. Network Access (IP whitelist) in MongoDB Atlas includes your current IP or 0.0.0.0/0.\n"
            "  2. Database user credentials (username and password) in MONGODB_URL.\n"
            "  3. Cluster status in MongoDB Atlas dashboard."
        )
        if client:
            client.close()
        client = None
        db = None
        fs = None
        _sync_manager()
        raise RuntimeError(
            f"MongoDB Atlas is unavailable at {masked_url}. Application startup aborted: {e}"
        ) from e

async def close_mongo_connection():
    """Graceful shutdown of MongoDB connections."""
    global client, db, fs
    logger.info("Closing MongoDB connection...")
    if client:
        client.close()
    client = None
    db = None
    fs = None
    _sync_manager()
    logger.info("MongoDB connection closed.")

async def create_db_indexes():
    """Create essential MongoDB indexes for users, posts, chats, stories, etc."""
    if db is None:
        return
    try:
        # User indexes
        await db.users.create_index("username", unique=True)
        await db.users.create_index("email", unique=True)
        await db.users.create_index([("full_name", "text"), ("username", "text"), ("bio", "text")])

        # Follower indexes
        await db.followers.create_index([("follower_id", 1), ("following_id", 1)], unique=True)
        await db.followers.create_index("follower_id")
        await db.followers.create_index("following_id")

        # Post indexes
        await db.posts.create_index([("user_id", 1), ("created_at", -1)])
        await db.posts.create_index([("created_at", -1)])
        await db.posts.create_index([("caption", "text"), ("tags", "text")])

        # Likes & Comments
        await db.likes.create_index([("post_id", 1), ("user_id", 1)], unique=True)
        await db.comments.create_index([("post_id", 1), ("created_at", 1)])

        # Stories
        await db.stories.create_index([("user_id", 1), ("expires_at", 1)])
        await db.stories.create_index([("expires_at", 1)])
        await db.story_views.create_index([("story_id", 1), ("user_id", 1)], unique=True)

        # Conversations & Messages
        await db.conversations.create_index([("participants", 1)])
        await db.conversations.create_index([("updated_at", -1)])
        await db.messages.create_index([("conversation_id", 1), ("created_at", 1)])

        # Notifications
        await db.notifications.create_index([("recipient_id", 1), ("created_at", -1)])
        await db.notifications.create_index([("recipient_id", 1), ("is_read", 1)])

        # Bookmarks
        await db.bookmarks.create_index([("user_id", 1), ("post_id", 1)], unique=True)

        logger.info("Database indexes successfully verified and initialized.")
    except Exception as e:
        logger.warning(f"Note on creating database indexes: {e}")
