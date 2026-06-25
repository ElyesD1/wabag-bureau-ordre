from datetime import date, datetime, time, timezone
from io import BytesIO

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from pymongo.database import Database

from app.core.deps import get_db, oid, require_role
from app.schemas.audit import AuditPage
from app.services.exports import build_audit_xlsx

router = APIRouter(tags=["audit"])
XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def _filter(action, actor_id, date_from, date_to) -> dict:
    f: dict = {}
    if action:
        f["action"] = action
    if actor_id:
        f["actor_id"] = oid(actor_id)
    rng = {}
    if date_from:
        rng["$gte"] = datetime.combine(date_from, time.min, tzinfo=timezone.utc)
    if date_to:
        rng["$lte"] = datetime.combine(date_to, time.max, tzinfo=timezone.utc)
    if rng:
        f["at"] = rng
    return f


def _serialize(db: Database, rows: list[dict]) -> list[dict]:
    actor_ids = list({r["actor_id"] for r in rows if r.get("actor_id")})
    users = {u["_id"]: u for u in db.users.find({"_id": {"$in": actor_ids}})}
    out = []
    for r in rows:
        u = users.get(r.get("actor_id"))
        out.append({
            "id": str(r["_id"]),
            "at": r["at"],
            "action": r["action"],
            "entity": r.get("entity"),
            "entity_id": r.get("entity_id"),
            "ip": r.get("ip"),
            "actor_username": u["username"] if u else None,
            "actor_full_name": u["full_name"] if u else None,
            "detail": r.get("detail"),
        })
    return out


@router.get("/audit/actions", response_model=list[str])
def audit_actions(db: Database = Depends(get_db), _: dict = Depends(require_role("admin"))):
    return sorted(db.audit_log.distinct("action"))


@router.get("/audit/export.xlsx")
def export_audit(
    action: str | None = None,
    actor_id: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    db: Database = Depends(get_db),
    _: dict = Depends(require_role("admin")),
) -> StreamingResponse:
    rows = list(db.audit_log.find(_filter(action, actor_id, date_from, date_to)).sort("at", -1))
    data = build_audit_xlsx(_serialize(db, rows))
    return StreamingResponse(
        BytesIO(data),
        media_type=XLSX_MIME,
        headers={"Content-Disposition": 'attachment; filename="journal_activite.xlsx"'},
    )


@router.get("/audit", response_model=AuditPage)
def list_audit(
    action: str | None = None,
    actor_id: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=200),
    db: Database = Depends(get_db),
    _: dict = Depends(require_role("admin")),
) -> AuditPage:
    f = _filter(action, actor_id, date_from, date_to)
    total = db.audit_log.count_documents(f)
    rows = list(db.audit_log.find(f).sort("at", -1).skip((page - 1) * page_size).limit(page_size))
    return AuditPage(items=_serialize(db, rows), total=total, page=page, page_size=page_size)
