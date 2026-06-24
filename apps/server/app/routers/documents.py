import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.history import StatusHistory
from app.models.mail import MailRecord
from app.models.user import AppUser
from app.schemas.mail import MailCreate, MailOut, PageOut, StatusUpdate
from app.services.numbering import allocate_and_insert

router = APIRouter(tags=["documents"])
_REG = {"entree": "E", "sortie": "S"}


def _reg_code(register: str) -> str:
    if register not in _REG:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Registre inconnu")
    return _REG[register]


@router.post("/registers/{register}/documents", response_model=MailOut, status_code=201)
def saisie(
    register: str,
    body: MailCreate,
    db: Session = Depends(get_db),
    user: AppUser = Depends(get_current_user),
) -> MailRecord:
    code = _reg_code(register)
    rec = allocate_and_insert(
        db, register=code, created_by=user.id, data=body.model_dump(exclude_none=True)
    )
    db.add(
        StatusHistory(
            mail_record_id=rec.id,
            old_status=None,
            new_status=rec.dernier_statut,
            changed_by=user.id,
        )
    )
    db.commit()
    db.refresh(rec)
    return rec


@router.get("/registers/{register}/documents", response_model=PageOut)
def consultation(
    register: str,
    q: str | None = None,
    type_document: str | None = None,
    statut: str | None = None,
    projet: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    db: Session = Depends(get_db),
    _: AppUser = Depends(get_current_user),
) -> PageOut:
    code = _reg_code(register)
    stmt = select(MailRecord).where(MailRecord.register == code)
    if type_document:
        stmt = stmt.where(MailRecord.type_document == type_document)
    if statut:
        stmt = stmt.where(MailRecord.dernier_statut == statut)
    if projet:
        stmt = stmt.where(MailRecord.projet == projet)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(
                MailRecord.no_ordre.ilike(like),
                MailRecord.objet.ilike(like),
                MailRecord.expediteur.ilike(like),
                MailRecord.reference.ilike(like),
                MailRecord.destinataire.ilike(like),
            )
        )
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(
        stmt.order_by(MailRecord.seq.desc()).offset((page - 1) * page_size).limit(page_size)
    ).all()
    return PageOut(items=list(rows), total=total or 0, page=page, page_size=page_size)


@router.patch("/documents/{doc_id}/status", response_model=MailOut)
def update_status(
    doc_id: uuid.UUID,
    body: StatusUpdate,
    db: Session = Depends(get_db),
    user: AppUser = Depends(get_current_user),
) -> MailRecord:
    rec = db.get(MailRecord, doc_id)
    if rec is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document introuvable")
    old = rec.dernier_statut
    rec.dernier_statut = body.new_status
    rec.modified_by = user.id
    rec.modified_at = datetime.now(timezone.utc)
    db.add(
        StatusHistory(
            mail_record_id=rec.id,
            old_status=old,
            new_status=body.new_status,
            changed_by=user.id,
            note=body.note,
        )
    )
    db.commit()
    db.refresh(rec)
    return rec
