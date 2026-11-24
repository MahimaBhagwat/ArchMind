from datetime import datetime, timedelta, timezone
import bcrypt
from jose import JWTError, jwt
from app.core.config import get_settings

# bcrypt has a hard 72-byte limit per the protocol spec; truncate before hashing.
_BCRYPT_MAX = 72


def hash_password(password: str) -> str:
    secret = password.encode("utf-8")[:_BCRYPT_MAX]
    return bcrypt.hashpw(secret, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    secret = plain.encode("utf-8")[:_BCRYPT_MAX]
    return bcrypt.checkpw(secret, hashed.encode("utf-8"))


def create_access_token(user_id: str) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expire_hours)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_token(token: str) -> str:
    """Decode and validate a JWT. Returns the user_id (sub) or raises JWTError."""
    settings = get_settings()
    payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    user_id: str | None = payload.get("sub")
    if not user_id:
        raise JWTError("Token missing subject.")
    return user_id
