from bson import ObjectId
from bson.errors import InvalidId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pymongo.database import Database

from app.core.security import decode_token
from app.db.mongo import db

bearer = HTTPBearer(auto_error=True)


def oid(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Identifiant invalide")


def get_db() -> Database:
    return db


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    database: Database = Depends(get_db),
) -> dict:
    try:
        claims = decode_token(creds.credentials)
        if claims.get("type") != "access":
            raise ValueError("not an access token")
        user_id = ObjectId(claims["sub"])
    except (InvalidId, Exception):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Identifiants invalides")
    user = database.users.find_one({"_id": user_id})
    if user is None or not user.get("is_active", True):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Compte inactif")
    return user


def require_role(*roles: str):
    def _guard(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Accès refusé")
        return user

    return _guard
