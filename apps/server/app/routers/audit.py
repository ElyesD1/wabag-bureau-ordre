import uuid
from datetime import date, datetime, time, timezone
from io import BytesIO

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_role
from app.models.audit import AuditLog
from app.models.user import AppUser
from app.schemas.audit import AuditOut, AuditPage
from app.services.exports import build_audit_xlsx

router = APIRouter(tags=["audit"])
XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def _apply(stmt, action, actor_id, date_from, date_to):
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if actor_id:
        stmt = stmt.where(AuditLog.actor_id == actor_id)
    if date_from:
        stmt = stmt.where(AuditLog.at >= datetime.combine(date_from, time.min, tzinfo=timezone.utc))
    if date_to:
        stmt = stmt.where(AuditLog.at <= datetime.combine(date_to, time.max, tzinfo=timezone.utc))
    return stmt


def _joined(action, actor_id, date_from, date_to):
    stmt = select(AuditLog, AppUser.username, AppUser.full_name).join(
        AppUser, AuditLog.actor_id == AppUser.id, isouter=True
    )
    return _apply(stmt, action, actor_id, date_from, date_to)


@router.get("/audit/actions", response_model=list[str])
def audit_actions(db: Session = Depends(get_db), _: AppUser = Depends(require_role("admin"))):
    return [r[0] for r in db.execute(select(AuditLog.action).distinct().order_by(AuditLog.action)).all()]


@router.get("/audit/export.xlsx")
def export_audit(
    action: str | None = None,
    actor_id: uuid.UUID | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
    _: AppUser = Depends(require_role("admin")),
) -> StreamingResponse:
    rows = db.execute(
        _joined(action, actor_id, date_from, date_to).order_by(AuditLog.at.desc())
    ).all()
    data = build_audit_xlsx(rows)
    return StreamingResponse(
        BytesIO(data),
        media_type=XLSX_MIME,
        headers={"Content-Disposition": 'attachment; filename="journal_activite.xlsx"'},
    )


@router.get("/audit", response_model=AuditPage)
def list_audit(
    action: str | None = None,
    actor_id: uuid.UUID | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=200),
    db: Session = Depends(get_db),
    _: AppUser = Depends(require_role("admin")),
) -> AuditPage:
    total = db.scalar(
        _apply(select(func.count()).select_from(AuditLog), action, actor_id, date_from, date_to)
    ) or 0
    rows = db.execute(
        _joined(action, actor_id, date_from, date_to)
        .order_by(AuditLog.at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    items = [
        AuditOut(
            id=a.id,
            at=a.at,
            action=a.action,
            entity=a.entity,
            entity_id=a.entity_id,
            ip=str(a.ip) if a.ip else None,
            actor_username=username,
            actor_full_name=full_name,
            detail=a.detail,
        )
        for a, username, full_name in rows
    ]
    return AuditPage(items=items, total=total, page=page, page_size=page_size)
