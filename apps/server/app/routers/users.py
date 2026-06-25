from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.database import Database

from app.core.deps import get_current_user, get_db, oid, require_role
from app.core.security import hash_password, verify_password
from app.schemas.users import (
    LocaleUpdate,
    PasswordReset,
    SelfPasswordChange,
    UserAdminOut,
    UserCreate,
    UserUpdate,
)
from app.services.audit import log_action
from app.services.serialize import serialize_user

router = APIRouter(tags=["users"])


@router.get("/users", response_model=list[UserAdminOut])
def list_users(db: Database = Depends(get_db), _: dict = Depends(require_role("admin"))):
    return [serialize_user(u) for u in db.users.find().sort("created_at", -1)]


@router.post("/users", response_model=UserAdminOut, status_code=201)
def create_user(body: UserCreate, db: Database = Depends(get_db), admin: dict = Depends(require_role("admin"))):
    username = body.username.lower()
    if db.users.find_one({"username": username}):
        raise HTTPException(status.HTTP_409_CONFLICT, "Cet identifiant existe déjà")
    doc = {
        "username": username,
        "full_name": body.full_name,
        "password_hash": hash_password(body.password),
        "role": body.role,
        "preferred_locale": body.preferred_locale,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "last_login_at": None,
    }
    doc["_id"] = db.users.insert_one(doc).inserted_id
    log_action(db, actor_id=admin["_id"], action="create_user", entity="user", entity_id=username)
    return serialize_user(doc)


@router.patch("/users/me/locale", response_model=UserAdminOut)
def set_my_locale(body: LocaleUpdate, db: Database = Depends(get_db), user: dict = Depends(get_current_user)):
    db.users.update_one({"_id": user["_id"]}, {"$set": {"preferred_locale": body.preferred_locale}})
    return serialize_user(db.users.find_one({"_id": user["_id"]}))


@router.post("/users/me/password", status_code=204)
def change_my_password(body: SelfPasswordChange, db: Database = Depends(get_db), user: dict = Depends(get_current_user)):
    if not verify_password(body.current_password, user["password_hash"]):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Mot de passe actuel incorrect")
    db.users.update_one({"_id": user["_id"]}, {"$set": {"password_hash": hash_password(body.new_password)}})
    log_action(db, actor_id=user["_id"], action="self_password_change")


@router.patch("/users/{user_id}", response_model=UserAdminOut)
def update_user(user_id: str, body: UserUpdate, db: Database = Depends(get_db), admin: dict = Depends(require_role("admin"))):
    uid = oid(user_id)
    user = db.users.find_one({"_id": uid})
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Utilisateur introuvable")
    data = body.model_dump(exclude_none=True)
    if uid == admin["_id"] and (data.get("is_active") is False or data.get("role") == "clerk"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Vous ne pouvez pas désactiver ou rétrograder votre propre compte")
    if data:
        db.users.update_one({"_id": uid}, {"$set": data})
    log_action(db, actor_id=admin["_id"], action="update_user", entity="user", entity_id=str(uid))
    return serialize_user(db.users.find_one({"_id": uid}))


@router.post("/users/{user_id}/password", status_code=204)
def reset_password(user_id: str, body: PasswordReset, db: Database = Depends(get_db), admin: dict = Depends(require_role("admin"))):
    uid = oid(user_id)
    if db.users.find_one({"_id": uid}) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Utilisateur introuvable")
    db.users.update_one({"_id": uid}, {"$set": {"password_hash": hash_password(body.password)}})
    log_action(db, actor_id=admin["_id"], action="reset_password", entity="user", entity_id=str(uid))


@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: str, db: Database = Depends(get_db), admin: dict = Depends(require_role("admin"))):
    uid = oid(user_id)
    user = db.users.find_one({"_id": uid})
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Utilisateur introuvable")
    if uid == admin["_id"]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Vous ne pouvez pas supprimer votre propre compte")
    has_activity = (
        db.mail.find_one({"created_by": uid})
        or db.status_history.find_one({"changed_by": uid})
        or db.audit_log.find_one({"actor_id": uid})
        or db.attachments.find_one({"uploaded_by": uid})
    )
    if has_activity:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Cet utilisateur a une activité enregistrée (documents, journal). "
            "Désactivez-le plutôt que de le supprimer.",
        )
    db.users.delete_one({"_id": uid})
    log_action(db, actor_id=admin["_id"], action="delete_user", entity="user", entity_id=user["username"])
