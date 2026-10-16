import csv
import io
import time
from collections import Counter, defaultdict
from datetime import date as date_
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, delete, func, select

from ..analytics_engine import (
    MAX_ENGAGED_MS_PER_VIEW, classify_channel, clean_id, country_from_headers, hash_id, is_internal_path,
    is_known_route, normalize_path, parse_agent, referrer_domain,
)
from ..analytics_reports import build_report, export_rows
from ..analytics_utils import categorize_referrer, day_bucket, parse_browser_os
from ..config import get_settings
from ..database import get_session
from ..models import Enquiry
from ..models_admin import AdminUser
from ..models_analytics import AnalyticsDaily, AnalyticsEvent, EngagementUpdate, EventCreate, PageView, PageViewCreate
from ..models_events import Registration
from ..security import get_current_admin

router = APIRouter(prefix="/api/analytics", tags=["analytics"])
settings = get_settings()


# ── Ingestion (public, unauthenticated) ─────────────────────────────────────
# The public site sends three kinds of beacons, all only after the visitor has
# accepted analytics: pageviews, engagement-time updates for a pageview, and a
# few interaction events. Each is validated here; anything from bots, the
# dashboard, staff previews or malformed paths is counted (for the health
# report) and dropped. No IP address is stored or sent anywhere.

EVENT_TYPES = {
    "form_view": {"form": {"enquiry"}},
    "form_start": {"form": {"enquiry", "registration"}},
    "contact_click": {"method": {"phone", "email"}},
}

_rate: dict[str, list[float]] = {}
_last_purge = {"day": ""}


def _client_ip(request: Request) -> str:
    # Only for rate limiting (never stored). Behind Cloudflare + nginx the
    # socket address is the proxy, so prefer the forwarded client address.
    fwd = request.headers.get("cf-connecting-ip") or (request.headers.get("x-forwarded-for") or "").split(",")[0].strip()
    return fwd or (request.client.host if request.client else "unknown")


def _rate_limited(request: Request, limit: int = 240, window: float = 60.0) -> bool:
    now = time.time()
    key = _client_ip(request)
    hits = [t for t in _rate.get(key, []) if now - t < window]
    hits.append(now)
    _rate[key] = hits
    if len(_rate) > 5000:  # keep memory bounded
        for k in list(_rate)[:2500]:
            _rate.pop(k, None)
    return len(hits) > limit


def _count(session: Session, **fields: int) -> None:
    day = datetime.utcnow().strftime("%Y-%m-%d")
    row = session.get(AnalyticsDaily, day) or AnalyticsDaily(day=day)
    for k, v in fields.items():
        setattr(row, k, (getattr(row, k) or 0) + v)
    session.add(row)


def _purge_old(session: Session) -> None:
    """Retention: once a day, delete raw events past the retention window."""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    if _last_purge["day"] == today:
        return
    _last_purge["day"] = today
    cutoff = datetime.utcnow() - timedelta(days=settings.analytics_retention_days)
    session.exec(delete(PageView).where(PageView.created_at < cutoff))  # type: ignore[call-overload]
    session.exec(delete(AnalyticsEvent).where(AnalyticsEvent.created_at < cutoff))  # type: ignore[call-overload]


