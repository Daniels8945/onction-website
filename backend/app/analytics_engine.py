"""Analytics v2 — ingestion rules shared by the tracking endpoints and reports.

Everything here is deterministic and documented, because the dashboard shows
these definitions to the people reading the numbers (see METRIC_DEFINITIONS
in analytics_reports.py).
"""
import hashlib
import re
import time
from datetime import datetime, timedelta, timezone
from urllib.parse import urlsplit

from sqlmodel import Session, select
from user_agents import parse as parse_user_agent

# ── Reporting timezone ────────────────────────────────────────────────────────
# Onction reports in West Africa Time (Lagos). WAT is UTC+1 all year — Nigeria
# has no daylight saving — so a fixed offset is exact (and avoids depending on
# a tz database in the slim container).
WAT = timezone(timedelta(hours=1), "WAT")
TZ_LABEL = "West Africa Time (WAT, UTC+1)"

# A visit ends after this much inactivity (the browser starts a new session id).
SESSION_TIMEOUT_MIN = 30
# One page can't count more engaged time than this (guards against stuck tabs).
MAX_ENGAGED_MS_PER_VIEW = 30 * 60 * 1000

# ── Paths ─────────────────────────────────────────────────────────────────────
STATIC_ROUTES = {
    "/", "/about", "/leadership", "/solutions", "/how-we-trade", "/market", "/sustainability",
    "/case-studies", "/partners", "/media", "/news", "/events", "/contact", "/sitemap", "/cookies", "/unsubscribe",
}
_SLASHES = re.compile(r"/{2,}")


def normalize_path(raw: str) -> str | None:
    """'/About/?utm_source=x#team' → '/about'. None if it isn't a site path.
    Query strings and fragments are dropped (UTM values are captured
    separately); case and trailing slashes are folded so one page is one row."""
    if not raw or not raw.startswith("/") or "://" in raw or "\\" in raw:
        return None
    path = raw.split("#", 1)[0].split("?", 1)[0]
    path = _SLASHES.sub("/", path).lower()
    if len(path) > 1:
        path = path.rstrip("/") or "/"
    if len(path) > 200 or not re.fullmatch(r"[a-z0-9/_\-.%~]+", path):
        return None
    return path


def is_internal_path(path: str) -> bool:
    return path == "/admin" or path.startswith("/admin/")


_known_cache: dict = {"at": 0.0, "dynamic": set()}


def _dynamic_routes(session: Session) -> set[str]:
    """Published news/event/custom pages, refreshed at most once a minute."""
    if time.time() - _known_cache["at"] < 60:
        return _known_cache["dynamic"]
    from .models_content import Page
    from .models_events import Event
    from .models_news import Post

    routes = {f"/news/{s}" for s in session.exec(select(Post.slug).where(Post.status == "published")).all()}
    routes |= {f"/events/{s}" for s in session.exec(select(Event.slug).where(Event.status == "published")).all()}
    routes |= {f"/{s.strip('/')}" for s in session.exec(select(Page.slug).where(Page.status == "published")).all()}
    _known_cache.update(at=time.time(), dynamic=routes)
    return routes


def is_known_route(session: Session, path: str) -> bool:
    return path in STATIC_ROUTES or path in _dynamic_routes(session)


# ── Referrers & channels ──────────────────────────────────────────────────────
_SEARCH = ("google.", "bing.", "yahoo.", "duckduckgo.", "baidu.", "yandex.", "ecosia.", "search.brave.", "startpage.")
_SOCIAL = ("facebook.", "fb.com", "fb.me", "twitter.", "x.com", "t.co", "linkedin.", "lnkd.in", "instagram.", "youtube.", "youtu.be",
           "tiktok.", "pinterest.", "reddit.", "whatsapp.", "wa.me", "threads.net")
_EMAIL = ("mail.google.", "outlook.", "mail.yahoo.", "webmail.")
_LOCAL = re.compile(r"^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$")


def site_root(host: str | None) -> str:
    h = (host or "").lower().split(":")[0]
    return h[4:] if h.startswith("www.") else h


