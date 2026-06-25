from datetime import date, datetime, timezone

from pymongo import ReturnDocument
from pymongo.database import Database

from app.services.serialize import to_datetime


def allocate_and_insert(db: Database, *, register: str, created_by, data: dict) -> dict:
    """Mint the next N° d'ordre and insert the record atomically.

    The counter is bumped with a single atomic findAndModify ($inc on one
    document). MongoDB guarantees single-document atomicity, so concurrent
    Saisie on the same (register, year) are serialised — no duplicates. A
    unique index on (register, year, seq) and on no_ordre is the backstop.
    """
    if register not in ("E", "S"):
        raise ValueError("register must be 'E' or 'S'")
    year = date.today().year

    counter = db.counters.find_one_and_update(
        {"_id": f"{register}-{year}"},
        {"$inc": {"seq": 1}, "$setOnInsert": {"register": register, "year": year}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    seq = counter["seq"]
    no_ordre = f"{'BOE' if register == 'E' else 'BOS'}{year}{seq:04d}"

    today = date.today()
    now = datetime.now(timezone.utc)
    doc = {
        "register": register,
        "year": year,
        "seq": seq,
        "no_ordre": no_ordre,
        "date_enregistrement": datetime(today.year, today.month, today.day, tzinfo=timezone.utc),
        "type_document": data.get("type_document"),
        "reference": data.get("reference"),
        "objet": data.get("objet"),
        "expediteur": data.get("expediteur"),
        "projet": data.get("projet"),
        "destinataire": data.get("destinataire"),
        "date_remise_destinataire": to_datetime(data.get("date_remise_destinataire")),
        "dernier_statut": data.get("dernier_statut"),
        "created_by": created_by,
        "created_at": now,
        "modified_by": None,
        "modified_at": None,
    }
    db.mail.insert_one(doc)
    return doc
