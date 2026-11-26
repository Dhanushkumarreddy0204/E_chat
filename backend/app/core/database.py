import logging
import re
from asyncio import CancelledError, sleep
from typing import Optional
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorGridFSBucket
from pymongo.errors import ConfigurationError, ConnectionFailure, OperationFailure
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

    raw_url = settings.MONGODB_URL.strip()
    if _is_placeholder_url(raw_url) or not raw_url.startswith(("mongodb://", "mongodb+srv://")):
        raise RuntimeError("Set MONGODB_URL to a valid MongoDB URI without placeholder tokens.")

    try:
        client = AsyncIOMotorClient(
            raw_url,
            maxPoolSize=50,
            serverSelectionTimeoutMS=5000,
        )

        try:
            await client.admin.command("ping")
        except ConnectionFailure:
            logger.warning("MongoDB did not respond during startup. Retrying once.")
            await sleep(1)
            await client.admin.command("ping")

        db = client[settings.DATABASE_NAME]
        fs = AsyncIOMotorGridFSBucket(db)
        _sync_manager()

        logger.info(f"MongoDB connected successfully: {settings.DATABASE_NAME} (GridFS ready)")

        # Initialize essential indexes
        await create_db_indexes()

    except (Exception, CancelledError) as error:
        await close_mongo_connection()
        if isinstance(error, CancelledError):
            raise
        if isinstance(error, ConfigurationError):
            message = "Check the Atlas connection string in MONGODB_URL and confirm its SRV hostname resolves."
        elif isinstance(error, OperationFailure) and error.code in (13, 18):
            message = "Check the Atlas database user, password, and database permissions in Render."
        elif isinstance(error, ConnectionFailure):
            message = "Check that the Atlas cluster is active and Atlas Network Access allows Render's outbound IP ranges."
        else:
            message = "Check MONGODB_URL, DATABASE_NAME, and the Atlas database user's permissions."
        raise RuntimeError(f"MongoDB startup failed ({type(error).__name__}). {message}") from None

async def close_mongo_connection():
    """Graceful shutdown of MongoDB connections."""
    global client, db, fs
    logger.info("Closing MongoDB connection...")
    if client is not None:
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
        logger.warning("Could not initialize database indexes (%s)", type(e).__name__)
