import hashlib
import uuid
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.audit import Attachment
from app.models.mail import MailRecord

PDF_MAGIC = b"%PDF"


class PdfValidationError(ValueError):
    pass


def _path_for(record: MailRecord) -> tuple[str, Path]:
    rel = f"{record.year}/{record.no_ordre}.pdf"
    return rel, Path(settings.pdf_dir) / rel


def store_pdf(
    db: Session,
    *,
    record: MailRecord,
    content: bytes,
    original_filename: str | None,
    uploaded_by: uuid.UUID,
) -> Attachment:
    """Validate, hash, and write the scanned PDF under a server-computed,
    year-partitioned name; upsert its metadata row (1 PDF per record)."""
    if content[:4] != PDF_MAGIC:
        raise PdfValidationError("Le fichier n'est pas un PDF valide")
    if len(content) > settings.max_pdf_mb * 1024 * 1024:
        raise PdfValidationError(f"PDF trop volumineux (max {settings.max_pdf_mb} Mo)")

    rel, dest = _path_for(record)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(content)

    att = db.scalar(select(Attachment).where(Attachment.mail_record_id == record.id))
    if att is None:
        att = Attachment(mail_record_id=record.id)
        db.add(att)
    att.relative_path = rel
    att.original_filename = original_filename
    att.content_type = "application/pdf"
    att.byte_size = len(content)
    att.sha256 = hashlib.sha256(content).hexdigest()
    att.uploaded_by = uploaded_by
    return att


def resolve_pdf(db: Session, *, record_id: uuid.UUID) -> tuple[Attachment, Path]:
    att = db.scalar(select(Attachment).where(Attachment.mail_record_id == record_id))
    if att is None:
        raise FileNotFoundError("Aucun PDF joint à ce document")
    return att, Path(settings.pdf_dir) / att.relative_path
