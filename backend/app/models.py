from datetime import datetime
from typing import Optional

from pydantic import EmailStr
from sqlmodel import SQLModel, Field


class Enquiry(SQLModel, table=True):
    """A contact / enquiry submitted from the website form."""

    id: Optional[int] = Field(default=None, primary_key=True)
    full_name: str
    email: str
    phone: str
    company: Optional[str] = None
    country: Optional[str] = None
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class EnquiryCreate(SQLModel):
    """Payload accepted from the frontend enquiry form."""

    full_name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=3, max_length=40)
    company: Optional[str] = Field(default=None, max_length=160)
    country: Optional[str] = Field(default=None, max_length=80)
    message: str = Field(min_length=1, max_length=4000)


class EnquiryRead(SQLModel):
    id: int
    full_name: str
    email: str
    phone: str
    company: Optional[str]
    country: Optional[str]
    message: str
    created_at: datetime
