import uuid
from typing import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import SessionLocal
from app.models.user import AppUser

bearer = HTTPBearer(auto_error=True)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> AppUser:
    try:
        claims = decode_token(creds.credentials)
        if claims.get("type") != "access":
            raise ValueError("not an access token")
        user_id = uuid.UUID(claims["sub"])
    except Exception:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Identifiants invalides")
    user = db.get(AppUser, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Compte inactif")
    return user


def require_role(*roles: str):
    def _guard(user: AppUser = Depends(get_current_user)) -> AppUser:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Accès refusé")
        return user

    return _guard
