from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # AI Provider
    ai_provider: str = "groq"
    groq_api_key: str = ""
    groq_model: str = "qwen/qwen3.8-27b"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    # MongoDB
    mongodb_uri: str = "mongodb://localhost:27017/precode"

    # JWT
    jwt_secret: str = "change-me-in-production"
    jwt_expire_hours: int = 168  # 7 days

    # CORS
    cors_origins: str = "http://localhost:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache()
def get_settings() -> Settings:
    return Settings()
