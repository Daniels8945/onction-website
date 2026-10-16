import logging
from datetime import datetime

from sqlmodel import Session, select
from user_agents import parse as parse_user_agent

logger = logging.getLogger("onction.analytics")

# --- Referrer categorization ------------------------------------------------

_SEARCH_DOMAINS = ("google.", "bing.", "yahoo.", "duckduckgo.", "baidu.", "yandex.", "ecosia.")
_SOCIAL_DOMAINS = (
    "facebook.", "fb.com", "twitter.", "x.com", "linkedin.", "instagram.",
    "t.co", "youtube.", "tiktok.", "pinterest.", "reddit.",
)


def categorize_referrer(referrer: str | None, utm_medium: str | None) -> str:
    """Buckets a raw referrer/UTM medium into Direct / Search / Social /
    Email / Referral — the classic acquisition channels, rather than a flat
    list of domains no one can act on."""
    if utm_medium:
        medium = utm_medium.lower()
        if medium in ("email", "newsletter"):
            return "Email"
        if medium in ("social", "social-media"):
            return "Social"
        if medium in ("cpc", "ppc", "paid-search", "search"):
            return "Search"
    if not referrer:
        return "Direct"
    ref = referrer.lower()
    if any(d in ref for d in _SEARCH_DOMAINS):
        return "Search"
    if any(d in ref for d in _SOCIAL_DOMAINS):
        return "Social"
    return "Referral"


# --- User-agent parsing (done at query time — the raw string is already
# stored, so there's nothing to migrate; just read it lazily) --------------

def parse_browser_os(user_agent: str | None) -> tuple[str, str]:
    if not user_agent:
        return "Unknown", "Unknown"
    ua = parse_user_agent(user_agent)
    browser = ua.browser.family or "Unknown"
    os_name = ua.os.family or "Unknown"
    return browser, os_name


# Country: the old third-party IP lookup (which sent visitors' IP addresses
# to an external service) has been removed. Country now comes only from
# Cloudflare's CF-IPCountry header at ingestion — see analytics_engine.

# --- Session attribution -----------------------------------------------------

def get_session_attribution(session: Session, session_id: str | None) -> dict:
    """Looks up the landing pageview for a browser session (by its
    client-generated session_id) and returns the acquisition data it
    carried, plus the session id and landing page — used to attribute an
    enquiry/registration back to the visit and channel that produced it.
    Only anonymous analytics data flows this way; nothing personal goes
    into analytics."""
    from .models_analytics import PageView  # local import avoids a cycle

    if not session_id:
        return {}
    first_view = session.exec(
        select(PageView).where(PageView.session_id == session_id).order_by(PageView.created_at)
    ).first()
    if first_view is None:
        return {}
    return {
        "session_id": session_id,
        "landing_path": first_view.path,
        "utm_source": first_view.utm_source,
        "utm_medium": first_view.utm_medium,
        "utm_campaign": first_view.utm_campaign,
        "referrer_category": first_view.referrer_category,
    }


def day_bucket(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d")
