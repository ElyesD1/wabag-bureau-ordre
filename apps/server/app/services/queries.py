from sqlalchemy import Select, or_, select

from app.models.mail import MailRecord


def build_mail_query(
    code: str,
    *,
    q: str | None = None,
    type_document: str | None = None,
    statut: str | None = None,
    projet: str | None = None,
) -> Select:
    """Shared filter layer used by Consultation, Excel export, and the PDF report,
    so an export always matches what the clerk sees on screen."""
    stmt = select(MailRecord).where(MailRecord.register == code)
    if type_document:
        stmt = stmt.where(MailRecord.type_document == type_document)
    if statut:
        stmt = stmt.where(MailRecord.dernier_statut == statut)
    if projet:
        stmt = stmt.where(MailRecord.projet == projet)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(
                MailRecord.no_ordre.ilike(like),
                MailRecord.objet.ilike(like),
                MailRecord.expediteur.ilike(like),
                MailRecord.reference.ilike(like),
                MailRecord.destinataire.ilike(like),
            )
        )
    return stmt
