import re


def build_mail_filter(
    code: str,
    *,
    q: str | None = None,
    type_document: str | None = None,
    statut: str | None = None,
    projet: str | None = None,
) -> dict:
    """Shared Mongo filter for Consultation, Excel export, and the report."""
    f: dict = {"register": code}
    if type_document:
        f["type_document"] = type_document
    if statut:
        f["dernier_statut"] = statut
    if projet:
        f["projet"] = projet
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        f["$or"] = [
            {"no_ordre": rx},
            {"objet": rx},
            {"expediteur": rx},
            {"reference": rx},
            {"destinataire": rx},
        ]
    return f
