import os
import json
import secrets
from typing import Annotated
from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=(".env", "backend/.env"),
        extra="ignore",
        hide_input_in_errors=True,
    )

    PROJECT_NAME: str = "EChat"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # MongoDB Atlas Connection
    MONGODB_URL: str = os.getenv(
        "MONGODB_URL",
        "mongodb+srv://<db_username>:<db_password>@<cluster-address>.mongodb.net/?retryWrites=true&w=majority"
    )
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "EChatCluster")
    
    # Media Storage
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
    
    # CORS
    BACKEND_CORS_ORIGINS: Annotated[list[str], NoDecode] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v):
        if isinstance(v, str):
            v = v.strip()
            v = json.loads(v) if v.startswith("[") else v.split(",")
        if isinstance(v, list) and all(isinstance(origin, str) for origin in v):
            return [origin.strip().rstrip("/") for origin in v if origin.strip()]
        return v

settings = Settings()
if os.getenv("RENDER", "").lower() == "true" and (
    len(settings.SECRET_KEY.strip()) < 32
    or settings.SECRET_KEY.startswith(("echat-production-super-secret-", "change-this-to-"))
):
    raise RuntimeError("Set a unique, random SECRET_KEY of at least 32 characters on Render.")
if not settings.SECRET_KEY.strip():
    settings.SECRET_KEY = secrets.token_urlsafe(48)
