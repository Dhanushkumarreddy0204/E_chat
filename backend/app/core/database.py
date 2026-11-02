import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings

logger = logging.getLogger(__name__)

class DatabaseManager:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None

db_manager = DatabaseManager()

async def get_database() -> AsyncIOMotorDatabase:
    return db_manager.db

async def connect_to_mongo():
    logger.info(f"Connecting to MongoDB at {settings.MONGODB_URL}...")
    db_manager.client = AsyncIOMotorClient(
        settings.MONGODB_URL,
        maxPoolSize=50,
        minPoolSize=10
    )
    db_manager.db = db_manager.client[settings.DATABASE_NAME]
    logger.info(f"Connected to database: {settings.DATABASE_NAME}")
    
    # Initialize indexes for performance and constraints
    await create_db_indexes()

async def close_mongo_connection():
    logger.info("Closing MongoDB connection...")
    if db_manager.client:
        db_manager.client.close()
    logger.info("MongoDB connection closed.")

async def create_db_indexes():
    """Create essential MongoDB indexes for users, posts, chats, stories, etc."""
    try:
        db = db_manager.db
        
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
        
        logger.info("Database indexes successfully initialized.")
    except Exception as e:
        logger.error(f"Error creating database indexes: {e}")
