from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.database import Database

from app.core.deps import get_current_user, get_db
from app.core.security import create_access_token, create_refresh_token, verify_password
from app.schemas.auth import LoginIn, TokenOut, UserOut
from app.services.audit import log_action

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Database = Depends(get_db)) -> TokenOut:
    user = db.users.find_one({"username": body.username.lower()})
    if user is None or not user.get("is_active", True) or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Identifiant ou mot de passe incorrect")
    db.users.update_one({"_id": user["_id"]}, {"$set": {"last_login_at": datetime.now(timezone.utc)}})
    log_action(db, actor_id=user["_id"], action="login")
    sub, role = str(user["_id"]), user["role"]
    return TokenOut(
        access_token=create_access_token(sub, role),
        refresh_token=create_refresh_token(sub, role),
    )


@router.get("/me", response_model=UserOut)
def me(user: dict = Depends(get_current_user)) -> UserOut:
    return UserOut(
        id=str(user["_id"]),
        username=user["username"],
        full_name=user["full_name"],
        role=user["role"],
        preferred_locale=user.get("preferred_locale", "fr"),
    )
