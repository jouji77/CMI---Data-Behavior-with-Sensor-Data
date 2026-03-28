from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import random
import string
import hmac
import hashlib
import base64
import json
import time

import os

from database import get_db, User

router = APIRouter()

SECRET_KEY = "compressor-portal-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

security = HTTPBearer()

# In-memory OTP store (for local dev)
otp_store: dict[str, dict] = {}


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    company: str
    language: str = "ja"


class LoginRequest(BaseModel):
    email: str
    password: str


class SendOTPRequest(BaseModel):
    email: str


class VerifyOTPRequest(BaseModel):
    email: str
    otp: str


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    language: Optional[str] = None


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(s: str) -> bytes:
    padding = 4 - len(s) % 4
    if padding != 4:
        s += "=" * padding
    return base64.urlsafe_b64decode(s)


def create_access_token(data: dict) -> str:
    """Minimal HS256 JWT implementation using stdlib only."""
    header = _b64url_encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    expire = int(time.time()) + ACCESS_TOKEN_EXPIRE_HOURS * 3600
    payload = {**data, "exp": expire, "iat": int(time.time())}
    payload_enc = _b64url_encode(json.dumps(payload).encode())
    signing_input = f"{header}.{payload_enc}"
    sig = hmac.new(SECRET_KEY.encode(), signing_input.encode(), hashlib.sha256).digest()
    sig_enc = _b64url_encode(sig)
    return f"{signing_input}.{sig_enc}"


def decode_access_token(token: str) -> dict:
    """Decode and verify HS256 JWT using stdlib only."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Invalid token format")
        header_enc, payload_enc, sig_enc = parts
        signing_input = f"{header_enc}.{payload_enc}"
        expected_sig = hmac.new(SECRET_KEY.encode(), signing_input.encode(), hashlib.sha256).digest()
        actual_sig = _b64url_decode(sig_enc)
        if not hmac.compare_digest(expected_sig, actual_sig):
            raise ValueError("Invalid signature")
        payload = json.loads(_b64url_decode(payload_enc))
        if payload.get("exp", 0) < time.time():
            raise ValueError("Token expired")
        return payload
    except Exception as e:
        raise ValueError(f"Token decode failed: {e}")


def hash_password(plain: str) -> str:
    salt = os.urandom(16).hex()
    digest = hashlib.sha256(f"{salt}{plain}".encode()).hexdigest()
    return f"{salt}${digest}"


def verify_password(plain: str, hashed: str) -> bool:
    try:
        salt, digest = hashed.split("$", 1)
        return hmac.compare_digest(
            hashlib.sha256(f"{salt}{plain}".encode()).hexdigest(),
            digest,
        )
    except Exception:
        return False


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@router.post("/register")
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=req.email,
        name=req.name,
        company=req.company,
        language=req.language,
        role="customer",
        password_hash=hash_password(req.password),
        is_verified=False,
        created_at=datetime.utcnow(),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"message": "Registration successful. Please verify your email.", "user_id": user.id}


@router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": str(user.id)})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "company": user.company,
            "language": user.language,
            "role": user.role,
            "is_verified": user.is_verified,
        },
    }


@router.post("/send-otp")
async def send_otp(req: SendOTPRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    otp = "".join(random.choices(string.digits, k=6))
    otp_store[req.email] = {"otp": otp, "expires_at": datetime.utcnow() + timedelta(minutes=10)}

    # Local dev: log to console and return in response
    print(f"[OTP] Email: {req.email}, OTP: {otp}")

    return {"message": "OTP sent to email", "otp": otp, "dev_note": "OTP returned for local development only"}


@router.post("/verify-otp")
async def verify_otp(req: VerifyOTPRequest, db: AsyncSession = Depends(get_db)):
    stored = otp_store.get(req.email)
    if not stored:
        raise HTTPException(status_code=400, detail="No OTP found for this email")
    if datetime.utcnow() > stored["expires_at"]:
        raise HTTPException(status_code=400, detail="OTP has expired")
    if stored["otp"] != req.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_verified = True
    await db.commit()
    del otp_store[req.email]

    token = create_access_token({"sub": str(user.id)})
    return {
        "message": "Email verified successfully",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "company": user.company,
            "language": user.language,
            "role": user.role,
            "is_verified": user.is_verified,
        },
    }


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "company": current_user.company,
        "language": current_user.language,
        "role": current_user.role,
        "is_verified": current_user.is_verified,
        "created_at": current_user.created_at,
    }


@router.put("/me")
async def update_me(
    req: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if req.name is not None:
        current_user.name = req.name
    if req.company is not None:
        current_user.company = req.company
    if req.language is not None:
        current_user.language = req.language
    await db.commit()
    await db.refresh(current_user)
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "company": current_user.company,
        "language": current_user.language,
        "role": current_user.role,
        "is_verified": current_user.is_verified,
    }
