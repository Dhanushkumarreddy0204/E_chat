import os
import uuid
from io import BytesIO

import pytest
from bson import ObjectId
from fastapi.testclient import TestClient
from pymongo import MongoClient

from app.core.config import settings
from app.main import app


def test_authenticated_social_chat_and_realtime_flows():
    probe = MongoClient(settings.MONGODB_URL, serverSelectionTimeoutMS=1000)
    try:
        probe.admin.command("ping")
    except Exception as exc:
        pytest.skip(f"MongoDB is unavailable: {exc}")
    finally:
        probe.close()

    suffix = uuid.uuid4().hex[:12]
    user_ids = []
    post_ids = []
    story_ids = []
    conversation_ids = []
    uploaded_name = None

    try:
        with TestClient(app) as client:
            assert client.get("/api/v1/auth/me").status_code == 401

            def register(username):
                response = client.post(
                    "/api/v1/auth/register",
                    json={
                        "username": username,
                        "email": f"{username}@example.com",
                        "password": "audit-pass-123",
                        "full_name": username.title(),
                    },
                )
                assert response.status_code == 201, response.text
                data = response.json()
                user_ids.append(data["user"]["id"])
                return data

            alice = register(f"audit_{suffix}")
            bob = register(f"peer_{suffix}")
            headers_a = {"Authorization": f"Bearer {alice['access_token']}"}
            headers_b = {"Authorization": f"Bearer {bob['access_token']}"}

            login = client.post(
                "/api/v1/auth/login",
                json={
                    "email_or_username": f"AUDIT_{suffix}",
                    "password": "audit-pass-123",
                },
            )
            assert login.status_code == 200
            assert client.post(
                "/api/v1/auth/login",
                json={"email_or_username": f"audit_{suffix}", "password": "wrong"},
            ).status_code == 401
            assert client.get("/api/v1/auth/me", headers=headers_a).json()["id"] == alice["user"]["id"]

            profile = client.put(
                "/api/v1/users/profile",
                headers=headers_a,
                json={"bio": "audit profile update"},
            )
            assert profile.status_code == 200
            assert profile.json()["bio"] == "audit profile update"
            assert client.post(
                f"/api/v1/users/{bob['user']['id']}/follow", headers=headers_a
            ).status_code == 200
            followers = client.get(
                f"/api/v1/users/{bob['user']['id']}/followers", headers=headers_a
            )
            assert any(user["id"] == alice["user"]["id"] for user in followers.json())
            assert client.delete(
                f"/api/v1/users/{bob['user']['id']}/unfollow", headers=headers_a
            ).status_code == 200

            post = client.post(
                "/api/v1/posts/",
                headers=headers_a,
                json={"caption": "audit post", "media": [], "tags": ["audit"]},
            )
            assert post.status_code == 201, post.text
            post_id = post.json()["id"]
            post_ids.append(post_id)
            feed = client.get("/api/v1/posts/feed", headers=headers_a).json()
            assert any(item["id"] == post_id for item in feed["items"])
            assert client.post(
                f"/api/v1/posts/{post_id}/like", headers=headers_b
            ).json()["is_liked"] is True
            assert client.post(
                f"/api/v1/posts/{post_id}/like", headers=headers_b
            ).json()["is_liked"] is False
            comment = client.post(
                f"/api/v1/posts/{post_id}/comments",
                headers=headers_b,
                json={"content": "audit comment"},
            )
            assert comment.status_code == 200
            assert len(client.get(f"/api/v1/posts/{post_id}/comments").json()) == 1
            assert client.post(
                f"/api/v1/posts/{post_id}/bookmark", headers=headers_a
            ).json()["is_bookmarked"] is True
            assert any(
                item["id"] == post_id
                for item in client.get("/api/v1/posts/saved/all", headers=headers_a).json()
            )
            assert client.post(
                f"/api/v1/posts/{post_id}/bookmark", headers=headers_a
            ).json()["is_bookmarked"] is False
            assert client.delete(
                f"/api/v1/posts/{post_id}", headers=headers_b
            ).status_code == 403

            clip = client.post(
                "/api/v1/posts/",
                headers=headers_a,
                json={
                    "caption": "audit clip",
                    "media": [{"url": "https://example.test/clip.mp4", "media_type": "video"}],
                    "is_clip": True,
                },
            )
            assert clip.status_code == 201, clip.text
            clip_id = clip.json()["id"]
            post_ids.append(clip_id)
            clips = client.get("/api/v1/posts/clips", headers=headers_a).json()
            assert any(item["id"] == clip_id for item in clips["items"])
            assert client.delete(f"/api/v1/posts/{clip_id}", headers=headers_a).status_code == 200

            story = client.post(
                "/api/v1/stories/",
                headers=headers_a,
                json={"media_url": "https://example.test/story.jpg", "caption": "audit story"},
            )
            assert story.status_code == 201, story.text
            story_id = story.json()["id"]
            story_ids.append(story_id)
            groups = client.get("/api/v1/stories/feed", headers=headers_b).json()
            assert any(item["id"] == story_id for group in groups for item in group["stories"])
            assert client.post(
                f"/api/v1/stories/{story_id}/view", headers=headers_b
            ).status_code == 200
            assert client.post(
                f"/api/v1/stories/{story_id}/react",
                headers=headers_b,
                json={"emoji": "\U0001f525"},
            ).status_code == 200
            assert client.delete(
                f"/api/v1/stories/{story_id}", headers=headers_b
            ).status_code == 403
            assert client.delete(
                f"/api/v1/stories/{story_id}", headers=headers_a
            ).status_code == 200

            upload = client.post(
                "/api/v1/upload/file",
                headers=headers_a,
                files={"file": ("audit.txt", BytesIO(b"audit upload"), "text/plain")},
            )
            assert upload.status_code == 200, upload.text
            uploaded_name = upload.json()["url"].rsplit("/", 1)[-1]
            assert upload.json()["media_type"] == "file"
            assert client.get(f"/uploads/{uploaded_name}").content == b"audit upload"

            conversation = client.post(
                "/api/v1/chat/conversations",
                headers=headers_a,
                json={"participant_ids": [bob["user"]["id"]], "is_group": False},
            )
            assert conversation.status_code == 200, conversation.text
            conversation_id = conversation.json()["id"]
            conversation_ids.append(conversation_id)
            duplicate = client.post(
                "/api/v1/chat/conversations",
                headers=headers_a,
                json={"participant_ids": [bob["user"]["id"]], "is_group": False},
            )
            assert duplicate.json()["id"] == conversation_id
            group = client.post(
                "/api/v1/chat/conversations",
                headers=headers_a,
                json={
                    "participant_ids": [bob["user"]["id"]],
                    "is_group": True,
                    "group_name": f"audit group {suffix}",
                },
            )
            assert group.status_code == 200 and group.json()["is_group"] is True

            with client.websocket_connect(f"/ws?token={bob['access_token']}") as socket_b:
                with client.websocket_connect(f"/ws?token={alice['access_token']}") as socket_a:
                    assert socket_b.receive_json()["type"] == "presence_update"
                    socket_b.send_json(
                        {
                            "type": "typing_start",
                            "data": {
                                "conversation_id": conversation_id,
                                "recipient_ids": [alice["user"]["id"]],
                            },
                        }
                    )
                    typing = socket_a.receive_json()
                    assert typing["type"] == "user_typing"
                    assert typing["data"]["is_typing"] is True

                    message = client.post(
                        "/api/v1/chat/messages",
                        headers=headers_a,
                        json={"conversation_id": conversation_id, "content": "audit realtime message"},
                    )
                    assert message.status_code == 200, message.text
                    message_id = message.json()["id"]
                    incoming = socket_b.receive_json()
                    assert incoming["type"] == "new_message"
                    assert incoming["data"]["id"] == message_id

                    reaction = client.post(
                        f"/api/v1/chat/messages/{message_id}/react",
                        headers=headers_b,
                        params={"emoji": "\U0001f525"},
                    )
                    assert reaction.status_code == 200
                    assert socket_a.receive_json()["type"] == "message_reaction"
                    assert client.post(
                        f"/api/v1/chat/conversations/{conversation_id}/read",
                        headers=headers_b,
                    ).status_code == 200
                    assert socket_a.receive_json()["type"] == "messages_read"

            messages = client.get(
                f"/api/v1/chat/conversations/{conversation_id}/messages", headers=headers_b
            )
            assert messages.status_code == 200
            assert any(item["id"] == message_id for item in messages.json())
            notifications = client.get("/api/v1/notifications/", headers=headers_a)
            assert notifications.status_code == 200 and notifications.json()
            assert client.post("/api/v1/notifications/read-all", headers=headers_a).status_code == 200
            assert client.get(
                "/api/v1/notifications/unread-count", headers=headers_a
            ).json()["unread_count"] == 0
    finally:
        mongo = MongoClient(settings.MONGODB_URL, serverSelectionTimeoutMS=3000)
        db = mongo[settings.DATABASE_NAME]
        conversation_docs = list(
            db.conversations.find({"participants": {"$in": user_ids}}, {"_id": 1})
        )
        conversation_ids.extend(str(doc["_id"]) for doc in conversation_docs)
        if user_ids:
            db.messages.delete_many(
                {
                    "$or": [
                        {"sender_id": {"$in": user_ids}},
                        {"conversation_id": {"$in": conversation_ids}},
                    ]
                }
            )
            db.notifications.delete_many(
                {"$or": [{"recipient_id": {"$in": user_ids}}, {"sender_id": {"$in": user_ids}}]}
            )
            db.story_views.delete_many(
                {"$or": [{"user_id": {"$in": user_ids}}, {"story_id": {"$in": story_ids}}]}
            )
            db.stories.delete_many({"user_id": {"$in": user_ids}})
            db.conversations.delete_many({"participants": {"$in": user_ids}})
            db.followers.delete_many(
                {"$or": [{"follower_id": {"$in": user_ids}}, {"following_id": {"$in": user_ids}}]}
            )
            db.comments.delete_many(
                {"$or": [{"user_id": {"$in": user_ids}}, {"post_id": {"$in": post_ids}}]}
            )
            db.likes.delete_many(
                {"$or": [{"user_id": {"$in": user_ids}}, {"post_id": {"$in": post_ids}}]}
            )
            db.bookmarks.delete_many(
                {"$or": [{"user_id": {"$in": user_ids}}, {"post_id": {"$in": post_ids}}]}
            )
            db.posts.delete_many({"user_id": {"$in": user_ids}})
            db.users.delete_many({"_id": {"$in": [ObjectId(user_id) for user_id in user_ids]}})
        if uploaded_name:
            upload_path = os.path.join(settings.UPLOAD_DIR, uploaded_name)
            if os.path.exists(upload_path):
                os.remove(upload_path)
        mongo.close()