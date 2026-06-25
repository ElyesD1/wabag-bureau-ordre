import hashlib
from datetime import datetime, timezone

from pymongo.database import Database

from app.core.config import settings
from app.db.mongo import gridfs_for

PDF_MAGIC = b"%PDF"


class PdfValidationError(ValueError):
    pass


def store_pdf(db: Database, *, mail_id, no_ordre: str, content: bytes, original_filename, uploaded_by) -> dict:
    if content[:4] != PDF_MAGIC:
        raise PdfValidationError("Le fichier n'est pas un PDF valide")
    if len(content) > settings.max_pdf_mb * 1024 * 1024:
        raise PdfValidationError(f"PDF trop volumineux (max {settings.max_pdf_mb} Mo)")

    fs = gridfs_for(db)
    existing = db.attachments.find_one({"mail_id": mail_id})
    if existing and existing.get("gridfs_id"):
        try:
            fs.delete(existing["gridfs_id"])
        except Exception:
            pass

    gid = fs.put(content, filename=f"{no_ordre}.pdf", contentType="application/pdf")
    meta = {
        "mail_id": mail_id,
        "gridfs_id": gid,
        "original_filename": original_filename,
        "content_type": "application/pdf",
        "byte_size": len(content),
        "sha256": hashlib.sha256(content).hexdigest(),
        "uploaded_by": uploaded_by,
        "uploaded_at": datetime.now(timezone.utc),
    }
    db.attachments.update_one({"mail_id": mail_id}, {"$set": meta}, upsert=True)
    return meta


def read_pdf(db: Database, *, mail_id) -> tuple[dict, bytes]:
    att = db.attachments.find_one({"mail_id": mail_id})
    if att is None:
        raise FileNotFoundError("Aucun PDF joint à ce document")
    fs = gridfs_for(db)
    return att, fs.get(att["gridfs_id"]).read()
