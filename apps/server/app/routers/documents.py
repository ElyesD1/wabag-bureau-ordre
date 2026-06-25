from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pymongo.database import Database

from app.core.deps import get_current_user, get_db, oid
from app.schemas.mail import (
    MailCreate,
    MailDetailOut,
    MailOut,
    MailUpdate,
    PageOut,
    StatusUpdate,
)
from app.services.audit import log_action
from app.services.insights import apply_bucket
from app.services.numbering import allocate_and_insert
from app.services.queries import build_mail_filter
from app.services.serialize import serialize_mail, to_datetime

router = APIRouter(tags=["documents"])
_REG = {"entree": "E", "sortie": "S"}


def _reg_code(register: str) -> str:
    if register not in _REG:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Registre inconnu")
    return _REG[register]


def _has_pdf(db: Database, mail_id) -> bool:
    return db.attachments.find_one({"mail_id": mail_id}) is not None


@router.post("/registers/{register}/documents", response_model=MailOut, status_code=201)
def saisie(register: str, body: MailCreate, db: Database = Depends(get_db), user: dict = Depends(get_current_user)):
    code = _reg_code(register)
    rec = allocate_and_insert(db, register=code, created_by=user["_id"], data=body.model_dump(exclude_none=True))
    db.status_history.insert_one({
        "mail_id": rec["_id"],
        "old_status": None,
        "new_status": rec.get("dernier_statut"),
        "changed_by": user["_id"],
        "changed_at": datetime.now(timezone.utc),
        "note": None,
    })
    log_action(db, actor_id=user["_id"], action="create_record", entity="mail", entity_id=str(rec["_id"]))
    return serialize_mail(rec, has_pdf=False)


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
    db: Database = Depends(get_db),
    _: dict = Depends(get_current_user),
) -> PageOut:
    code = _reg_code(register)
    f = build_mail_filter(code, q=q, type_document=type_document, statut=statut, projet=projet)
    f = apply_bucket(db, f, bucket, overdue_days)
    total = db.mail.count_documents(f)
    docs = list(db.mail.find(f).sort("seq", -1).skip((page - 1) * page_size).limit(page_size))
    ids = [d["_id"] for d in docs]
    have = set(db.attachments.distinct("mail_id", {"mail_id": {"$in": ids}}))
    items = [serialize_mail(d, has_pdf=d["_id"] in have) for d in docs]
    return PageOut(items=items, total=total, page=page, page_size=page_size)


@router.patch("/documents/{doc_id}/status", response_model=MailOut)
def update_status(doc_id: str, body: StatusUpdate, db: Database = Depends(get_db), user: dict = Depends(get_current_user)):
    mid = oid(doc_id)
    doc = db.mail.find_one({"_id": mid})
    if doc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document introuvable")
    old = doc.get("dernier_statut")
    now = datetime.now(timezone.utc)
    db.mail.update_one({"_id": mid}, {"$set": {"dernier_statut": body.new_status, "modified_by": user["_id"], "modified_at": now}})
    db.status_history.insert_one({
        "mail_id": mid,
        "old_status": old,
        "new_status": body.new_status,
        "changed_by": user["_id"],
        "changed_at": now,
        "note": body.note,
    })
    log_action(db, actor_id=user["_id"], action="update_status", entity="mail", entity_id=str(mid))
    return serialize_mail(db.mail.find_one({"_id": mid}), has_pdf=_has_pdf(db, mid))


@router.get("/documents/{doc_id}", response_model=MailDetailOut)
def get_document(doc_id: str, db: Database = Depends(get_db), _: dict = Depends(get_current_user)):
    mid = oid(doc_id)
    doc = db.mail.find_one({"_id": mid})
    if doc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document introuvable")
    att = db.attachments.find_one({"mail_id": mid})
    out = serialize_mail(doc, has_pdf=att is not None)
    out["history"] = [
        {"old_status": h.get("old_status"), "new_status": h.get("new_status"), "changed_at": h["changed_at"], "note": h.get("note")}
        for h in db.status_history.find({"mail_id": mid}).sort("changed_at", -1)
    ]
    out["attachment"] = (
        {"original_filename": att.get("original_filename"), "byte_size": att["byte_size"], "uploaded_at": att["uploaded_at"]}
        if att else None
    )
    return out


@router.patch("/documents/{doc_id}", response_model=MailOut)
def edit_document(doc_id: str, body: MailUpdate, db: Database = Depends(get_db), user: dict = Depends(get_current_user)):
    mid = oid(doc_id)
    doc = db.mail.find_one({"_id": mid})
    if doc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document introuvable")
    data = body.model_dump(exclude_unset=True)
    if "date_remise_destinataire" in data:
        data["date_remise_destinataire"] = to_datetime(data["date_remise_destinataire"])
    data["modified_by"] = user["_id"]
    data["modified_at"] = datetime.now(timezone.utc)
    db.mail.update_one({"_id": mid}, {"$set": data})
    log_action(db, actor_id=user["_id"], action="edit_document", entity="mail", entity_id=str(mid))
    return serialize_mail(db.mail.find_one({"_id": mid}), has_pdf=_has_pdf(db, mid))