@router.post("/track", status_code=204)
def track_pageview(payload: PageViewCreate, request: Request, session: Session = Depends(get_session)):
    """One public pageview. Idempotent per event_id, so beacon retries are harmless."""
    if _rate_limited(request):
        raise HTTPException(status_code=429, detail="Too many requests")
    agent = parse_agent(request.headers.get("user-agent", ""))
    path = normalize_path(payload.path)
    if agent["bot"]:
        _count(session, received=1, bots=1)
    elif path is None:
        _count(session, received=1, invalid=1)
    elif is_internal_path(path):
        _count(session, received=1, internal=1)
    elif payload.event_id and session.exec(select(PageView.id).where(PageView.event_id == payload.event_id)).first():
        _count(session, received=1, duplicates=1)
    else:
        ref = referrer_domain(payload.referrer, payload.host)
        view = PageView(
            path=path,
            referrer=ref,  # domain only, never the full URL
            referrer_domain=ref,
            user_agent=(request.headers.get("user-agent", "") or "")[:500],
            # legacy column: kept non-empty for older reports; no IP is used for it any more
            visitor_hash=hash_id(payload.visitor_id, settings.jwt_secret) or "unknown",
            visitor_id=hash_id(payload.visitor_id, settings.jwt_secret),
            session_id=clean_id(payload.session_id),
            event_id=clean_id(payload.event_id),
            host=(payload.host or "")[:100].lower() or None,
            known_route=is_known_route(session, path),
            utm_source=payload.utm_source,
            utm_medium=payload.utm_medium,
            utm_campaign=payload.utm_campaign,
            utm_term=payload.utm_term,
            utm_content=payload.utm_content,
            referrer_category=classify_channel(ref, payload.utm_source, payload.utm_medium),
            device=agent["device"],
            browser=agent["browser"],
            os=agent["os"],
            viewport=payload.viewport if payload.viewport in ("s", "m", "l", "xl") else None,
            country=country_from_headers(request.headers),
        )
        session.add(view)
        _count(session, received=1, stored=1)
        _purge_old(session)
    try:
        session.commit()
    except IntegrityError:  # the same event_id raced in twice
        session.rollback()


@router.post("/engage", status_code=204)
def track_engagement(payload: EngagementUpdate, request: Request, session: Session = Depends(get_session)):
    """Visible, in-use time for a pageview (sent as the visitor leaves the page
    or hides the tab). Only ever raises the stored value, capped per page."""
    if _rate_limited(request):
        raise HTTPException(status_code=429, detail="Too many requests")
    view = session.exec(select(PageView).where(PageView.event_id == payload.event_id)).first()
    if view is None or datetime.utcnow() - view.created_at > timedelta(hours=6):
        return
    value = min(payload.engaged_ms, MAX_ENGAGED_MS_PER_VIEW)
    if view.engaged_ms is None or value > view.engaged_ms:
        view.engaged_ms = value
        session.add(view)
        _count(session, engagement_updates=1)
        session.commit()


@router.post("/event", status_code=204)
def track_event(payload: EventCreate, request: Request, session: Session = Depends(get_session)):
    """A whitelisted interaction (see EVENT_TYPES). Properties outside the
    whitelist are discarded, so no personal data can be recorded here."""
    if _rate_limited(request):
        raise HTTPException(status_code=429, detail="Too many requests")
    spec = EVENT_TYPES.get(payload.type)
    path = normalize_path(payload.path)
    agent = parse_agent(request.headers.get("user-agent", ""))
    if spec is None or path is None or agent["bot"] or is_internal_path(path):
        _count(session, received=1, invalid=0 if agent["bot"] else 1, bots=1 if agent["bot"] else 0)
        session.commit()
        return
    props = {k: v for k, v in (payload.props or {}).items() if k in spec and v in spec[k]}
    if session.exec(select(AnalyticsEvent.id).where(AnalyticsEvent.event_id == payload.event_id)).first():
        _count(session, received=1, duplicates=1)
        session.commit()
        return
    session.add(AnalyticsEvent(
        event_id=payload.event_id, type=payload.type, path=path, props=props,
        session_id=clean_id(payload.session_id), visitor_id=hash_id(payload.visitor_id, settings.jwt_secret),
        host=(payload.host or "")[:100].lower() or None,
    ))
    _count(session, received=1, stored=1)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()


