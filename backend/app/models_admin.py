from datetime import datetime
from typing import Optional

from pydantic import EmailStr
from sqlmodel import SQLModel, Field


class AdminUser(SQLModel, table=True):
    """A dashboard login. The first one is created via `python -m app.seed`;
    additional team members are created by an existing admin from the
    dashboard's Team page — this is an internal tool, not public signup."""

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    password_hash: str
    full_name: Optional[str] = None
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AdminLogin(SQLModel):
    email: EmailStr
    password: str


class AdminRead(SQLModel):
    id: int
    email: str
    full_name: Optional[str]
    is_active: bool = True


class AdminCreate(SQLModel):
    email: EmailStr
    full_name: Optional[str] = Field(default=None, max_length=120)
    password: str = Field(min_length=8, max_length=200)


class TokenResponse(SQLModel):
    access_token: str
    token_type: str = "bearer"
    admin: AdminRead
