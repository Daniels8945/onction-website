"""Server-side rules shared by the news and events editors.

The dashboard checks these too, but the API is the authority: anything that
reaches the database has passed them, whoever sent the request.
"""
import re
from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
STATUSES = ("draft", "published")


def bad_request(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)


def check_slug(slug: str) -> str:
    slug = (slug or "").strip()
    if not slug or len(slug) > 200 or not SLUG_RE.match(slug):
        raise bad_request("The web address may only use lowercase letters, numbers and single hyphens (e.g. wapp-forum-2026)")
    return slug


def check_status(value: str) -> str:
    if value not in STATUSES:
        raise bad_request("Status must be draft or published")
    return value


def check_text(value: str, label: str) -> str:
    value = (value or "").strip()
    if not value:
        raise bad_request(f"{label} is required")
    return value


def check_image_url(url: Optional[str]) -> Optional[str]:
    """An uploaded file (/api/files/…) or a full http(s) address — the only
    forms the website renders. Empty means no image."""
    url = (url or "").strip()
    if not url:
        return None
    if len(url) > 1000:
        raise bad_request("The image address is too long")
    if url.startswith("/") and not url.startswith("//"):
        return url
    if re.match(r"^https?://[^\s/]+", url, re.IGNORECASE):
        return url
    raise bad_request("The image must be an uploaded file or an address starting with https://")


def check_not_stale(current: datetime, expected: Optional[datetime]) -> None:
    """Optimistic locking: the editor sends back the updated_at it loaded.
    If someone saved in between, refuse instead of silently overwriting."""
    if expected is None:
        return
    if expected.tzinfo is not None:
        expected = expected.replace(tzinfo=None)
    if abs((current - expected).total_seconds()) > 0.001:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Someone else saved this since you opened it. Reload to see their changes before saving again.",
        )
