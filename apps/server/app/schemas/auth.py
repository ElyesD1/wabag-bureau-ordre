import uuid

from pydantic import BaseModel


class LoginIn(BaseModel):
    username: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: uuid.UUID
    username: str
    full_name: str
    role: str
    preferred_locale: str

    model_config = {"from_attributes": True}
