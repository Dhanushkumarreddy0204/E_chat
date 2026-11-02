import sys
import unittest
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

def test_imports_and_schemas():
    print("[TEST] Testing backend modules import...")
    from app.main import app
    from app.core.config import settings
    from app.core.security import verify_password, get_password_hash, create_access_token, decode_access_token
    from app.schemas.user import UserCreate, UserLogin, UserOut
    from app.schemas.post import PostCreate, PostOut
    from app.schemas.story import StoryCreate, StoryOut
    from app.schemas.chat import MessageCreate, MessageOut, ConversationOut
    from app.schemas.notification import NotificationOut
    from app.websockets.manager import ws_manager
    print("[PASS] All schemas, routers, and WebSocket manager imported successfully!")

    # Test Security Functions
    raw_pass = "SecurePassword123!"
    hashed = get_password_hash(raw_pass)
    assert verify_password(raw_pass, hashed) == True
    assert verify_password("wrong", hashed) == False
    print("[PASS] Password hashing & verification test passed!")

    # Test JWT token issuance & decoding
    user_id = "60d5ec49f1b2c82b8c8b4567"
    token = create_access_token(subject=user_id)
    payload = decode_access_token(token)
    assert payload is not None
    assert payload.get("sub") == user_id
    print("[PASS] JWT Access Token creation and decoding test passed!")

    # Test Schema Validation
    user_in = UserCreate(
        username="test_user",
        email="test@echat.com",
        password="password123",
        full_name="Test User"
    )
    assert user_in.username == "test_user"
    print("[PASS] Pydantic request/response schema validations passed!")

    # Test OpenAPI schema generation
    schema = app.openapi()
    assert "paths" in schema
    assert len(schema["paths"]) > 0
    print(f"[PASS] OpenAPI specification generated successfully ({len(schema['paths'])} endpoints)!")

    # Test FastAPI Root Endpoint
    from app.main import root
    coro = root()
    try:
        coro.send(None)
    except StopIteration as exc:
        root_res = exc.value
        assert root_res.get("service") == "EChat Backend API"
        assert root_res.get("status") == "online"
        print("[PASS] FastAPI Root Endpoint test passed!")

    print("\n==========================================")
    print("ALL BACKEND SUITE TESTS PASSED (100% OK)")
    print("==========================================")

if __name__ == "__main__":
    test_imports_and_schemas()
