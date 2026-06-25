from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class AssistantLogIn(BaseModel):
    user_text: str = Field(min_length=1, max_length=500)
    bot_text: str = Field(min_length=1, max_length=2000)
    intent: Optional[str] = Field(default=None, max_length=64)


class AssistantMessage(BaseModel):
    role: str
    text: str
    intent: Optional[str] = None
    at: datetime
