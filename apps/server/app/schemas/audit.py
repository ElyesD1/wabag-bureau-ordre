from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AuditOut(BaseModel):
    id: int
    at: datetime
    action: str
    entity: Optional[str]
    entity_id: Optional[str]
    ip: Optional[str]
    actor_username: Optional[str]
    actor_full_name: Optional[str]
    detail: Optional[dict] = None


class AuditPage(BaseModel):
    items: list[AuditOut]
    total: int
    page: int
    page_size: int
