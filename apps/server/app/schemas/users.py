import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    full_name: str = Field(min_length=1, max_length=160)
    password: str = Field(min_length=6, max_length=128)
    role: str = Field(default="clerk", pattern="^(admin|clerk)$")
    preferred_locale: str = Field(default="fr", pattern="^(fr|en)$")


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, max_length=160)
    role: Optional[str] = Field(default=None, pattern="^(admin|clerk)$")
    is_active: Optional[bool] = None
    preferred_locale: Optional[str] = Field(default=None, pattern="^(fr|en)$")


class PasswordReset(BaseModel):
    password: str = Field(min_length=6, max_length=128)


class SelfPasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=6, max_length=128)


class LocaleUpdate(BaseModel):
    preferred_locale: str = Field(pattern="^(fr|en)$")


class UserAdminOut(BaseModel):
    id: uuid.UUID
    username: str
    full_name: str
    role: str
    preferred_locale: str
    is_active: bool
    created_at: datetime
    last_login_at: Optional[datetime]

    model_config = {"from_attributes": True}
