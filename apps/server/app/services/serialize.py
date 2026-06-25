from datetime import date, datetime, timezone


def as_date(v):
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.date()
    return v


def to_datetime(v):
    """date (from Pydantic) -> tz-aware datetime for Mongo storage."""
    if v is None:
        return None
    if isinstance(v, datetime):
        return v
    if isinstance(v, date):
        return datetime(v.year, v.month, v.day, tzinfo=timezone.utc)
    return v


def serialize_mail(doc: dict, has_pdf: bool = False) -> dict:
    return {
        "id": str(doc["_id"]),
        "register": doc["register"],
        "no_ordre": doc["no_ordre"],
        "date_enregistrement": as_date(doc.get("date_enregistrement")),
        "type_document": doc.get("type_document"),
        "reference": doc.get("reference"),
        "objet": doc.get("objet"),
        "expediteur": doc.get("expediteur"),
        "projet": doc.get("projet"),
        "destinataire": doc.get("destinataire"),
        "date_remise_destinataire": as_date(doc.get("date_remise_destinataire")),
        "dernier_statut": doc.get("dernier_statut"),
        "created_at": doc.get("created_at"),
        "has_pdf": has_pdf,
    }


def serialize_user(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "username": doc["username"],
        "full_name": doc["full_name"],
        "role": doc["role"],
        "preferred_locale": doc.get("preferred_locale", "fr"),
        "is_active": doc.get("is_active", True),
        "created_at": doc.get("created_at"),
        "last_login_at": doc.get("last_login_at"),
    }
