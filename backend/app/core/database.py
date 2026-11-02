import re
import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorGridFSBucket
from app.core.config import settings

logger = logging.getLogger(__name__)

def mask_mongodb_uri(uri: str) -> str:
    """Mask credentials in MongoDB connection string for secure logging."""
    if not uri:
        return ""
    return re.sub(r":([^/@]+)@", r":****@", uri)

class DatabaseManager:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None
    fs: AsyncIOMotorGridFSBucket = None
    connected: bool = False

db_manager = DatabaseManager()

async def get_database() -> AsyncIOMotorDatabase:
    return db_manager.db

async def get_gridfs() -> AsyncIOMotorGridFSBucket:
    if db_manager.fs is None and db_manager.db is not None:
        db_manager.fs = AsyncIOMotorGridFSBucket(db_manager.db)
    return db_manager.fs

async def is_mongo_connected() -> bool:
    """Check if MongoDB connection is active and responsive."""
    if not db_manager.client:
        return False
    try:
        await db_manager.client.admin.command("ping")
        return True
    except Exception:
        return False

async def connect_to_mongo():
    """Initialize MongoDB Atlas / Motor client, validate connection, and create indexes."""
    masked_url = mask_mongodb_uri(settings.MONGODB_URL)
    logger.info(f"Connecting to MongoDB at {masked_url}...")
    
    try:
        db_manager.client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            maxPoolSize=50,
            minPoolSize=10,
            serverSelectionTimeoutMS=5000,
        )
        
        # Validate connection via ping
        await db_manager.client.admin.command("ping")
        db_manager.db = db_manager.client[settings.DATABASE_NAME]
        db_manager.fs = AsyncIOMotorGridFSBucket(db_manager.db)
        db_manager.connected = True
        logger.info(f"Successfully connected to MongoDB ({settings.DATABASE_NAME}) & initialized GridFS bucket.")
        
        # Initialize indexes for performance and constraints
        await create_db_indexes()
    except Exception as e:
        db_manager.connected = False
        # Fallback reference to db/fs so app does not crash on uninitialized attributes
        if db_manager.client:
            db_manager.db = db_manager.client[settings.DATABASE_NAME]
            db_manager.fs = AsyncIOMotorGridFSBucket(db_manager.db)
        logger.error(
            f"Failed to establish live connection to MongoDB at {masked_url}: {e}\n"
            "Please check:\n"
            "  1. Network Access (IP whitelist) in MongoDB Atlas includes your current IP or 0.0.0.0/0.\n"
            "  2. Database user credentials (username and password) in MONGODB_URL.\n"
            "  3. Cluster status in MongoDB Atlas dashboard."
        )

async def close_mongo_connection():
    """Graceful shutdown of MongoDB connections."""
    logger.info("Closing MongoDB connection...")
    if db_manager.client:
        db_manager.client.close()
        db_manager.connected = False
    logger.info("MongoDB connection closed.")

async def create_db_indexes():
    """Create essential MongoDB indexes for users, posts, chats, stories, etc."""
    try:
        db = db_manager.db
        if db is None:
            return
        
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
