import secrets
from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class Subscriber(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    name: Optional[str] = None
    status: str = Field(default="subscribed")  # "subscribed" | "unsubscribed"
    unsubscribe_token: str = Field(default_factory=lambda: secrets.token_urlsafe(24), index=True, unique=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Campaign(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    subject: str
    body: str = Field(default="")  # paragraph-per-line, same convention as news/richtext
    image_url: Optional[str] = None  # optional header image (uploaded file or https address)
    # "draft" → "sending" (claimed by a send, so a second click can't send twice)
    # → "sent" (at least one delivered) or "failed" (every delivery failed).
    status: str = Field(default="draft")
    sent_count: int = Field(default=0)
    failed_count: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    sent_at: Optional[datetime] = None


# --- API payload/response shapes -------------------------------------------

class SubscribeRequest(SQLModel):
    email: str = Field(min_length=3, max_length=200)
    name: Optional[str] = Field(default=None, max_length=160)


class SubscriberRead(SQLModel):
    id: int
    email: str
    name: Optional[str]
    status: str
    created_at: datetime


class CampaignCreate(SQLModel):
    subject: str = Field(min_length=1, max_length=200)
    body: str = Field(default="", max_length=50_000)
    image_url: Optional[str] = Field(default=None, max_length=1000)


class CampaignRead(SQLModel):
    id: int
    subject: str
    body: str
    image_url: Optional[str] = None
    status: str
    sent_count: int
    failed_count: int
    created_at: datetime
    sent_at: Optional[datetime]


class CampaignPreview(SQLModel):
    subject: str
    html: str
    recipients: int  # active subscribers a real send would go to now
    email_configured: bool
