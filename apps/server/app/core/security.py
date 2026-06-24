from datetime import datetime, timedelta, timezone

import jwt
from passlib.context import CryptContext

from app.core.config import settings

_pwd = CryptContext(schemes=["argon2"], deprecated="auto")
ALGO = "HS256"


def hash_password(raw: str) -> str:
    return _pwd.hash(raw)


def verify_password(raw: str, hashed: str) -> bool:
    return _pwd.verify(raw, hashed)


def _token(subject: str, role: str, ttl: timedelta, kind: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": subject, "role": role, "type": kind, "iat": now, "exp": now + ttl}
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGO)


def create_access_token(subject: str, role: str) -> str:
    return _token(subject, role, timedelta(minutes=settings.jwt_access_ttl_min), "access")


def create_refresh_token(subject: str, role: str) -> str:
    return _token(subject, role, timedelta(days=settings.jwt_refresh_ttl_days), "refresh")


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=[ALGO])
