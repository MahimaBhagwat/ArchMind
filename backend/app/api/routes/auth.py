"""Auth routes — port of server/routes/auth.js"""
from fastapi import APIRouter, HTTPException, status, Depends
from app.models.user import UserRegister, UserLogin, RegisterResponse, TokenResponse, UserOut
from app.core.security import hash_password, verify_password, create_access_token
from app.core.database import get_db
from app.api.deps import get_database
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from pymongo.errors import DuplicateKeyError

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(body: UserRegister, db: AsyncIOMotorDatabase = Depends(get_database)):
    hashed = hash_password(body.password)
    try:
        result = await db["users"].insert_one({
            "email": body.email.strip().lower(),
            "password": hashed,
        })
        user_id = str(result.inserted_id)
        token = create_access_token(user_id)
        return RegisterResponse(
            message="User registered successfully.",
            user=UserOut(id=user_id, email=body.email.strip().lower()),
            token=token,
        )
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin, db: AsyncIOMotorDatabase = Depends(get_database)):
    user = await db["users"].find_one({"email": body.email.strip().lower()})
    if not user or not verify_password(body.password, user.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = create_access_token(str(user["_id"]))
    return TokenResponse(token=token)