# ── Reports (dashboard) ──────────────────────────────────────────────────────
@router.get("/report")
def analytics_report(
    start: date_ = Query(...),
    end: date_ = Query(...),
    compare: bool = True,
    host: str | None = None,
    channel: str | None = None,
    device: str | None = None,
    page: str | None = None,
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin),
):
    """Everything the Analytics page shows, for one date range (inclusive, WAT)."""
    if end < start:
        raise HTTPException(status_code=400, detail="The end date is before the start date.")
    if (end - start).days > 400:
        raise HTTPException(status_code=400, detail="Choose a range of 400 days or less.")
    return build_report(session, start, end, compare=compare, host=host, channel=channel, device=device, page=page)


@router.get("/export")
def analytics_export(
    report: str,
    start: date_ = Query(...),
    end: date_ = Query(...),
    host: str | None = None,
    channel: str | None = None,
    device: str | None = None,
    page: str | None = None,
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin),
):
    """The same report as the dashboard, as CSV (aggregates only — no visitor
    or session identifiers, no personal data)."""
    if end < start or (end - start).days > 400:
        raise HTTPException(status_code=400, detail="Invalid date range.")
    data = build_report(session, start, end, compare=False, host=host, channel=channel, device=device, page=page)
    rows = export_rows(data, report)
    if rows is None:
        raise HTTPException(status_code=404, detail="Unknown report.")
    buf = io.StringIO()
    writer = csv.writer(buf)
    for r in rows:
        writer.writerow(r)
    name = f"onction-{report}-{start}-to-{end}.csv"
    return Response(buf.getvalue(), media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="{name}"', "Cache-Control": "no-store"})


# ── Legacy endpoints (v1 dashboard) — kept for compatibility ─────────────────
@router.get("/traffic")
def traffic_analytics(
    days: int = 30,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    since = datetime.utcnow() - timedelta(days=days)
    views = session.exec(select(PageView).where(PageView.created_at >= since)).all()

    per_day_counts: dict[str, int] = defaultdict(int)
    per_day_visitors: dict[str, set] = defaultdict(set)
    path_counts: Counter = Counter()
    referrer_counts: Counter = Counter()
    referrer_category_counts: Counter = Counter()
    utm_campaign_counts: Counter = Counter()
    country_counts: Counter = Counter()
    browser_counts: Counter = Counter()
    os_counts: Counter = Counter()
    unique_visitors: set = set()

    # --- session grouping (rows without a session_id predate this feature,
    # or came from a non-JS client — they still count in the raw totals
    # above, but can't participate in session-shaped metrics below) -------
    sessions: dict[str, list[PageView]] = defaultdict(list)

    for v in views:
        bucket = day_bucket(v.created_at)
        per_day_counts[bucket] += 1
        per_day_visitors[bucket].add(v.visitor_hash)
        path_counts[v.path] += 1
        unique_visitors.add(v.visitor_hash)
        if v.referrer:
            referrer_counts[v.referrer] += 1
        referrer_category_counts[v.referrer_category or categorize_referrer(v.referrer, v.utm_medium)] += 1
        if v.utm_campaign:
            utm_campaign_counts[v.utm_campaign] += 1
        if v.country:
            country_counts[v.country] += 1
        browser, os_name = parse_browser_os(v.user_agent)
        browser_counts[browser] += 1
        os_counts[os_name] += 1
        if v.session_id:
            sessions[v.session_id].append(v)

    landing_counts: Counter = Counter()
    exit_counts: Counter = Counter()
    time_on_page_seconds: list[float] = []
    bounced = 0
    session_visitor_first_seen: dict[str, tuple[str, datetime]] = {}  # session_id -> (visitor_hash, first pageview time)

    for sid, rows in sessions.items():
        rows.sort(key=lambda r: r.created_at)
        landing_counts[rows[0].path] += 1
        exit_counts[rows[-1].path] += 1
        if len(rows) == 1:
            bounced += 1
        for a, b in zip(rows, rows[1:]):
            time_on_page_seconds.append((b.created_at - a.created_at).total_seconds())
        session_visitor_first_seen[sid] = (rows[0].visitor_hash, rows[0].created_at)

    total_sessions = len(sessions)
    bounce_rate = round((bounced / total_sessions) * 100, 1) if total_sessions else None
    avg_time_on_page = round(sum(time_on_page_seconds) / len(time_on_page_seconds), 1) if time_on_page_seconds else None

    # --- new vs. returning: was this visitor ever seen before their
    # earliest pageview in *this* session, at any point in the site's history?
    new_count = 0
    returning_count = 0
    hashes = {h for h, _ in session_visitor_first_seen.values()}
    all_time_first_seen: dict[str, datetime] = {}
    if hashes:
        rows = session.exec(
            select(PageView.visitor_hash, func.min(PageView.created_at))
            .where(PageView.visitor_hash.in_(hashes))
            .group_by(PageView.visitor_hash)
        ).all()
        all_time_first_seen = dict(rows)
    for visitor_hash, session_start in session_visitor_first_seen.values():
        if all_time_first_seen.get(visitor_hash, session_start) < session_start:
            returning_count += 1
        else:
            new_count += 1

    series = [
        {"date": bucket, "pageviews": per_day_counts[bucket], "unique_visitors": len(per_day_visitors[bucket])}
        for bucket in sorted(per_day_counts.keys())
    ]

    return {
        "series": series,
        "top_pages": [{"path": p, "count": c} for p, c in path_counts.most_common(10)],
        "top_referrers": [{"referrer": r, "count": c} for r, c in referrer_counts.most_common(10)],
        "totals": {"pageviews": len(views), "unique_visitors": len(unique_visitors)},
        "landing_pages": [{"path": p, "count": c} for p, c in landing_counts.most_common(10)],
        "exit_pages": [{"path": p, "count": c} for p, c in exit_counts.most_common(10)],
        "bounce_rate_pct": bounce_rate,
        "avg_time_on_page_seconds": avg_time_on_page,
        "new_vs_returning": {"new": new_count, "returning": returning_count},
        "browsers": [{"name": b, "count": c} for b, c in browser_counts.most_common(8)],
        "operating_systems": [{"name": o, "count": c} for o, c in os_counts.most_common(8)],
        "referrer_categories": [{"category": r, "count": c} for r, c in referrer_category_counts.most_common()],
        "top_campaigns": [{"campaign": c, "count": n} for c, n in utm_campaign_counts.most_common(10)],
        "countries": [{"country": c, "count": n} for c, n in country_counts.most_common(10)],
    }


@router.get("/business")
def business_analytics(
    days: int = 30,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    since = datetime.utcnow() - timedelta(days=days)
    prior_since = since - timedelta(days=days)

    current_period = session.exec(select(Enquiry).where(Enquiry.created_at >= since)).all()
    prior_period = session.exec(
        select(Enquiry).where(Enquiry.created_at >= prior_since, Enquiry.created_at < since)
    ).all()
    current_registrations = session.exec(select(Registration).where(Registration.created_at >= since)).all()

    per_day_counts: dict[str, int] = defaultdict(int)
    country_counts: Counter = Counter()
    channel_counts: Counter = Counter()
    for e in current_period:
        per_day_counts[day_bucket(e.created_at)] += 1
        if e.country:
            country_counts[e.country] += 1
        channel_counts[e.referrer_category or "Unknown"] += 1
    for r in current_registrations:
        channel_counts[r.referrer_category or "Unknown"] += 1

    series = [{"date": bucket, "enquiries": count} for bucket, count in sorted(per_day_counts.items())]

    current_total = len(current_period)
    prior_total = len(prior_period)
    delta_pct = None
    if prior_total > 0:
        delta_pct = round(((current_total - prior_total) / prior_total) * 100, 1)

    return {
        "series": series,
        "by_country": [{"country": c, "count": n} for c, n in country_counts.most_common(10)],
        "conversions_by_channel": [{"channel": ch, "count": n} for ch, n in channel_counts.most_common(10)],
        "totals": {
            "current_period": current_total,
            "prior_period": prior_total,
            "delta_pct": delta_pct,
            "registrations_current_period": len(current_registrations),
        },
    }
