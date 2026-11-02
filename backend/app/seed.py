import asyncio
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.core.security import get_password_hash

async def seed_data():
    print(f"Connecting to MongoDB at {settings.MONGODB_URL}...")
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]

    print("Cleaning existing database...")
    await db.users.delete_many({})
    await db.posts.delete_many({})
    await db.comments.delete_many({})
    await db.likes.delete_many({})
    await db.stories.delete_many({})
    await db.story_views.delete_many({})
    await db.conversations.delete_many({})
    await db.messages.delete_many({})
    await db.notifications.delete_many({})
    await db.followers.delete_many({})
    await db.bookmarks.delete_many({})

    print("Seeding demo users...")
    now = datetime.utcnow()
    hashed_pwd = get_password_hash("password123")

    users_data = [
        {
            "username": "dhanush",
            "email": "dhanush@echat.com",
            "password_hash": hashed_pwd,
            "full_name": "Dhanush Kumar",
            "bio": "Full-Stack Architect & AI Enthusiast 🚀 | Building next-gen real-time applications.",
            "avatar_url": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80",
            "cover_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
            "website": "https://github.com/dhanush",
            "location": "San Francisco, CA",
            "is_private": False,
            "created_at": now - timedelta(days=30),
            "updated_at": now
        },
        {
            "username": "sarah_designer",
            "email": "sarah@echat.com",
            "password_hash": hashed_pwd,
            "full_name": "Sarah Jenkins",
            "bio": "Lead Product Designer @ Figma fan | Glassmorphism & UI/UX lover ✨",
            "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
            "cover_url": "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80",
            "website": "https://sarahdesign.io",
            "location": "London, UK",
            "is_private": False,
            "created_at": now - timedelta(days=25),
            "updated_at": now
        },
        {
            "username": "alex_tech",
            "email": "alex@echat.com",
            "password_hash": hashed_pwd,
            "full_name": "Alex Rivera",
            "bio": "Distributed Systems & Cloud Engineer ☁️ | Docker, Kubernetes & Rust.",
            "avatar_url": "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=400&q=80",
            "cover_url": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80",
            "website": "https://alexrivera.dev",
            "location": "Austin, TX",
            "is_private": False,
            "created_at": now - timedelta(days=20),
            "updated_at": now
        },
        {
            "username": "elena_travel",
            "email": "elena@echat.com",
            "password_hash": hashed_pwd,
            "full_name": "Elena Rostova",
            "bio": "Photographer & Digital Nomad 📸 35 countries and counting! 🌍",
            "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
            "cover_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
            "website": "https://elenatravels.blog",
            "location": "Bali, Indonesia",
            "is_private": False,
            "created_at": now - timedelta(days=15),
            "updated_at": now
        }
    ]

    inserted_users = await db.users.insert_many(users_data)
    user_ids = [str(uid) for uid in inserted_users.inserted_ids]
    u1, u2, u3, u4 = user_ids[0], user_ids[1], user_ids[2], user_ids[3]

    print("Seeding social follow graph...")
    followers_data = [
        {"follower_id": u1, "following_id": u2, "created_at": now},
        {"follower_id": u1, "following_id": u3, "created_at": now},
        {"follower_id": u1, "following_id": u4, "created_at": now},
        {"follower_id": u2, "following_id": u1, "created_at": now},
        {"follower_id": u3, "following_id": u1, "created_at": now},
        {"follower_id": u4, "following_id": u1, "created_at": now},
        {"follower_id": u2, "following_id": u3, "created_at": now},
    ]
    await db.followers.insert_many(followers_data)

    print("Seeding posts & likes...")
    posts_data = [
        {
            "user_id": u1,
            "caption": "Excited to unveil EChat! 🚀 A complete modern social networking platform built with FastAPI, React, and MongoDB WebSockets! Check out the real-time chat & sleek interface. #coding #FullStack #FastAPI #React",
            "media": [
                {"url": "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1000&q=80", "media_type": "image", "aspect_ratio": 1.5}
            ],
            "location": "Silicon Valley, CA",
            "tags": ["coding", "FullStack", "FastAPI", "React"],
            "shares_count": 14,
            "created_at": now - timedelta(hours=3),
            "updated_at": now - timedelta(hours=3)
        },
        {
            "user_id": u2,
            "caption": "Working on some fresh dark-mode glassmorphism aesthetics today! What do you guys think of purple/indigo neon highlights? 💜🎨 #Design #UIUX #ModernWeb",
            "media": [
                {"url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80", "media_type": "image", "aspect_ratio": 1.33}
            ],
            "location": "London Studio",
            "tags": ["Design", "UIUX", "ModernWeb"],
            "shares_count": 8,
            "created_at": now - timedelta(hours=6),
            "updated_at": now - timedelta(hours=6)
        },
        {
            "user_id": u4,
            "caption": "Sunset reflections over the ocean in Uluwatu. The tranquility here is unmatched 🌅🌊 #travel #wanderlust #sunset",
            "media": [
                {"url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80", "media_type": "image", "aspect_ratio": 1.6}
            ],
            "location": "Uluwatu, Bali",
            "tags": ["travel", "wanderlust", "sunset"],
            "shares_count": 29,
            "created_at": now - timedelta(hours=10),
            "updated_at": now - timedelta(hours=10)
        },
        {
            "user_id": u3,
            "caption": "Docker multi-stage builds reduced our production container sizes by 75%! High concurrency WebSockets are performing like a dream under load testing 🔥⚡ #DevOps #Docker #Scalability",
            "media": [
                {"url": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1000&q=80", "media_type": "image", "aspect_ratio": 1.5}
            ],
            "location": "Cloud Data Center",
            "tags": ["DevOps", "Docker", "Scalability"],
            "shares_count": 5,
            "created_at": now - timedelta(hours=14),
            "updated_at": now - timedelta(hours=14)
        }
    ]

    inserted_posts = await db.posts.insert_many(posts_data)
    post_ids = [str(pid) for pid in inserted_posts.inserted_ids]

    # Seed likes
    likes_data = [
        {"post_id": post_ids[0], "user_id": u2, "created_at": now},
        {"post_id": post_ids[0], "user_id": u3, "created_at": now},
        {"post_id": post_ids[0], "user_id": u4, "created_at": now},
        {"post_id": post_ids[1], "user_id": u1, "created_at": now},
        {"post_id": post_ids[2], "user_id": u1, "created_at": now},
        {"post_id": post_ids[2], "user_id": u2, "created_at": now},
    ]
    await db.likes.insert_many(likes_data)

    # Seed comments
    comments_data = [
        {"post_id": post_ids[0], "user_id": u2, "content": "This UI is stunning! Love the glassmorphism and real-time vibe 🔥", "created_at": now - timedelta(hours=2), "likes_count": 3},
        {"post_id": post_ids[0], "user_id": u3, "content": "FastAPI + MongoDB async Motor is such a solid combination.", "created_at": now - timedelta(hours=1), "likes_count": 1},
        {"post_id": post_ids[1], "user_id": u1, "content": "The purple gradient highlights look ultra clean! 💯", "created_at": now - timedelta(hours=4), "likes_count": 2},
    ]
    await db.comments.insert_many(comments_data)

    print("Seeding active stories (24h)...")
    stories_data = [
        {
            "user_id": u1,
            "media_url": "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80",
            "media_type": "image",
            "caption": "Late night coding session 💻☕",
            "duration_seconds": 6,
            "background_color": "#0d1117",
            "created_at": now - timedelta(hours=2),
            "expires_at": now + timedelta(hours=22)
        },
        {
            "user_id": u2,
            "media_url": "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80",
            "media_type": "image",
            "caption": "Morning coffee & wireframing 🎨✨",
            "duration_seconds": 5,
            "background_color": "#161b22",
            "created_at": now - timedelta(hours=5),
            "expires_at": now + timedelta(hours=19)
        },
        {
            "user_id": u4,
            "media_url": "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80",
            "media_type": "image",
            "caption": "Chasing waterfalls in Ubud! 🌊🌴",
            "duration_seconds": 7,
            "background_color": "#0f172a",
            "created_at": now - timedelta(hours=8),
            "expires_at": now + timedelta(hours=16)
        }
    ]
    await db.stories.insert_many(stories_data)

    print("Seeding conversations & messages...")
    conv_1 = {
        "is_group": False,
        "group_name": None,
        "group_avatar": None,
        "group_admins": [],
        "participants": [u1, u2],
        "created_at": now - timedelta(days=2),
        "updated_at": now - timedelta(minutes=5)
    }
    conv_2 = {
        "is_group": True,
        "group_name": "🚀 Core Dev & Design Squad",
        "group_avatar": "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&q=80",
        "group_admins": [u1],
        "participants": [u1, u2, u3],
        "created_at": now - timedelta(days=5),
        "updated_at": now - timedelta(minutes=15)
    }

    res_conv1 = await db.conversations.insert_one(conv_1)
    res_conv2 = await db.conversations.insert_one(conv_2)
    c1_id = str(res_conv1.inserted_id)
    c2_id = str(res_conv2.inserted_id)

    messages_data = [
        {
            "conversation_id": c1_id,
            "sender_id": u2,
            "content": "Hey Dhanush! How is the new real-time WebSocket messaging layer coming along?",
            "message_type": "text",
            "media_url": None,
            "reactions": [{"user_id": u1, "username": "dhanush", "emoji": "👍", "created_at": now}],
            "read_by": [u2, u1],
            "created_at": now - timedelta(minutes=25)
        },
        {
            "conversation_id": c1_id,
            "sender_id": u1,
            "content": "Hey Sarah! It's working seamlessly. Latency is virtually zero and typing indicators are live! 🚀",
            "message_type": "text",
            "media_url": None,
            "reactions": [{"user_id": u2, "username": "sarah_designer", "emoji": "❤️", "created_at": now}],
            "read_by": [u1, u2],
            "created_at": now - timedelta(minutes=20)
        },
        {
            "conversation_id": c1_id,
            "sender_id": u2,
            "content": "Awesome! I'll test the story reactions and comment threads next.",
            "message_type": "text",
            "media_url": None,
            "reactions": [],
            "read_by": [u2, u1],
            "created_at": now - timedelta(minutes=5)
        },
        # Group messages
        {
            "conversation_id": c2_id,
            "sender_id": u3,
            "content": "Docker containers are humming smoothly. Ready for deployment!",
            "message_type": "text",
            "media_url": None,
            "reactions": [{"user_id": u1, "username": "dhanush", "emoji": "🔥", "created_at": now}],
            "read_by": [u3, u1],
            "created_at": now - timedelta(minutes=15)
        }
    ]
    await db.messages.insert_many(messages_data)

    print("Seeding sample notifications...")
    notifications_data = [
        {
            "recipient_id": u1,
            "sender_id": u2,
            "notification_type": "like_post",
            "content": "Sarah Jenkins liked your post: 'Excited to unveil EChat! 🚀'",
            "entity_id": post_ids[0],
            "entity_type": "post",
            "entity_preview": "Excited to unveil EChat! 🚀",
            "is_read": False,
            "created_at": now - timedelta(minutes=45),
            "data": {}
        },
        {
            "recipient_id": u1,
            "sender_id": u4,
            "notification_type": "follow",
            "content": "Elena Rostova started following you.",
            "entity_id": u4,
            "entity_type": "user",
            "entity_preview": None,
            "is_read": True,
            "created_at": now - timedelta(hours=3),
            "data": {}
        }
    ]
    await db.notifications.insert_many(notifications_data)

    print("Database seeding completed successfully! ✨")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_data())
