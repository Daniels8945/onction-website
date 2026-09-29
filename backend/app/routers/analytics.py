from collections import Counter, defaultdict
from datetime import datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, Request
from sqlmodel import Session, func, select

from ..analytics_utils import categorize_referrer, day_bucket, parse_browser_os, resolve_country
from ..config import get_settings
from ..database import engine, get_session
from ..models import Enquiry
from ..models_admin import AdminUser
from ..models_analytics import PageView, PageViewCreate, hash_visitor
from ..models_events import Registration
from ..security import get_current_admin

router = APIRouter(prefix="/api/analytics", tags=["analytics"])
settings = get_settings()


def _resolve_and_store_country(view_id: int, ip: str) -> None:
    """Runs after the response has already gone out — resolves the visitor's
    country from their IP and stores only that, never the IP itself."""
    country = resolve_country(ip)
    if not country:
        return
    with Session(engine) as session:
        view = session.get(PageView, view_id)
        if view:
            view.country = country
            session.add(view)
            session.commit()


@router.post("/track", status_code=204)
def track_pageview(
    payload: PageViewCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    """Public, unauthenticated — called by the tiny beacon script on every
    page of the public site. No PII is stored: the IP is hashed with the
    JWT secret as salt and never persisted in the clear, and is only ever
    held in memory long enough for the background GeoIP lookup below."""
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "")
    view = PageView(
        path=payload.path,
        referrer=payload.referrer,
        user_agent=user_agent[:500],
        visitor_hash=hash_visitor(client_ip, user_agent, settings.jwt_secret),
        session_id=payload.session_id,
        utm_source=payload.utm_source,
        utm_medium=payload.utm_medium,
        utm_campaign=payload.utm_campaign,
        utm_term=payload.utm_term,
        utm_content=payload.utm_content,
        referrer_category=categorize_referrer(payload.referrer, payload.utm_medium),
    )
    session.add(view)
    session.commit()
    session.refresh(view)
    background_tasks.add_task(_resolve_and_store_country, view.id, client_ip)


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
