import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.mail import MailRecord
from app.models.user import AppUser
from app.services.attachments import PdfValidationError, resolve_pdf, store_pdf
from app.services.audit import log_action

router = APIRouter(tags=["attachments"])


def _record_or_404(db: Session, doc_id: uuid.UUID) -> MailRecord:
    rec = db.get(MailRecord, doc_id)
    if rec is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document introuvable")
    return rec


@router.post("/documents/{doc_id}/pdf")
def upload_pdf(
    doc_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: AppUser = Depends(get_current_user),
) -> dict:
    rec = _record_or_404(db, doc_id)
    content = file.file.read()
    try:
        att = store_pdf(
            db, record=rec, content=content, original_filename=file.filename, uploaded_by=user.id
        )
    except PdfValidationError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc))
    log_action(db, actor_id=user.id, action="upload_pdf", entity="mail_record", entity_id=str(doc_id))
    db.commit()
    return {"ok": True, "no_ordre": rec.no_ordre, "byte_size": att.byte_size, "sha256": att.sha256}


@router.get("/documents/{doc_id}/pdf")
def get_pdf(
    doc_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: AppUser = Depends(get_current_user),
) -> FileResponse:
    rec = _record_or_404(db, doc_id)
    try:
        _att, path = resolve_pdf(db, record_id=doc_id)
    except FileNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    if not path.exists():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Fichier PDF introuvable sur le serveur")
    return FileResponse(path, media_type="application/pdf", filename=f"{rec.no_ordre}.pdf")
