from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class MailCreate(BaseModel):
    type_document: str = Field(min_length=1, max_length=64)
    reference: Optional[str] = Field(default=None, max_length=120)
    objet: Optional[str] = Field(default=None, max_length=400)
    expediteur: Optional[str] = Field(default=None, max_length=160)
    projet: Optional[str] = Field(default=None, max_length=160)
    destinataire: Optional[str] = Field(default=None, max_length=160)
    date_remise_destinataire: Optional[date] = None
    dernier_statut: Optional[str] = Field(default=None, max_length=64)


class StatusUpdate(BaseModel):
    new_status: str = Field(min_length=1, max_length=64)
    note: Optional[str] = Field(default=None, max_length=400)


class MailUpdate(BaseModel):
    type_document: Optional[str] = Field(default=None, min_length=1, max_length=64)
    reference: Optional[str] = Field(default=None, max_length=120)
    objet: Optional[str] = Field(default=None, max_length=400)
    expediteur: Optional[str] = Field(default=None, max_length=160)
    projet: Optional[str] = Field(default=None, max_length=160)
    destinataire: Optional[str] = Field(default=None, max_length=160)
    date_remise_destinataire: Optional[date] = None


class MailOut(BaseModel):
    id: str
    register: str
    no_ordre: str
    date_enregistrement: date
    type_document: str
    reference: Optional[str] = None
    objet: Optional[str] = None
    expediteur: Optional[str] = None
    projet: Optional[str] = None
    destinataire: Optional[str] = None
    date_remise_destinataire: Optional[date] = None
    dernier_statut: Optional[str] = None
    created_at: datetime
    has_pdf: bool = False


class PageOut(BaseModel):
    items: list[MailOut]
    total: int
    page: int
    page_size: int


class ReportOut(BaseModel):
    register: str
    generated_at: datetime
    count: int
    items: list[MailOut]


class StatusHistoryOut(BaseModel):
    old_status: Optional[str] = None
    new_status: Optional[str] = None
    changed_at: datetime
    note: Optional[str] = None


class AttachmentOut(BaseModel):
    original_filename: Optional[str] = None
    byte_size: int
    uploaded_at: datetime


class MailDetailOut(MailOut):
    history: list[StatusHistoryOut] = []
    attachment: Optional[AttachmentOut] = None


Register = Literal["entree", "sortie"]