def referrer_domain(referrer: str | None, host: str | None) -> str | None:
    """Only the domain of an *external* referrer is kept — never the path or
    query string (which can carry tokens or personal data). Links from the
    site itself (including its www/vendors subdomains) are not referrals."""
    if not referrer:
        return None
    try:
        netloc = urlsplit(referrer).hostname or ""
    except ValueError:
        return None
    netloc = netloc.lower()
    if not netloc:
        return None
    own = site_root(host)
    bare = netloc[4:] if netloc.startswith("www.") else netloc
    if own and (bare == own or bare.endswith("." + own)):
        return None
    return bare[:200]


def is_local_host(host: str | None) -> bool:
    return bool(_LOCAL.match((host or "").split(":")[0].lower()))


PAID_SEARCH_MEDIA = {"cpc", "ppc", "paid-search", "paidsearch", "sem"}
PAID_SOCIAL_MEDIA = {"paid-social", "paidsocial", "social-paid", "paid_social"}
ORGANIC_SOCIAL_MEDIA = {"social", "social-media", "organic-social"}
EMAIL_MEDIA = {"email", "e-mail", "newsletter"}

CHANNEL_RULES = [
    ("Paid search", "utm_medium is cpc, ppc, paid-search or sem"),
    ("Paid social", "utm_medium is paid-social (or paid_social / social-paid)"),
    ("Email", "utm_medium is email or newsletter, or the visitor came from a webmail site"),
    ("Organic social", "utm_medium is social, or the referrer is a social network"),
    ("Organic search", "the referrer is a search engine (Google, Bing, DuckDuckGo…)"),
    ("Other campaign", "utm tags are present but don't match the rules above"),
    ("Referral", "the referrer is another website"),
    ("Direct / unknown", "no referrer and no campaign tags — typed URLs and bookmarks, but also apps and browsers that hide the referrer, so it isn't proof of direct traffic"),
]


def classify_channel(ref_domain: str | None, utm_source: str | None, utm_medium: str | None) -> str:
    medium = (utm_medium or "").strip().lower()
    if medium in PAID_SEARCH_MEDIA:
        return "Paid search"
    if medium in PAID_SOCIAL_MEDIA:
        return "Paid social"
    if medium in EMAIL_MEDIA:
        return "Email"
    if medium in ORGANIC_SOCIAL_MEDIA:
        return "Organic social"
    d = ref_domain or ""
    if d and any(x in d for x in _EMAIL):
        return "Email"
    if d and any(x in d for x in _SOCIAL):
        return "Organic social"
    if d and any(x in d for x in _SEARCH):
        return "Organic search"
    if medium or utm_source:
        return "Other campaign"
    if d:
        return "Referral"
    return "Direct / unknown"


# ── Devices, browsers, bots ───────────────────────────────────────────────────
def parse_agent(user_agent: str | None) -> dict:
    if not user_agent:
        return {"device": "unknown", "browser": "Unknown", "os": "Unknown", "bot": False}
    ua = parse_user_agent(user_agent)
    device = "tablet" if ua.is_tablet else "mobile" if ua.is_mobile else "desktop" if ua.is_pc else "unknown"
    headless = "headless" in user_agent.lower()
    return {"device": device, "browser": (ua.browser.family or "Unknown")[:40], "os": (ua.os.family or "Unknown")[:40], "bot": bool(ua.is_bot or headless)}


def hash_id(value: str | None, salt: str) -> str | None:
    """The browser's anonymous id is stored only as a salted hash."""
    if not value or not re.fullmatch(r"[A-Za-z0-9\-]{8,64}", value):
        return None
    return hashlib.sha256(f"{salt}:visitor:{value}".encode()).hexdigest()[:32]


def clean_id(value: str | None) -> str | None:
    return value if value and re.fullmatch(r"[A-Za-z0-9\-]{8,100}", value) else None


def country_from_headers(headers) -> str | None:
    """Cloudflare adds CF-IPCountry (ISO 3166 alpha-2) to every request it
    proxies. XX = unknown, T1 = Tor. No IP address is looked up or stored."""
    code = (headers.get("cf-ipcountry") or "").strip().upper()
    return code if re.fullmatch(r"[A-Z]{2}", code) and code not in ("XX", "T1") else None


def utc_naive(dt: datetime) -> datetime:
    return dt.astimezone(timezone.utc).replace(tzinfo=None)
