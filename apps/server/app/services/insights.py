from datetime import date

from sqlalchemy import Date, Select, and_, cast, exists, func, or_, select
from sqlalchemy.orm import Session

from app.models.audit import Attachment
from app.models.mail import MailRecord


# --- status classification (dernier_statut is free text → fuzzy match) ---
def _status():
    return func.coalesce(MailRecord.dernier_statut, "")


def closed_cond():
    return _status().ilike("%clos%")


def cancelled_cond():
    return _status().ilike("%annul%")


def pending_cond():
    return _status().ilike("%attente%")


def open_cond():
    return and_(~closed_cond(), ~cancelled_cond())


def no_pdf_cond():
    return ~exists().where(Attachment.mail_record_id == MailRecord.id)


def overdue_cond(overdue_days: int):
    return and_(
        open_cond(),
        or_(
            MailRecord.date_enregistrement < (func.current_date() - overdue_days),
            and_(
                MailRecord.date_remise_destinataire.isnot(None),
                MailRecord.date_remise_destinataire < func.current_date(),
            ),
        ),
    )


def apply_bucket(stmt: Select, bucket: str | None, overdue_days: int) -> Select:
    """Quick monitor filters shared by the journal list and the Suivi view."""
    if bucket == "overdue":
        return stmt.where(overdue_cond(overdue_days))
    if bucket == "no_pdf":
        return stmt.where(no_pdf_cond())
    if bucket == "open":
        return stmt.where(open_cond())
    if bucket == "pending":
        return stmt.where(pending_cond())
    return stmt


def register_insights(db: Session, code: str, year: int, overdue_days: int) -> dict:
    today = date.today()
    scope = (MailRecord.register == code, MailRecord.year == year)

    def cnt(*conds) -> int:
        return db.scalar(select(func.count()).select_from(MailRecord).where(*scope, *conds)) or 0

    total = cnt()
    closed = cnt(closed_cond())
    cancelled = cnt(cancelled_cond())
    pending = cnt(pending_cond())
    open_count = cnt(open_cond())
    overdue = cnt(overdue_cond(overdue_days))
    no_pdf = cnt(no_pdf_cond())
    no_pdf_open = cnt(open_cond(), no_pdf_cond())
    this_month = cnt(func.extract("month", MailRecord.date_enregistrement) == today.month)

    by_status = [
        {"status": s or "—", "count": c}
        for s, c in db.execute(
            select(MailRecord.dernier_statut, func.count())
            .where(*scope)
            .group_by(MailRecord.dernier_statut)
            .order_by(func.count().desc())
        ).all()
    ]

    age = func.current_date() - MailRecord.date_enregistrement
    aging = [
        {"bucket": "0-3j", "count": cnt(open_cond(), age.between(0, 3))},
        {"bucket": "4-7j", "count": cnt(open_cond(), age.between(4, 7))},
        {"bucket": "8-15j", "count": cnt(open_cond(), age.between(8, 15))},
        {"bucket": "15j+", "count": cnt(open_cond(), age > 15)},
    ]

    avg_proc = db.scalar(
        select(func.avg(cast(MailRecord.modified_at, Date) - MailRecord.date_enregistrement)).where(
            *scope, closed_cond(), MailRecord.modified_at.isnot(None)
        )
    )
    avg_processing_days = round(float(avg_proc), 1) if avg_proc is not None else None

    projet_label = func.coalesce(MailRecord.projet, "—")
    by_projet = [
        {"projet": p, "count": c}
        for p, c in db.execute(
            select(projet_label, func.count())
            .where(*scope, open_cond())
            .group_by(projet_label)
            .order_by(func.count().desc())
            .limit(6)
        ).all()
    ]

    watch_rows = db.execute(
        select(MailRecord, exists().where(Attachment.mail_record_id == MailRecord.id))
        .where(*scope, open_cond())
        .order_by(MailRecord.date_enregistrement.asc())
        .limit(8)
    ).all()
    watch = []
    for rec, has_pdf in watch_rows:
        age_days = (today - rec.date_enregistrement).days
        is_overdue = age_days > overdue_days or (
            rec.date_remise_destinataire is not None and rec.date_remise_destinataire < today
        )
        watch.append({
            "id": str(rec.id),
            "no_ordre": rec.no_ordre,
            "objet": rec.objet,
            "expediteur": rec.expediteur,
            "dernier_statut": rec.dernier_statut,
            "date_enregistrement": rec.date_enregistrement.isoformat(),
            "age_days": age_days,
            "overdue": bool(is_overdue),
            "has_pdf": bool(has_pdf),
        })

    return {
        "register": code,
        "year": year,
        "overdue_days": overdue_days,
        "total": total,
        "open": open_count,
        "pending": pending,
        "closed": closed,
        "cancelled": cancelled,
        "overdue": overdue,
        "no_pdf": no_pdf,
        "no_pdf_open": no_pdf_open,
        "this_month": this_month,
        "avg_processing_days": avg_processing_days,
        "by_status": by_status,
        "aging": aging,
        "by_projet": by_projet,
        "watch": watch,
    }
