import uuid
from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Computed,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

NO_ORDRE_EXPR = (
    "(case when register='E' then 'BOE' else 'BOS' end "
    "|| year::text || lpad(seq::text, 4, '0'))"
)


class MailCounter(Base):
    __tablename__ = "mail_counter"

    register: Mapped[str] = mapped_column(String(1), primary_key=True)
    year: Mapped[int] = mapped_column(Integer, primary_key=True)
    last_seq: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))

    __table_args__ = (CheckConstraint("register in ('E','S')", name="counter_register_valid"),)


class MailRecord(Base):
    __tablename__ = "mail_record"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    register: Mapped[str] = mapped_column(String(1), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    seq: Mapped[int] = mapped_column(Integer, nullable=False)
    no_ordre: Mapped[str] = mapped_column(String(20), Computed(NO_ORDRE_EXPR, persisted=True))
    date_enregistrement: Mapped[date] = mapped_column(
        Date, nullable=False, server_default=func.current_date()
    )
    type_document: Mapped[str] = mapped_column(String(64), nullable=False)
    reference: Mapped[str | None] = mapped_column(String(120), nullable=True)
    objet: Mapped[str | None] = mapped_column(String(400), nullable=True)
    expediteur: Mapped[str | None] = mapped_column(String(160), nullable=True)
    projet: Mapped[str | None] = mapped_column(String(160), nullable=True)
    destinataire: Mapped[str | None] = mapped_column(String(160), nullable=True)
    date_remise_destinataire: Mapped[date | None] = mapped_column(Date, nullable=True)
    dernier_statut: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("app_user.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    modified_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("app_user.id"), nullable=True)
    modified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint("register in ('E','S')", name="record_register_valid"),
        UniqueConstraint("register", "year", "seq", name="reg_year_seq"),
        UniqueConstraint("no_ordre", name="no_ordre"),
    )
