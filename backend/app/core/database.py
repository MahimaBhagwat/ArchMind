from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import get_settings

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_db() -> None:
    global _client, _db
    settings = get_settings()
    _client = AsyncIOMotorClient(settings.mongodb_uri)
    try:
        # Use the database name from the URI if present
        _db = _client.get_default_database()
    except Exception:
        # No database name in URI — fall back to "archmind"
        _db = _client["archmind"]
    # Ensure unique index on users.email
    await _db["users"].create_index("email", unique=True)


async def close_db() -> None:
    global _client
    if _client:
        _client.close()


def get_db() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("Database not connected. Call connect_db() first.")
    return _db
