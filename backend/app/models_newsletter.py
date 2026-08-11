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
    status: str = Field(default="draft")  # "draft" | "sent"
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
    body: str = Field(default="")


class CampaignRead(SQLModel):
    id: int
    subject: str
    body: str
    status: str
    sent_count: int
    failed_count: int
    created_at: datetime
    sent_at: Optional[datetime]
