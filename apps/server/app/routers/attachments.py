from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import Response
from pymongo.database import Database

from app.core.deps import get_current_user, get_db, oid
from app.services.attachments import PdfValidationError, read_pdf, store_pdf
from app.services.audit import log_action

router = APIRouter(tags=["attachments"])


def _record(db: Database, mid):
    rec = db.mail.find_one({"_id": mid})
    if rec is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document introuvable")
    return rec


@router.post("/documents/{doc_id}/pdf")
def upload_pdf(
    doc_id: str,
    file: UploadFile = File(...),
    db: Database = Depends(get_db),
    user: dict = Depends(get_current_user),
) -> dict:
    mid = oid(doc_id)
    rec = _record(db, mid)
    content = file.file.read()
    try:
        meta = store_pdf(db, mail_id=mid, no_ordre=rec["no_ordre"], content=content, original_filename=file.filename, uploaded_by=user["_id"])
    except PdfValidationError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc))
    log_action(db, actor_id=user["_id"], action="upload_pdf", entity="mail", entity_id=str(mid))
    return {"ok": True, "no_ordre": rec["no_ordre"], "byte_size": meta["byte_size"], "sha256": meta["sha256"]}


@router.get("/documents/{doc_id}/pdf")
def get_pdf(doc_id: str, db: Database = Depends(get_db), _: dict = Depends(get_current_user)) -> Response:
    mid = oid(doc_id)
    rec = _record(db, mid)
    try:
        _att, data = read_pdf(db, mail_id=mid)
    except FileNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    return Response(
        content=data,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{rec["no_ordre"]}.pdf"'},
    )
