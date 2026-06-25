from pymongo.database import Database


def dashboard(db: Database, year: int) -> dict:
    scope = {"year": year}

    totals = {"entree": 0, "sortie": 0}
    for g in db.mail.aggregate([{"$match": scope}, {"$group": {"_id": "$register", "count": {"$sum": 1}}}]):
        totals["entree" if g["_id"] == "E" else "sortie"] = g["count"]
    totals["total"] = totals["entree"] + totals["sortie"]

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

    by_month = [{"month": i, "entree": 0, "sortie": 0} for i in range(1, 13)]
    for g in db.mail.aggregate([
        {"$match": scope},
        {"$group": {"_id": {"m": {"$month": "$date_enregistrement"}, "r": "$register"}, "count": {"$sum": 1}}},
    ]):
        m = g["_id"]["m"]
        by_month[m - 1]["entree" if g["_id"]["r"] == "E" else "sortie"] = g["count"]

    pending = db.mail.count_documents({**scope, "dernier_statut": {"$regex": "attente", "$options": "i"}})

    return {
        "year": year,
        "totals": totals,
        "by_status": by_status,
        "by_type": by_type,
        "by_month": by_month,
        "pending": pending,
    }
