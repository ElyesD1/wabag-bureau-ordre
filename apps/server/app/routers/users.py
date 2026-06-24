import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_role
from app.core.security import hash_password, verify_password
from app.models.user import AppUser
from app.schemas.users import (
    LocaleUpdate,
    PasswordReset,
    SelfPasswordChange,
    UserAdminOut,
    UserCreate,
    UserUpdate,
)
from app.services.audit import log_action

router = APIRouter(tags=["users"])


@router.get("/users", response_model=list[UserAdminOut])
def list_users(db: Session = Depends(get_db), _: AppUser = Depends(require_role("admin"))):
    return list(db.scalars(select(AppUser).order_by(AppUser.created_at.desc())).all())


@router.post("/users", response_model=UserAdminOut, status_code=201)
def create_user(
    body: UserCreate, db: Session = Depends(get_db), admin: AppUser = Depends(require_role("admin"))
):
    if db.scalar(select(AppUser).where(AppUser.username == body.username)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Cet identifiant existe déjà")
    user = AppUser(
        username=body.username,
        full_name=body.full_name,
        password_hash=hash_password(body.password),
        role=body.role,
        preferred_locale=body.preferred_locale,
    )
    db.add(user)
    log_action(db, actor_id=admin.id, action="create_user", entity="app_user", entity_id=body.username)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/me/locale", response_model=UserAdminOut)
def set_my_locale(
    body: LocaleUpdate, db: Session = Depends(get_db), user: AppUser = Depends(get_current_user)
):
    me = db.get(AppUser, user.id)
    me.preferred_locale = body.preferred_locale
    db.commit()
    db.refresh(me)
    return me


@router.post("/users/me/password", status_code=204)
def change_my_password(
    body: SelfPasswordChange,
    db: Session = Depends(get_db),
    user: AppUser = Depends(get_current_user),
):
    me = db.get(AppUser, user.id)
    if not verify_password(body.current_password, me.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Mot de passe actuel incorrect")
    me.password_hash = hash_password(body.new_password)
    log_action(db, actor_id=me.id, action="self_password_change")
    db.commit()


@router.patch("/users/{user_id}", response_model=UserAdminOut)
def update_user(
    user_id: uuid.UUID,
    body: UserUpdate,
    db: Session = Depends(get_db),
    admin: AppUser = Depends(require_role("admin")),
):
    user = db.get(AppUser, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Utilisateur introuvable")
    data = body.model_dump(exclude_none=True)
    if user.id == admin.id and (data.get("is_active") is False or data.get("role") == "clerk"):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Vous ne pouvez pas désactiver ou rétrograder votre propre compte",
        )
    for key, value in data.items():
        setattr(user, key, value)
    log_action(db, actor_id=admin.id, action="update_user", entity="app_user", entity_id=str(user_id))
    db.commit()
    db.refresh(user)
    return user


@router.post("/users/{user_id}/password", status_code=204)
def reset_password(
    user_id: uuid.UUID,
    body: PasswordReset,
    db: Session = Depends(get_db),
    admin: AppUser = Depends(require_role("admin")),
):
    user = db.get(AppUser, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Utilisateur introuvable")
    user.password_hash = hash_password(body.password)
    log_action(db, actor_id=admin.id, action="reset_password", entity="app_user", entity_id=str(user_id))
    db.commit()


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin: AppUser = Depends(require_role("admin")),
):
    user = db.get(AppUser, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Utilisateur introuvable")
    if user.id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Vous ne pouvez pas supprimer votre propre compte")
    try:
        db.delete(user)
        log_action(db, actor_id=admin.id, action="delete_user", entity="app_user", entity_id=str(user_id))
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Cet utilisateur a une activité enregistrée (documents, journal). "
            "Désactivez-le plutôt que de le supprimer.",
        )
