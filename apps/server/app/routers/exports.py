from datetime import datetime, timezone
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.models.mail import MailRecord
from app.models.user import AppUser
from app.schemas.mail import ReportOut
from app.services.audit import log_action
from app.services.exports import build_journal_xlsx
from app.services.queries import build_mail_query

router = APIRouter(tags=["exports"])
_REG = {"entree": "E", "sortie": "S"}
XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def _code(register: str) -> str:
    if register not in _REG:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Registre inconnu")
    return _REG[register]


def _fetch(db, register, q, type_document, statut, projet) -> list[MailRecord]:
    code = _code(register)
    stmt = build_mail_query(code, q=q, type_document=type_document, statut=statut, projet=projet)
    return list(db.scalars(stmt.order_by(MailRecord.seq.asc())).all())


@router.get("/export/journal.xlsx")
def export_xlsx(
    register: str,
    q: str | None = None,
    type_document: str | None = None,
    statut: str | None = None,
    projet: str | None = None,
    lang: str = "fr",
    db: Session = Depends(get_db),
    user: AppUser = Depends(get_current_user),
) -> StreamingResponse:
    records = _fetch(db, register, q, type_document, statut, projet)
    data = build_journal_xlsx(records, lang=lang)
    log_action(db, actor_id=user.id, action="export_xlsx", entity="register",
               entity_id=register, detail={"count": len(records)})
    db.commit()
    filename = f"journal_{register}.xlsx"
    return StreamingResponse(
        BytesIO(data),
        media_type=XLSX_MIME,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/reports/journal-data", response_model=ReportOut)
def report_data(
    register: str,
    q: str | None = None,
    type_document: str | None = None,
    statut: str | None = None,
    projet: str | None = None,
    db: Session = Depends(get_db),
    user: AppUser = Depends(get_current_user),
) -> ReportOut:
    records = _fetch(db, register, q, type_document, statut, projet)
    log_action(db, actor_id=user.id, action="report_data", entity="register",
               entity_id=register, detail={"count": len(records)})
    db.commit()
    return ReportOut(
        register=_code(register),
        generated_at=datetime.now(timezone.utc),
        count=len(records),
        items=records,
    )
