import os
import json
from typing import Annotated, List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=(".env", "backend/.env"),
        extra="ignore"
    )

    PROJECT_NAME: str = "EChat"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "echat-production-super-secret-jwt-key-2025")
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
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:8000")
    
    # CORS
    BACKEND_CORS_ORIGINS: Annotated[List[str], NoDecode] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                try:
                    parsed = json.loads(v)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed if str(item).strip()]
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, tuple, set)):
            return [str(i).strip() for i in v if str(i).strip()]
        return v

settings = Settings()
