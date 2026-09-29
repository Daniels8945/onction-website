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

    # Attribution — where the visitor who submitted this came from,
    # resolved server-side from their tracking session at submit time.
    # See analytics_utils.get_session_attribution.
    utm_source: Optional[str] = Field(default=None, max_length=200)
    utm_medium: Optional[str] = Field(default=None, max_length=200)
    utm_campaign: Optional[str] = Field(default=None, max_length=200)
    referrer_category: Optional[str] = Field(default=None, max_length=20)


class EnquiryCreate(SQLModel):
    """Payload accepted from the frontend enquiry form."""

    full_name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=3, max_length=40)
    company: Optional[str] = Field(default=None, max_length=160)
    country: Optional[str] = Field(default=None, max_length=80)
    message: str = Field(min_length=1, max_length=4000)
    # The browser's tracking session id (sessionStorage) — write-only, used
    # to look up acquisition data, never stored on the Enquiry directly.
    session_id: Optional[str] = Field(default=None, max_length=100)


class EnquiryRead(SQLModel):
    id: int
    full_name: str
    email: str
    phone: str
    company: Optional[str]
    country: Optional[str]
    message: str
    created_at: datetime
    utm_source: Optional[str]
    utm_medium: Optional[str]
    utm_campaign: Optional[str]
    referrer_category: Optional[str]
