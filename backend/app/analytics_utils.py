import json
import logging
import urllib.request
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


# --- GeoIP (best-effort, non-blocking) --------------------------------------
# No MaxMind account on file, so this calls a free, no-signup IP-geolocation
# API instead of a local GeoLite2 database. Same privacy pattern as the
# visitor hash: the IP is used for one lookup and never persisted — only
# the resolved country is stored. Trade-off: an external HTTP call in the
# path (run as a background task so it never slows the tracking beacon),
# subject to that free service's uptime/rate limits. Swap for a local
# MaxMind GeoLite2 database later if that becomes unreliable at your volume.

def resolve_country(ip: str) -> str | None:
    if not ip or ip in ("unknown", "127.0.0.1", "testclient"):
        return None
    try:
        req = urllib.request.Request(
            f"https://ipapi.co/{ip}/json/",
            headers={"User-Agent": "onction-energy-website/1.0"},
        )
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read())
        country = data.get("country_name")
        return country if isinstance(country, str) and country else None
    except Exception as exc:  # noqa: BLE001 — best-effort, never fatal
        logger.info("GeoIP lookup failed for this request: %s", exc)
        return None


# --- Session attribution -----------------------------------------------------

def get_session_attribution(session: Session, session_id: str | None) -> dict:
    """Looks up the landing pageview for a browser session (by its
    client-generated session_id) and returns the acquisition data it
    carried — used to attribute an enquiry/registration back to the
    channel that actually produced it."""
    from .models_analytics import PageView  # local import avoids a cycle

    if not session_id:
        return {}
    first_view = session.exec(
        select(PageView).where(PageView.session_id == session_id).order_by(PageView.created_at)
    ).first()
    if first_view is None:
        return {}
    return {
        "utm_source": first_view.utm_source,
        "utm_medium": first_view.utm_medium,
        "utm_campaign": first_view.utm_campaign,
        "referrer_category": first_view.referrer_category,
    }


def day_bucket(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d")
