from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class Event(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    slug: str = Field(index=True, unique=True)
    title: str
    category: str = Field(default="Onction Event")  # "Onction Event" | "Industry Event"
    description: str = Field(default="")
    location: str = Field(default="")  # free text: "Virtual", an address, etc.
    starts_at: datetime
    ends_at: Optional[datetime] = None
    cover_image_url: Optional[str] = None
    capacity: Optional[int] = None  # None = unlimited
    status: str = Field(default="draft")  # "draft" | "published"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Registration(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: int = Field(foreign_key="event.id", index=True)
    full_name: str
    email: str
    company: Optional[str] = None
    status: str = Field(default="registered")  # "registered" | "waitlisted" | "cancelled"
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Attribution — same pattern as Enquiry, see analytics_utils.get_session_attribution.
    utm_source: Optional[str] = Field(default=None, max_length=200)
    utm_medium: Optional[str] = Field(default=None, max_length=200)
    utm_campaign: Optional[str] = Field(default=None, max_length=200)
    referrer_category: Optional[str] = Field(default=None, max_length=20)


# --- API payload/response shapes -------------------------------------------

class EventCreate(SQLModel):
    slug: str = Field(min_length=1, max_length=200)
    title: str = Field(min_length=1, max_length=200)
    category: str = Field(default="Onction Event", max_length=80)
    description: str = Field(default="")
    location: str = Field(default="", max_length=300)
    starts_at: datetime
    ends_at: Optional[datetime] = None
    cover_image_url: Optional[str] = None
    capacity: Optional[int] = Field(default=None, ge=1)
    status: str = Field(default="draft")


class EventUpdate(SQLModel):
    slug: Optional[str] = None
    title: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    cover_image_url: Optional[str] = None
    capacity: Optional[int] = Field(default=None, ge=1)
    status: Optional[str] = None


class EventRead(SQLModel):
    id: int
    slug: str
    title: str
    category: str
    description: str
    location: str
    starts_at: datetime
    ends_at: Optional[datetime]
    cover_image_url: Optional[str]
    capacity: Optional[int]
    status: str
    registered_count: int = 0
    waitlisted_count: int = 0


class RegistrationCreate(SQLModel):
    full_name: str = Field(min_length=1, max_length=160)
    email: str = Field(min_length=3, max_length=200)
    company: Optional[str] = Field(default=None, max_length=160)
    session_id: Optional[str] = Field(default=None, max_length=100)


class RegistrationRead(SQLModel):
    id: int
    full_name: str
    email: str
    company: Optional[str]
    status: str
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    referrer_category: Optional[str] = None
    created_at: datetime
