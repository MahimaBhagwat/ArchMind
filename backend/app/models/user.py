from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str


class TokenResponse(BaseModel):
    token: str


class RegisterResponse(BaseModel):
    message: str
    user: UserOut
    token: str
