import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import exists, func, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.audit import Attachment
from app.models.history import StatusHistory
from app.models.mail import MailRecord
from app.models.user import AppUser
from app.schemas.mail import (
    AttachmentOut,
    MailCreate,
    MailDetailOut,
    MailOut,
    MailUpdate,
    PageOut,
    StatusHistoryOut,
    StatusUpdate,
)
from app.services.audit import log_action
from app.services.insights import apply_bucket
from app.services.numbering import allocate_and_insert
from app.services.queries import build_mail_query

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
    log_action(db, actor_id=user.id, action="create_record",
               entity="mail_record", entity_id=str(rec.id))
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
    bucket: str | None = None,
    overdue_days: int = Query(7, ge=1, le=365),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    db: Session = Depends(get_db),
    _: AppUser = Depends(get_current_user),
) -> PageOut:
    code = _reg_code(register)
    stmt = build_mail_query(code, q=q, type_document=type_document, statut=statut, projet=projet)
    stmt = apply_bucket(stmt, bucket, overdue_days)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    has_pdf_expr = exists().where(Attachment.mail_record_id == MailRecord.id)
    rows = db.execute(
        stmt.add_columns(has_pdf_expr)
        .order_by(MailRecord.seq.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    items = []
    for rec, has_pdf in rows:
        out = MailOut.model_validate(rec)
        out.has_pdf = bool(has_pdf)
        items.append(out)
    return PageOut(items=items, total=total or 0, page=page, page_size=page_size)


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
    log_action(db, actor_id=user.id, action="update_status",
               entity="mail_record", entity_id=str(rec.id))
    db.commit()
    db.refresh(rec)
    return rec


@router.get("/documents/{doc_id}", response_model=MailDetailOut)
def get_document(
    doc_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: AppUser = Depends(get_current_user),
) -> MailDetailOut:
    rec = db.get(MailRecord, doc_id)
    if rec is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document introuvable")
    history = db.scalars(
        select(StatusHistory)
        .where(StatusHistory.mail_record_id == doc_id)
        .order_by(StatusHistory.changed_at.desc())
    ).all()
    att = db.scalar(select(Attachment).where(Attachment.mail_record_id == doc_id))
    out = MailDetailOut.model_validate(rec)
    out.history = [StatusHistoryOut.model_validate(h) for h in history]
    out.has_pdf = att is not None
    out.attachment = AttachmentOut.model_validate(att) if att else None
    return out


@router.patch("/documents/{doc_id}", response_model=MailOut)
def edit_document(
    doc_id: uuid.UUID,
    body: MailUpdate,
    db: Session = Depends(get_db),
    user: AppUser = Depends(get_current_user),
) -> MailRecord:
    rec = db.get(MailRecord, doc_id)
    if rec is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document introuvable")
    data = body.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(rec, key, value)
    rec.modified_by = user.id
    rec.modified_at = datetime.now(timezone.utc)
    log_action(db, actor_id=user.id, action="edit_document",
               entity="mail_record", entity_id=str(rec.id))
    db.commit()
    db.refresh(rec)
    return rec
