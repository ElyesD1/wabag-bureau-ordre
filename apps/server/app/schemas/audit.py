from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AuditOut(BaseModel):
    id: str
    at: datetime
    action: str
    entity: Optional[str] = None
    entity_id: Optional[str] = None
    ip: Optional[str] = None
    actor_username: Optional[str] = None
    actor_full_name: Optional[str] = None
    detail: Optional[dict] = None


class AuditPage(BaseModel):
    items: list[AuditOut]
    total: int
    page: int
    page_size: int
