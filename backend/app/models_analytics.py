import hashlib
from datetime import datetime
from typing import Optional

from sqlalchemy import Column, JSON
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

    # Country as reported by Cloudflare's CF-IPCountry header (ISO code), when
    # the request came through Cloudflare. No IP lookup, no third party.
    country: Optional[str] = Field(default=None, max_length=100)

    # ── v2 tracking (see routers/analytics.py). Rows from before v2 have these
    # empty and are reported as "legacy" where it matters. ────────────────
    event_id: Optional[str] = Field(default=None, max_length=64)  # client UUID, unique — makes retries harmless
    visitor_id: Optional[str] = Field(default=None, max_length=64, index=True)  # salted hash of an anonymous, consent-based browser id
    host: Optional[str] = Field(default=None, max_length=100)  # hostname the page was served from (separates dev/staging)
    known_route: Optional[bool] = None  # False = a URL the site doesn't have (shown as "not found" pages)
    referrer_domain: Optional[str] = Field(default=None, max_length=200)  # external referrer's domain only, never the full URL
    device: Optional[str] = Field(default=None, max_length=10)  # desktop | mobile | tablet
    browser: Optional[str] = Field(default=None, max_length=40)
    os: Optional[str] = Field(default=None, max_length=40)
    viewport: Optional[str] = Field(default=None, max_length=4)  # s | m | l | xl width class
    engaged_ms: Optional[int] = None  # time the page was visible and in use (heartbeats); None = not measured


class PageViewCreate(SQLModel):
    path: str = Field(min_length=1, max_length=500)
    referrer: Optional[str] = Field(default=None, max_length=500)
    session_id: Optional[str] = Field(default=None, max_length=100)
    event_id: Optional[str] = Field(default=None, max_length=64)
    visitor_id: Optional[str] = Field(default=None, max_length=64)
    host: Optional[str] = Field(default=None, max_length=100)
    viewport: Optional[str] = Field(default=None, max_length=4)
    utm_source: Optional[str] = Field(default=None, max_length=200)
    utm_medium: Optional[str] = Field(default=None, max_length=200)
    utm_campaign: Optional[str] = Field(default=None, max_length=200)
    utm_term: Optional[str] = Field(default=None, max_length=200)
    utm_content: Optional[str] = Field(default=None, max_length=200)


class AnalyticsEvent(SQLModel, table=True):
    """A non-pageview interaction on the public site, e.g. the enquiry form
    being seen or started, or a phone/email link clicked. Successful enquiries
    and registrations are NOT events: they're read from their own tables,
    which only exist once the server has accepted the submission."""

    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: str = Field(max_length=64, unique=True, index=True)
    type: str = Field(max_length=40, index=True)
    path: str = Field(max_length=200)
    session_id: Optional[str] = Field(default=None, max_length=100, index=True)
    visitor_id: Optional[str] = Field(default=None, max_length=64)
    host: Optional[str] = Field(default=None, max_length=100)
    props: dict = Field(default_factory=dict, sa_column=Column(JSON))  # small, non-personal (e.g. {"method": "phone"})
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class AnalyticsDaily(SQLModel, table=True):
    """Tracking-health counters per day (UTC): what arrived and what was
    turned away, so the dashboard can show whether the data is trustworthy."""

    day: str = Field(primary_key=True, max_length=10)
    received: int = 0
    stored: int = 0
    duplicates: int = 0
    bots: int = 0
    invalid: int = 0
    internal: int = 0
    engagement_updates: int = 0


class EventCreate(SQLModel):
    event_id: str = Field(min_length=8, max_length=64)
    type: str = Field(min_length=1, max_length=40)
    path: str = Field(min_length=1, max_length=500)
    session_id: Optional[str] = Field(default=None, max_length=100)
    visitor_id: Optional[str] = Field(default=None, max_length=64)
    host: Optional[str] = Field(default=None, max_length=100)
    props: dict = Field(default_factory=dict)


class EngagementUpdate(SQLModel):
    event_id: str = Field(min_length=8, max_length=64)  # the pageview's event_id
    engaged_ms: int = Field(ge=0, le=86_400_000)


def hash_visitor(ip: str, user_agent: str, salt: str) -> str:
    raw = f"{salt}:{ip}:{user_agent}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()
