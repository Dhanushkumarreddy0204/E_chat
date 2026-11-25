import sys
import unittest
import asyncio
import json

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
    from app.main import root, health_check
    coro = root()
    try:
        coro.send(None)
    except StopIteration as exc:
        root_res = exc.value
        assert root_res.get("service") == "EChat Backend API"
        assert root_res.get("status") == "online"
        print("[PASS] FastAPI Root Endpoint test passed!")

    # Test Health Endpoint
    h_coro = health_check()
    try:
        h_coro.send(None)
    except StopIteration as exc:
        health_res = json.loads(exc.value.body)
        assert "status" in health_res
        assert "database" in health_res
        assert exc.value.status_code == 503
        print(f"[PASS] Health check endpoint verified! (status={health_res['status']}, database={health_res['database']})")

    # Test placeholder detection and fail-fast startup behavior
    from app.core.database import _is_placeholder_url, mask_mongodb_uri, clean_mongodb_uri, get_database, connect_to_mongo
    from fastapi import HTTPException
    assert _is_placeholder_url("mongodb+srv://<db_username>:<db_password>@<cluster-address>.mongodb.net/") is True
    assert _is_placeholder_url("mongodb+srv://test_user:test_pass@cluster0.example.com/") is False
    print("[PASS] Placeholder URL detection verified!")

    # Test clean_mongodb_uri
    cleaned = clean_mongodb_uri("mongodb+srv://<admin>:<pass123>@cluster0.example.com/")
    assert "<" not in cleaned and ">" not in cleaned
    assert "admin:pass123@" in cleaned
    print("[PASS] clean_mongodb_uri strips accidental angle brackets!")

    # Test that get_database raises HTTPException(503) when db is uninitialized
    import app.core.database as db_mod
    original_db = db_mod.db
    db_mod.db = None
    try:
        coro = get_database()
        try:
            coro.send(None)
        except StopIteration:
            pass
        assert False, "get_database should have raised HTTPException 503"
    except HTTPException as http_exc:
        assert http_exc.status_code == 503
        print("[PASS] get_database() raises 503 Service Unavailable when db is uninitialized (prevents crashes)!")
    finally:
        db_mod.db = original_db

    # Test that connect_to_mongo raises RuntimeError on placeholder URL (fail fast on startup)
    orig_url = settings.MONGODB_URL
    try:
        settings.MONGODB_URL = "mongodb+srv://<db_username>:<db_password>@<cluster-address>.mongodb.net/"
        coro = connect_to_mongo()
        try:
            coro.send(None)
        except StopIteration:
            pass
        assert False, "connect_to_mongo should have failed on placeholder URL"
    except RuntimeError as r_exc:
        assert "placeholder" in str(r_exc).lower()
        print("[PASS] connect_to_mongo() fails fast with descriptive RuntimeError on placeholder URL!")
    finally:
        settings.MONGODB_URL = orig_url

    # Test MongoDB URI Masking & Atlas URI format handling
    from app.core.database import mask_mongodb_uri
    sample_atlas = "mongodb+srv://test_admin:test_secret@cluster0.example.com/?retryWrites=true&w=majority"
    masked = mask_mongodb_uri(sample_atlas)
    assert "test_secret" not in masked
    assert "test_admin:****@" in masked
    print("[PASS] MongoDB URI credential masking verified!")

    # Test CORS Origins parsing
    from app.core.config import Settings
    cors_test = Settings.assemble_cors_origins("https://echat.app, https://admin.echat.app")
    assert cors_test == ["https://echat.app", "https://admin.echat.app"]
    print("[PASS] CORS comma-separated origins parsing verified!")

    print("\n==========================================")
    print("ALL BACKEND SUITE TESTS PASSED (100% OK)")
    print("==========================================")

if __name__ == "__main__":
    test_imports_and_schemas()
