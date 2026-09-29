import hashlib
from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class PageView(SQLModel, table=True):
    """One visitor pageview, logged by the public site's tracking beacon.

    Privacy note: we never store the raw IP — only a salted hash, just
    enough to approximate unique visitors without keeping PII around. The
    resolved `country` is looked up from the IP in a background task and
    the IP itself is discarded immediately after — same pattern as the hash.
    """

    id: Optional[int] = Field(default=None, primary_key=True)
    path: str = Field(index=True)
    referrer: Optional[str] = Field(default=None, max_length=500)
    user_agent: Optional[str] = Field(default=None, max_length=500)
    visitor_hash: str = Field(index=True)  # hashed IP+UA, for rough unique-visitor counts
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)

    # Client-generated (sessionStorage) id grouping a visitor's pageviews
    # into one visit — lets us compute landing/exit pages, bounce rate, and
    # time-on-page without inferring session boundaries from timestamp gaps.
    session_id: Optional[str] = Field(default=None, index=True)

    # Captured off the landing URL's query string, if present.
    utm_source: Optional[str] = Field(default=None, max_length=200)
    utm_medium: Optional[str] = Field(default=None, max_length=200)
    utm_campaign: Optional[str] = Field(default=None, max_length=200)
    utm_term: Optional[str] = Field(default=None, max_length=200)
    utm_content: Optional[str] = Field(default=None, max_length=200)

    # Computed at ingestion time (cheap) so it can be counted directly.
    referrer_category: Optional[str] = Field(default=None, max_length=20)

    # Resolved async, after the response — see analytics_utils.resolve_country.
    country: Optional[str] = Field(default=None, max_length=100)


class PageViewCreate(SQLModel):
    path: str = Field(min_length=1, max_length=500)
    referrer: Optional[str] = Field(default=None, max_length=500)
    session_id: Optional[str] = Field(default=None, max_length=100)
    utm_source: Optional[str] = Field(default=None, max_length=200)
    utm_medium: Optional[str] = Field(default=None, max_length=200)
    utm_campaign: Optional[str] = Field(default=None, max_length=200)
    utm_term: Optional[str] = Field(default=None, max_length=200)
    utm_content: Optional[str] = Field(default=None, max_length=200)


def hash_visitor(ip: str, user_agent: str, salt: str) -> str:
    raw = f"{salt}:{ip}:{user_agent}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()
