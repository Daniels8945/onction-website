from collections import Counter, defaultdict
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Request
from sqlmodel import Session, select

from ..config import get_settings
from ..database import get_session
from ..models import Enquiry
from ..models_admin import AdminUser
from ..models_analytics import PageView, PageViewCreate, hash_visitor
from ..security import get_current_admin

router = APIRouter(prefix="/api/analytics", tags=["analytics"])
settings = get_settings()


@router.post("/track", status_code=204)
def track_pageview(payload: PageViewCreate, request: Request, session: Session = Depends(get_session)):
    """Public, unauthenticated — called by the tiny beacon script on every
    page of the public site. No PII is stored: the IP is hashed with the
    JWT secret as salt and never persisted in the clear."""
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "")
    view = PageView(
        path=payload.path,
        referrer=payload.referrer,
        user_agent=user_agent[:500],
        visitor_hash=hash_visitor(client_ip, user_agent, settings.jwt_secret),
    )
    session.add(view)
    session.commit()


def _day_bucket(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d")


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
    unique_visitors: set = set()

    for v in views:
        bucket = _day_bucket(v.created_at)
        per_day_counts[bucket] += 1
        per_day_visitors[bucket].add(v.visitor_hash)
        path_counts[v.path] += 1
        unique_visitors.add(v.visitor_hash)
        if v.referrer:
            referrer_counts[v.referrer] += 1

    series = [
        {"date": bucket, "pageviews": per_day_counts[bucket], "unique_visitors": len(per_day_visitors[bucket])}
        for bucket in sorted(per_day_counts.keys())
    ]

    return {
        "series": series,
        "top_pages": [{"path": p, "count": c} for p, c in path_counts.most_common(10)],
        "top_referrers": [{"referrer": r, "count": c} for r, c in referrer_counts.most_common(10)],
        "totals": {"pageviews": len(views), "unique_visitors": len(unique_visitors)},
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

    per_day_counts: dict[str, int] = defaultdict(int)
    country_counts: Counter = Counter()
    for e in current_period:
        per_day_counts[_day_bucket(e.created_at)] += 1
        if e.country:
            country_counts[e.country] += 1

    series = [{"date": bucket, "enquiries": count} for bucket, count in sorted(per_day_counts.items())]

    current_total = len(current_period)
    prior_total = len(prior_period)
    delta_pct = None
    if prior_total > 0:
        delta_pct = round(((current_total - prior_total) / prior_total) * 100, 1)

    return {
        "series": series,
        "by_country": [{"country": c, "count": n} for c, n in country_counts.most_common(10)],
        "totals": {
            "current_period": current_total,
            "prior_period": prior_total,
            "delta_pct": delta_pct,
        },
    }
