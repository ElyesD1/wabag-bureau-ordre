from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.mail import MailRecord


def dashboard(db: Session, year: int) -> dict:
    """Aggregate counts for the dashboard for a given calendar year."""
    month_expr = func.extract("month", MailRecord.date_enregistrement)

    # totals per register
    totals = {"entree": 0, "sortie": 0}
    for reg, count in db.execute(
        select(MailRecord.register, func.count())
        .where(MailRecord.year == year)
        .group_by(MailRecord.register)
    ).all():
        totals["entree" if reg == "E" else "sortie"] = count
    totals["total"] = totals["entree"] + totals["sortie"]

    by_status = [
        {"status": s or "—", "count": c}
        for s, c in db.execute(
            select(MailRecord.dernier_statut, func.count())
            .where(MailRecord.year == year)
            .group_by(MailRecord.dernier_statut)
            .order_by(func.count().desc())
        ).all()
    ]

    by_type = [
        {"type": t, "count": c}
        for t, c in db.execute(
            select(MailRecord.type_document, func.count())
            .where(MailRecord.year == year)
            .group_by(MailRecord.type_document)
            .order_by(func.count().desc())
        ).all()
    ]

    by_month = [{"month": i, "entree": 0, "sortie": 0} for i in range(1, 13)]
    for m, reg, c in db.execute(
        select(month_expr.label("m"), MailRecord.register, func.count())
        .where(MailRecord.year == year)
        .group_by(month_expr, MailRecord.register)
    ).all():
        by_month[int(m) - 1]["entree" if reg == "E" else "sortie"] = c

    pending = (
        db.scalar(
            select(func.count())
            .select_from(MailRecord)
            .where(MailRecord.year == year, MailRecord.dernier_statut.ilike("%attente%"))
        )
        or 0
    )

    return {
        "year": year,
        "totals": totals,
        "by_status": by_status,
        "by_type": by_type,
        "by_month": by_month,
        "pending": pending,
    }
