from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from app.core.security import decode_token
from app.core.database import get_db
from motor.motor_asyncio import AsyncIOMotorDatabase

bearer_scheme = HTTPBearer()


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    """FastAPI dependency: validates JWT and returns the user_id string."""
    try:
        user_id = decode_token(credentials.credentials)
        return user_id
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is invalid or expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_database() -> AsyncIOMotorDatabase:
    return get_db()
