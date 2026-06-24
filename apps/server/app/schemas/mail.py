import uuid
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


class MailOut(BaseModel):
    id: uuid.UUID
    register: str
    no_ordre: str
    date_enregistrement: date
    type_document: str
    reference: Optional[str]
    objet: Optional[str]
    expediteur: Optional[str]
    projet: Optional[str]
    destinataire: Optional[str]
    date_remise_destinataire: Optional[date]
    dernier_statut: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class PageOut(BaseModel):
    items: list[MailOut]
    total: int
    page: int
    page_size: int


Register = Literal["entree", "sortie"]
