import hashlib
from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class PageView(SQLModel, table=True):
    """One visitor pageview, logged by the public site's tracking beacon.

    Privacy note: we never store the raw IP — only a salted hash, just
    enough to approximate unique visitors without keeping PII around.
    """

    id: Optional[int] = Field(default=None, primary_key=True)
    path: str = Field(index=True)
    referrer: Optional[str] = Field(default=None, max_length=500)
    user_agent: Optional[str] = Field(default=None, max_length=500)
    visitor_hash: str = Field(index=True)  # hashed IP+UA, for rough unique-visitor counts
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class PageViewCreate(SQLModel):
    path: str = Field(min_length=1, max_length=500)
    referrer: Optional[str] = Field(default=None, max_length=500)


def hash_visitor(ip: str, user_agent: str, salt: str) -> str:
    raw = f"{salt}:{ip}:{user_agent}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()
