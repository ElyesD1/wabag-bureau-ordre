from datetime import date, datetime, timedelta, timezone

from pymongo.database import Database


def _ci(term: str) -> dict:
    return {"$regex": term, "$options": "i"}


def closed_q() -> dict:
    return {"dernier_statut": _ci("clos")}


def cancelled_q() -> dict:
    return {"dernier_statut": _ci("annul")}


def pending_q() -> dict:
    return {"dernier_statut": _ci("attente")}


def open_q() -> dict:
    return {"$nor": [closed_q(), cancelled_q()]}


def _today_dt() -> datetime:
    t = date.today()
    return datetime(t.year, t.month, t.day, tzinfo=timezone.utc)


def overdue_q(overdue_days: int) -> dict:
    today = _today_dt()
    cutoff = today - timedelta(days=overdue_days)
    return {
        "$and": [
            open_q(),
            {
                "$or": [
                    {"date_enregistrement": {"$lt": cutoff}},
                    {"date_remise_destinataire": {"$ne": None, "$lt": today}},
                ]
            },
        ]
    }


def apply_bucket(db: Database, f: dict, bucket: str | None, overdue_days: int) -> dict:
    if bucket == "overdue":
        return {"$and": [f, overdue_q(overdue_days)]}
    if bucket == "no_pdf":
        with_pdf = db.attachments.distinct("mail_id")
        return {**f, "_id": {"$nin": with_pdf}}
    if bucket == "open":
        return {**f, **open_q()}
    if bucket == "pending":
        return {**f, **pending_q()}
    return f


def register_insights(db: Database, code: str, year: int, overdue_days: int) -> dict:
    scope = {"register": code, "year": year}
    today = date.today()
    today_dt = _today_dt()
    month_start = datetime(today.year, today.month, 1, tzinfo=timezone.utc)
    next_month = datetime(today.year + (today.month // 12), (today.month % 12) + 1, 1, tzinfo=timezone.utc)

    with_pdf = db.attachments.distinct("mail_id")

    total = db.mail.count_documents(scope)
    closed = db.mail.count_documents({**scope, **closed_q()})
    cancelled = db.mail.count_documents({**scope, **cancelled_q()})
    pending = db.mail.count_documents({**scope, **pending_q()})
    open_count = db.mail.count_documents({**scope, **open_q()})
    overdue = db.mail.count_documents({"$and": [scope, overdue_q(overdue_days)]})
    no_pdf = db.mail.count_documents({**scope, "_id": {"$nin": with_pdf}})
    no_pdf_open = db.mail.count_documents({**scope, **open_q(), "_id": {"$nin": with_pdf}})
    this_month = db.mail.count_documents({**scope, "date_enregistrement": {"$gte": month_start, "$lt": next_month}})

    by_status = [
        {"status": g["_id"] or "—", "count": g["count"]}
        for g in db.mail.aggregate([
            {"$match": scope},
            {"$group": {"_id": "$dernier_statut", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ])
    ]
    by_type = [
        {"type": g["_id"], "count": g["count"]}
        for g in db.mail.aggregate([
            {"$match": scope},
            {"$group": {"_id": "$type_document", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ])
    ]

    bucket_counts = {0: 0, 4: 0, 8: 0, 16: 0}
    for g in db.mail.aggregate([
        {"$match": {**scope, **open_q()}},
        {"$addFields": {"age": {"$dateDiff": {"startDate": "$date_enregistrement", "endDate": "$$NOW", "unit": "day"}}}},
        {"$bucket": {"groupBy": "$age", "boundaries": [0, 4, 8, 16, 100000], "default": -1, "output": {"count": {"$sum": 1}}}},
    ]):
        bucket_counts[g["_id"] if g["_id"] in bucket_counts else 16] += g["count"]
    aging = [
        {"bucket": "0-3j", "count": bucket_counts[0]},
        {"bucket": "4-7j", "count": bucket_counts[4]},
        {"bucket": "8-15j", "count": bucket_counts[8]},
        {"bucket": "15j+", "count": bucket_counts[16]},
    ]

    proc = list(db.mail.aggregate([
        {"$match": {**scope, **closed_q(), "modified_at": {"$ne": None}}},
        {"$addFields": {"proc": {"$dateDiff": {"startDate": "$date_enregistrement", "endDate": "$modified_at", "unit": "day"}}}},
        {"$group": {"_id": None, "avg": {"$avg": "$proc"}}},
    ]))
    avg_processing_days = round(proc[0]["avg"], 1) if proc and proc[0]["avg"] is not None else None

    by_projet = [
        {"projet": g["_id"], "count": g["count"]}
        for g in db.mail.aggregate([
            {"$match": {**scope, **open_q()}},
            {"$group": {"_id": {"$ifNull": ["$projet", "—"]}, "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 6},
        ])
    ]

    docs = list(db.mail.find({**scope, **open_q()}).sort("date_enregistrement", 1).limit(8))
    ids = [d["_id"] for d in docs]
    have_pdf = set(db.attachments.distinct("mail_id", {"mail_id": {"$in": ids}}))
    watch = []
    for d in docs:
        reg_date = d["date_enregistrement"].date() if isinstance(d.get("date_enregistrement"), datetime) else d.get("date_enregistrement")
        age_days = (today - reg_date).days if reg_date else 0
        remise = d.get("date_remise_destinataire")
        remise_d = remise.date() if isinstance(remise, datetime) else remise
        is_overdue = age_days > overdue_days or (remise_d is not None and remise_d < today)
        watch.append({
            "id": str(d["_id"]),
            "no_ordre": d["no_ordre"],
            "objet": d.get("objet"),
            "expediteur": d.get("expediteur"),
            "dernier_statut": d.get("dernier_statut"),
            "date_enregistrement": reg_date.isoformat() if reg_date else None,
            "age_days": age_days,
            "overdue": bool(is_overdue),
            "has_pdf": d["_id"] in have_pdf,
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
