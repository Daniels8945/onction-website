"""Analytics v2 reports: everything the dashboard shows for a date range.

Computed on the server from stored events, in West Africa Time, with the
definitions in METRIC_DEFINITIONS. Nothing is estimated or back-filled: a
figure that can't be measured is returned as None with a reason, and small
samples are flagged rather than hidden.
"""
from collections import Counter, defaultdict
from datetime import date, datetime, time, timedelta
from statistics import median

from sqlmodel import Session, func, select

from .analytics_engine import (
    CHANNEL_RULES, SESSION_TIMEOUT_MIN, TZ_LABEL, WAT, classify_channel, is_local_host, parse_agent, utc_naive,
)
from .models import Enquiry
from .models_analytics import AnalyticsDaily, AnalyticsEvent, PageView
from .models_events import Registration

ENGAGED_MS = 10_000  # a session with at least this much visible, in-use time is engaged
SMALL_SAMPLE = 30  # fewer sessions than this: rates are indicative only
MIN_ROW_SAMPLE = 10  # rates in a table row need at least this many observations

METRIC_DEFINITIONS = {
    "pageviews": "Public pages viewed by visitors who accepted analytics. Bots, the admin dashboard and staff previews are excluded.",
    "visitors": "Distinct browsers, identified by a random anonymous ID stored on the device after the visitor accepts analytics. One person on two devices counts twice; clearing storage or declining analytics makes them uncountable. Visits from the previous tracker aren't counted as visitors (its IP-based IDs were unreliable).",
    "sessions": f"A visit: pageviews from one browser with no gap longer than {SESSION_TIMEOUT_MIN} minutes.",
    "new_visitors": "Visitors in the period whose first recorded visit falls inside the period.",
    "returning_visitors": "Visitors in the period who were first recorded before it started.",
    "engaged_sessions": "Sessions with at least 10 seconds of visible, in-use time, or 2+ pageviews, or an enquiry/registration.",
    "engagement_rate": "Engaged sessions ÷ sessions.",
    "bounce_rate": "Sessions that were not engaged ÷ sessions (the inverse of engagement rate).",
    "avg_engagement_time": "Visible, in-use time per session, measured while the tab is in the foreground (paused when it's hidden, capped at 30 minutes per page). Older visits recorded before this measurement existed are excluded.",
    "session_length": "Time from the first to the last recorded pageview in a session. Single-page sessions count as 0 — this is why engagement time is the better measure.",
    "pages_per_session": "Pageviews ÷ sessions.",
    "enquiries": "Enquiry forms the server accepted (not clicks or attempts). Duplicate submissions are ignored.",
    "registrations": "Event registrations the server accepted (including waitlist places).",
    "conversion_rate": "Sessions with at least one accepted enquiry or registration ÷ all sessions. Only conversions from visitors who accepted analytics can be linked to a session.",
    "landing_page": "The first page of a session.",
    "exit_page": "The last page of a session. Exit rate = exits ÷ pageviews of that page.",
    "channel": "Where a session came from, decided from its landing page's campaign tags and referrer (rules listed in the Acquisition tab).",
}


# ── date handling ────────────────────────────────────────────────────────────
def _bounds(start: date, end: date) -> tuple[datetime, datetime]:
    """Inclusive WAT dates → naive UTC [from, to)."""
    a = datetime.combine(start, time.min, tzinfo=WAT)
    b = datetime.combine(end + timedelta(days=1), time.min, tzinfo=WAT)
    return utc_naive(a), utc_naive(b)


def _to_wat(dt: datetime) -> datetime:
    from datetime import timezone

    return dt.replace(tzinfo=timezone.utc).astimezone(WAT)


def _interval(days: int) -> str:
    return "hour" if days <= 2 else "day" if days <= 92 else "week"


def _bucket(dt: datetime, interval: str) -> str:
    w = _to_wat(dt)
    if interval == "hour":
        return w.strftime("%Y-%m-%d %H:00")
    if interval == "week":
        monday = (w - timedelta(days=w.weekday())).date()
        return monday.isoformat()
    return w.date().isoformat()


def _buckets(start: date, end: date, interval: str) -> list[str]:
    out = []
    if interval == "hour":
        t = datetime.combine(start, time.min)
        while t.date() <= end:
            out.append(t.strftime("%Y-%m-%d %H:00"))
            t += timedelta(hours=1)
    elif interval == "week":
        d = start - timedelta(days=start.weekday())
        while d <= end:
            out.append(d.isoformat())
            d += timedelta(days=7)
    else:
        d = start
        while d <= end:
            out.append(d.isoformat())
            d += timedelta(days=1)
    return out


def _pct(n: float, d: float) -> float | None:
    return round(n / d * 100, 1) if d else None


def _delta(cur, prev):
    if cur is None or prev is None:
        return None
    if prev == 0:
        return None  # a change from zero has no meaningful percentage
    return round((cur - prev) / prev * 100, 1)


# ── loading ──────────────────────────────────────────────────────────────────
def _views(session: Session, a: datetime, b: datetime, host: str | None) -> list[PageView]:
    q = select(PageView).where(PageView.created_at >= a, PageView.created_at < b)
    rows = session.exec(q).all()
    return [v for v in rows if _host_ok(v.host, host)]


def _host_ok(row_host: str | None, host: str | None) -> bool:
    if not host:
        return True
    if row_host is None:
        return True  # legacy rows didn't record the host
    return row_host == host


def _session_key(v: PageView) -> str:
    return v.session_id or f"legacy-view-{v.id}"


def _visitor_key(v: PageView) -> str:
    return v.visitor_id or f"legacy-{v.visitor_hash}"


def _channel(v: PageView) -> str:
    if v.event_id is None:  # legacy row: re-derive with the current rules (domain only)
        from .analytics_engine import referrer_domain

        return classify_channel(referrer_domain(v.referrer, v.host), v.utm_source, v.utm_medium)
    return v.referrer_category or classify_channel(v.referrer_domain, v.utm_source, v.utm_medium)


def _tech(v: PageView) -> dict:
    if v.device:
        return {"device": v.device, "browser": v.browser or "Unknown", "os": v.os or "Unknown"}
    p = parse_agent(v.user_agent)
    return {"device": p["device"], "browser": p["browser"], "os": p["os"]}


def _sessions(views: list[PageView], conversions: dict[str, dict]) -> dict[str, dict]:
    by: dict[str, list[PageView]] = defaultdict(list)
    for v in views:
        by[_session_key(v)].append(v)
    out = {}
    for sid, rows in by.items():
        rows.sort(key=lambda r: r.created_at)
        first, last = rows[0], rows[-1]
        measured = [r.engaged_ms for r in rows if r.engaged_ms is not None]
        conv = conversions.get(sid, {})
        legacy = first.event_id is None
        engaged_ms = sum(measured) if measured else None
        out[sid] = {
            "id": sid,
            "rows": rows,
            "visitor": _visitor_key(first),
            "start": first.created_at,
            "landing": first.path,
            "exit": last.path,
            "pageviews": len(rows),
            "paths": [r.path for r in rows],
            "engaged_ms": engaged_ms,
            "length_s": (last.created_at - first.created_at).total_seconds(),
            "channel": _channel(first),
            "referrer": first.referrer_domain or (None if not legacy else None),
            "utm": {"source": first.utm_source, "medium": first.utm_medium, "campaign": first.utm_campaign},
            "tech": _tech(first),
            "viewport": first.viewport,
            "country": first.country,
            "enquiries": conv.get("enquiries", 0),
            "registrations": conv.get("registrations", 0),
            "legacy": legacy,
        }
        s = out[sid]
        s["converted"] = s["enquiries"] + s["registrations"] > 0
        s["engaged"] = s["converted"] or s["pageviews"] >= 2 or (engaged_ms or 0) >= ENGAGED_MS
    return out


def _filter_sessions(sessions: dict, channel: str | None, device: str | None, page: str | None) -> dict:
    out = {}
    for k, s in sessions.items():
        if channel and s["channel"] != channel:
            continue
        if device and s["tech"]["device"] != device:
            continue
        if page and page not in s["paths"]:
            continue
        out[k] = s
    return out


def _conversions(session: Session, a: datetime, b: datetime):
    enq = session.exec(select(Enquiry).where(Enquiry.created_at >= a, Enquiry.created_at < b)).all()
    reg = session.exec(select(Registration).where(Registration.created_at >= a, Registration.created_at < b, Registration.status != "cancelled")).all()
    by_session: dict[str, dict] = defaultdict(lambda: {"enquiries": 0, "registrations": 0})
    for e in enq:
        if e.session_id:
            by_session[e.session_id]["enquiries"] += 1
    for r in reg:
        if r.session_id:
            by_session[r.session_id]["registrations"] += 1
    return enq, reg, by_session


# ── period summary ───────────────────────────────────────────────────────────
def _summary(session: Session, sessions: dict, views_in: list[PageView], enq, reg, period_start: datetime) -> dict:
    n = len(sessions)
    visitors = {s["visitor"] for s in sessions.values()}
    v2_visitors = {s["visitor"] for s in sessions.values() if not s["visitor"].startswith("legacy-")}
    first_seen = {}
    if v2_visitors:
        ids = [x for x in v2_visitors]
        for vid, first in session.exec(select(PageView.visitor_id, func.min(PageView.created_at)).where(PageView.visitor_id.in_(ids)).group_by(PageView.visitor_id)).all():  # type: ignore[union-attr]
            first_seen[vid] = first
    new = sum(1 for v in v2_visitors if first_seen.get(v, period_start) >= period_start)
    returning = len(v2_visitors) - new
    engaged = sum(1 for s in sessions.values() if s["engaged"])
    measured = [s["engaged_ms"] for s in sessions.values() if s["engaged_ms"] is not None]
    v2_lengths = [s["length_s"] for s in sessions.values() if not s["legacy"]]
    pageviews = sum(s["pageviews"] for s in sessions.values())
    converting = sum(1 for s in sessions.values() if s["converted"])
    return {
        "pageviews": pageviews,
        # only browsers with a reliable anonymous id; the old IP-based hashes are
        # known to be wrong behind the proxy, so they aren't counted as people
        "visitors": len(v2_visitors) if v2_visitors or not visitors else None,
        "legacy_sessions": sum(1 for s in sessions.values() if s["legacy"]),
        "sessions": n,
        "new_visitors": new if v2_visitors else None,
        "returning_visitors": returning if v2_visitors else None,
        "engaged_sessions": engaged,
        "engagement_rate": _pct(engaged, n),
        "bounce_rate": _pct(n - engaged, n),
        "avg_engagement_s": round(sum(measured) / len(measured) / 1000, 1) if measured else None,
        "engagement_measured_sessions": len(measured),
        "median_session_length_s": round(median(v2_lengths), 1) if v2_lengths else None,
        "pages_per_session": round(pageviews / n, 2) if n else None,
        "enquiries": len(enq),
        "registrations": len(reg),
        "attributed_conversions": converting,
        "conversion_rate": _pct(converting, n),
        "small_sample": n < SMALL_SAMPLE,
    }


# ── tables ───────────────────────────────────────────────────────────────────
def _pages(sessions: dict) -> list[dict]:
    stat = defaultdict(lambda: {"pageviews": 0, "visitors": set(), "entrances": 0, "engaged_entrances": 0, "exits": 0, "eng_ms": 0, "eng_n": 0, "assisted": 0, "landing_conv": 0, "bounces": 0})
    for s in sessions.values():
        seen = set()
        for r in s["rows"]:
            p = stat[r.path]
            p["pageviews"] += 1
            p["visitors"].add(s["visitor"])
            if r.engaged_ms is not None:
                p["eng_ms"] += r.engaged_ms
                p["eng_n"] += 1
            seen.add(r.path)
        land = stat[s["landing"]]
        land["entrances"] += 1
        land["engaged_entrances"] += 1 if s["engaged"] else 0
        land["bounces"] += 0 if s["engaged"] else 1
        land["landing_conv"] += 1 if s["converted"] else 0
        stat[s["exit"]]["exits"] += 1
        if s["converted"]:
            for path in seen:
                stat[path]["assisted"] += 1
    out = []
    for path, p in stat.items():
        out.append({
            "path": path,
            "pageviews": p["pageviews"],
            "visitors": len(p["visitors"]),
            "entrances": p["entrances"],
            "exits": p["exits"],
            "exit_rate": _pct(p["exits"], p["pageviews"]),
            "avg_engagement_s": round(p["eng_ms"] / p["eng_n"] / 1000, 1) if p["eng_n"] else None,
            "engagement_rate": _pct(p["engaged_entrances"], p["entrances"]),
            "bounce_rate": _pct(p["bounces"], p["entrances"]),
            "conversions_assisted": p["assisted"],
            "conversions_from_landing": p["landing_conv"],
            "low_sample": p["entrances"] < MIN_ROW_SAMPLE,
        })
    return sorted(out, key=lambda r: -r["pageviews"])


def _group(sessions: dict, key, label: str) -> list[dict]:
    g = defaultdict(lambda: {"sessions": 0, "visitors": set(), "engaged": 0, "conversions": 0, "landing": Counter(), "pageviews": 0})
    for s in sessions.values():
        k = key(s)
        if k is None:
            continue
        r = g[k]
        r["sessions"] += 1
        r["visitors"].add(s["visitor"])
        r["engaged"] += 1 if s["engaged"] else 0
        r["conversions"] += 1 if s["converted"] else 0
        r["landing"][s["landing"]] += 1
        r["pageviews"] += s["pageviews"]
    out = []
    for k, r in g.items():
        out.append({
            label: k,
            "sessions": r["sessions"],
            "visitors": len(r["visitors"]),
            "pageviews": r["pageviews"],
            "engagement_rate": _pct(r["engaged"], r["sessions"]),
            "conversions": r["conversions"],
            "conversion_rate": _pct(r["conversions"], r["sessions"]),
            "top_landing": [p for p, _ in r["landing"].most_common(3)],
            "low_sample": r["sessions"] < MIN_ROW_SAMPLE,
        })
    return sorted(out, key=lambda r: -r["sessions"])


def _paths(sessions: dict) -> list[dict]:
    seqs = Counter()
    multi = 0
    for s in sessions.values():
        steps = []
        for p in s["paths"]:
            if not steps or steps[-1] != p:
                steps.append(p)
        if len(steps) >= 2:
            multi += 1
            seqs[" → ".join(steps[:3])] += 1
    return [{"path": k, "sessions": v} for k, v in seqs.most_common(10)], multi


def _funnel(session: Session, sessions: dict, a: datetime, b: datetime) -> dict:
    ids = set(sessions)
    events = session.exec(select(AnalyticsEvent).where(AnalyticsEvent.created_at >= a, AnalyticsEvent.created_at < b)).all()
    by_type = defaultdict(set)
    contact = Counter()
    for e in events:
        if e.session_id in ids:
            key = f"{e.type}:{(e.props or {}).get('form', '')}"
            by_type[key].add(e.session_id)
            if e.type == "contact_click":
                contact[(e.props or {}).get("method", "other")] += 1
    enq_sessions = {k for k, s in sessions.items() if s["enquiries"]}
    reg_sessions = {k for k, s in sessions.items() if s["registrations"]}
    return {
        "enquiry": [
            {"step": "Saw the enquiry form", "sessions": len(by_type["form_view:enquiry"])},
            {"step": "Started filling it in", "sessions": len(by_type["form_start:enquiry"])},
            {"step": "Enquiry accepted", "sessions": len(enq_sessions)},
        ],
        "registration": [
            {"step": "Started a registration", "sessions": len(by_type["form_start:registration"])},
            {"step": "Registration accepted", "sessions": len(reg_sessions)},
        ],
        "contact_clicks": [{"method": m, "count": c} for m, c in contact.most_common()],
        "events_recorded": len(events),
    }


# ── health & insights ────────────────────────────────────────────────────────
def _health(session: Session, views: list[PageView], all_hosts: Counter, host: str | None, sessions: dict, enq, reg, a: datetime, b: datetime) -> dict:
    days = session.exec(select(AnalyticsDaily).where(AnalyticsDaily.day >= a.strftime("%Y-%m-%d"), AnalyticsDaily.day <= b.strftime("%Y-%m-%d"))).all()
    agg = Counter()
    for d in days:
        for k in ("received", "stored", "duplicates", "bots", "invalid", "internal", "engagement_updates"):
            agg[k] += getattr(d, k) or 0
    last = session.exec(select(func.max(PageView.created_at))).one()
    first_ever = session.exec(select(func.min(PageView.created_at))).one()
    legacy = sum(1 for v in views if v.event_id is None)
    from .analytics_engine import is_known_route

    # older rows weren't checked on arrival, so check them now
    unknown_routes = Counter(v.path for v in views if v.known_route is False or (v.known_route is None and not is_known_route(session, v.path)))
    long_legacy = sum(1 for s in sessions.values() if s["legacy"] and s["length_s"] > 4 * 3600)
    no_session = sum(1 for v in views if not v.session_id)
    v2 = [v for v in views if v.event_id]
    measured = sum(1 for v in v2 if v.engaged_ms is not None)
    unattributed_enq = sum(1 for e in enq if not e.session_id)
    unattributed_reg = sum(1 for r in reg if not r.session_id)
    other_hosts = {h: c for h, c in all_hosts.items() if host and h and h != host}
    dev_hosts = {h: c for h, c in all_hosts.items() if is_local_host(h)}
    unknown_channel = sum(1 for s in sessions.values() if s["channel"] == "Direct / unknown")

    def check(id_, status, title, detail, value=None):
        return {"id": id_, "status": status, "title": title, "detail": detail, "value": value}

    checks = [
        check("received", "ok" if agg["stored"] else ("warn" if a < datetime.utcnow() - timedelta(days=1) else "info"), "Events received",
              f"{agg['received']} beacons arrived; {agg['stored']} stored." if agg["received"] else "No beacons were counted in this period (counting started with this version).", agg["stored"]),
        check("last_event", "ok" if last and datetime.utcnow() - last < timedelta(hours=48) else "warn", "Last pageview received",
              f"{_to_wat(last).strftime('%d %b %Y, %H:%M')} WAT" if last else "No pageviews have ever been recorded.", None),
        check("duplicates", "ok" if not agg["received"] or agg["duplicates"] / agg["received"] < 0.05 else "warn", "Duplicate beacons ignored",
              f"{agg['duplicates']} repeated beacons were recognised and not counted twice.", agg["duplicates"]),
        check("bots", "info", "Bots filtered", f"{agg['bots']} requests from crawlers or headless browsers were not counted.", agg["bots"]),
        check("internal", "ok", "Dashboard & preview traffic excluded",
              f"{agg['internal']} dashboard beacons rejected by the server; staff browsing with a dashboard session and ?preview pages are never sent.", agg["internal"]),
        check("invalid", "ok" if not agg["invalid"] else "warn", "Malformed paths rejected", f"{agg['invalid']} beacons had an invalid page path.", agg["invalid"]),
        check("not_found", "ok" if not unknown_routes else "warn", "Visits to pages that don't exist",
              ("Most common: " + ", ".join(f"{p} ({c})" for p, c in unknown_routes.most_common(5))) if unknown_routes else "None — every recorded page exists on the site.", sum(unknown_routes.values())),
        check("engagement", "ok" if v2 and measured / len(v2) >= 0.5 else ("info" if not v2 else "warn"), "Engagement time measured",
              f"{measured} of {len(v2)} pageviews reported visible time." if v2 else "No pageviews from the current tracking version yet.", measured),
        check("legacy", "info" if legacy else "ok", "Older tracking data",
              f"{legacy} pageviews were recorded by the previous tracker (visitor counts there relied on IP addresses, which the proxy made identical for everyone; time-on-page included idle tabs). They're kept but excluded from visitor and engagement figures." if legacy else "All data in this period comes from the current tracker.", legacy),
        check("long_sessions", "warn" if long_legacy else "ok", "Unusually long sessions",
              f"{long_legacy} older sessions lasted over 4 hours (tabs left open). Sessions now end after {SESSION_TIMEOUT_MIN} minutes of inactivity." if long_legacy else f"None. Sessions end after {SESSION_TIMEOUT_MIN} minutes of inactivity.", long_legacy),
        check("session_ids", "ok" if not no_session else "warn", "Pageviews without a session", f"{no_session} pageviews couldn't be grouped into a visit.", no_session),
        check("dev_traffic", "warn" if dev_hosts and host and not is_local_host(host) else "info" if dev_hosts else "ok", "Development / other-site traffic",
              (f"Recorded from: {', '.join(f'{h} ({c})' for h, c in all_hosts.most_common(6) if h)}. " + (f"Only {host} is included in this report." if host else "All hosts are included.")) if len(all_hosts) > 1 or dev_hosts else "All pageviews came from one site.", sum(other_hosts.values())),
        check("attribution", "info", "Conversions linked to a visit",
              f"{len(enq) - unattributed_enq} of {len(enq)} enquiries and {len(reg) - unattributed_reg} of {len(reg)} registrations are linked to a session. The rest came from visitors who declined analytics, or predate session linking.", None),
        check("unknown_channel", "info", "Traffic with no referrer or campaign",
              f"{unknown_channel} of {len(sessions)} sessions ({_pct(unknown_channel, len(sessions)) or 0}%) are “Direct / unknown”.", unknown_channel),
    ]
    return {"checks": checks, "first_event": first_ever, "last_event": last}


def _insights(cur: dict, prev: dict | None, pages: list, channels: list, campaigns: list, health: dict, comparable: bool) -> list[dict]:
    out = []
    by = {c["id"]: c for c in health["checks"]}

    def add(severity, kind, title, evidence, action, tab, sample=None, metric=None):
        out.append({"severity": severity, "kind": kind, "title": title, "evidence": evidence, "action": action, "tab": tab, "sample": sample, "metric": metric})

    if cur["sessions"] == 0:
        add("info", "fact", "No visits recorded in this period",
            "No public pageviews from visitors who accepted analytics were stored.", "If the site was live, check the Data health tab: tracking may not be reaching the server.", "health")
        return out
    if cur["small_sample"]:
        add("info", "fact", f"Only {cur['sessions']} sessions in this period",
            f"Rates such as engagement ({cur['engagement_rate']}%) and conversion are based on a small number of visits.", "Treat percentages as indicative until there are at least 30 sessions; widen the date range for more data.", "overview", cur["sessions"])
    if comparable and prev and cur["sessions"] >= SMALL_SAMPLE and prev["sessions"] >= SMALL_SAMPLE:
        d = _delta(cur["sessions"], prev["sessions"])
        if d is not None and abs(d) >= 20:
            add("notice", "fact", f"Sessions {'up' if d > 0 else 'down'} {abs(d)}% on the previous period",
                f"{cur['sessions']} sessions vs {prev['sessions']} before.",
                "Check Acquisition to see which channel changed. A change after a site update doesn't by itself show the update caused it.", "acquisition", cur["sessions"], "sessions")
    if prev and comparable and prev["enquiries"] >= 3 and cur["enquiries"] == 0:
        add("warning", "possible", "No enquiries this period",
            f"There were {prev['enquiries']} in the previous period.", "Submit a test enquiry to confirm the form and email alerts still work.", "conversions")
    if not any(c["campaign"] for c in campaigns):
        add("info", "recommend", "No tagged campaigns",
            "No session arrived with utm_campaign tags, so campaign-level results aren't available.",
            "Add utm_source, utm_medium and utm_campaign to links in emails, social posts and ads (e.g. ?utm_source=linkedin&utm_medium=social&utm_campaign=wapp-forum).", "acquisition")
    nf = by.get("not_found")
    if nf and nf["value"]:
        add("notice", "fact", "Visitors reached pages that don't exist", nf["detail"],
            "Check where these links come from, fix them, or point the address to the right page.", "health", nf["value"])
    dev = by.get("dev_traffic")
    if dev and dev["status"] == "warn":
        add("warning", "possible", "Development traffic in the data", dev["detail"], "This report shows only the live site. Avoid testing on the production analytics, or keep the host filter.", "health")
    for p in pages:
        if p["entrances"] >= 20 and p["engagement_rate"] is not None and p["engagement_rate"] < 40:
            add("notice", "possible", f"Low engagement after landing on {p['path']}",
                f"{p['engagement_rate']}% of {p['entrances']} sessions that started there were engaged.",
                "Review the page's opening and calls to action; compare with how visitors arrive (Acquisition).", "content", p["entrances"], "engagement_rate")
    if cur["enquiries"] + cur["registrations"] >= 5:
        for p in pages[:5]:
            if p["pageviews"] >= 50 and p["conversions_assisted"] == 0:
                add("info", "possible", f"{p['path']} gets traffic but doesn't appear in converting visits",
                    f"{p['pageviews']} views; none of the sessions that enquired or registered included it.",
                    "Consider a clearer route from this page to Contact or the enquiry form.", "content", p["pageviews"])
    unat = cur["enquiries"] + cur["registrations"] - cur["attributed_conversions"]
    if unat > 0 and cur["enquiries"] + cur["registrations"]:
        add("info", "fact", f"{unat} conversion{'s' if unat != 1 else ''} not linked to a visit",
            "These came from visitors who declined analytics (or before session linking existed); they're counted in totals but not in channel or page reports.",
            "No action needed — this is how consent-based analytics should behave.", "conversions")
    lg = by.get("legacy")
    if lg and lg["value"]:
        add("info", "fact", "Part of this period used the previous tracker", lg["detail"], "Figures become fully comparable once the period only covers data from the new tracker.", "health", lg["value"])
    last = by.get("last_event")
    if last and last["status"] == "warn" and cur["sessions"]:
        add("warning", "possible", "Tracking may have stopped", f"Last pageview: {last['detail']}.", "Open the public site, accept analytics and check a pageview arrives in Data health.", "health")
    return out


# ── the report ───────────────────────────────────────────────────────────────
def build_report(session: Session, start: date, end: date, compare: bool = True, host: str | None = None,
                 channel: str | None = None, device: str | None = None, page: str | None = None) -> dict:
    days = (end - start).days + 1
    a, b = _bounds(start, end)
    interval = _interval(days)

    raw = session.exec(select(PageView).where(PageView.created_at >= a, PageView.created_at < b)).all()
    hosts = Counter(v.host for v in raw)
    views = [v for v in raw if _host_ok(v.host, host)]
    enq, reg, conv_by_session = _conversions(session, a, b)
    all_sessions = _sessions(views, conv_by_session)
    sessions = _filter_sessions(all_sessions, channel, device, page)
    filtered = bool(channel or device or page)
    cur = _summary(session, sessions, views, enq if not filtered else [e for e in enq if e.session_id in sessions], reg if not filtered else [r for r in reg if r.session_id in sessions], a)

    # previous period, same length, immediately before
    prev = prev_series = None
    comparable = False
    comparison_note = None
    p_start, p_end = start - timedelta(days=days), start - timedelta(days=1)
    first_ever = session.exec(select(func.min(PageView.created_at))).one()
    if compare:
        pa, pb = _bounds(p_start, p_end)
        if first_ever is None or first_ever > pa:
            comparison_note = (f"Tracking began on {_to_wat(first_ever).strftime('%d %b %Y')}, so there's no complete previous period to compare with."
                               if first_ever else "No data has been collected yet.")
        else:
            comparable = True
        pviews = [v for v in session.exec(select(PageView).where(PageView.created_at >= pa, PageView.created_at < pb)).all() if _host_ok(v.host, host)]
        penq, preg, pconv = _conversions(session, pa, pb)
        psessions = _filter_sessions(_sessions(pviews, pconv), channel, device, page)
        prev = _summary(session, psessions, pviews, penq if not filtered else [e for e in penq if e.session_id in psessions], preg if not filtered else [r for r in preg if r.session_id in psessions], pa)
        prev_series = _series(psessions, penq, preg, p_start, p_end, interval, first_ever)

    deltas = {k: (_delta(cur[k], prev[k]) if comparable and prev else None) for k in cur if isinstance(cur[k], (int, float)) and not isinstance(cur[k], bool)}

    pages = _pages(sessions)
    channels = _group(sessions, lambda s: s["channel"], "channel")
    referrers = _group(sessions, lambda s: s["referrer"], "referrer")
    campaigns = _group(sessions, lambda s: s["utm"]["campaign"], "campaign")
    for c in campaigns:
        any_s = next(s for s in sessions.values() if s["utm"]["campaign"] == c["campaign"])
        c["source"], c["medium"] = any_s["utm"]["source"], any_s["utm"]["medium"]
    paths, multi = _paths(sessions)
    health = _health(session, views, hosts, host, all_sessions, enq, reg, a, b)

    return {
        "range": {"start": start.isoformat(), "end": end.isoformat(), "days": days, "interval": interval, "timezone": TZ_LABEL},
        "comparison": {"start": p_start.isoformat(), "end": p_end.isoformat(), "available": comparable, "note": comparison_note} if compare else None,
        "filters": {"host": host, "channel": channel, "device": device, "page": page},
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "data_since": first_ever.isoformat() + "Z" if first_ever else None,
        "summary": cur,
        "previous": prev if comparable else None,
        "deltas": deltas,
        "series": _series(sessions, enq if not filtered else [e for e in enq if e.session_id in sessions], reg if not filtered else [r for r in reg if r.session_id in sessions], start, end, interval, first_ever),
        "previous_series": prev_series if comparable else None,
        "pages": pages,
        "landing_pages": sorted([p for p in pages if p["entrances"]], key=lambda r: -r["entrances"]),
        "exit_pages": sorted([p for p in pages if p["exits"]], key=lambda r: -r["exits"]),
        "paths": paths,
        "multi_page_sessions": multi,
        "channels": channels,
        "channel_rules": [{"channel": c, "rule": r} for c, r in CHANNEL_RULES],
        "referrers": referrers,
        "campaigns": campaigns,
        "conversions": {
            "by_landing": [{"path": p["path"], "sessions": p["entrances"], "conversions": p["conversions_from_landing"], "rate": _pct(p["conversions_from_landing"], p["entrances"]), "low_sample": p["low_sample"]} for p in pages if p["entrances"]],
            "by_channel": [{"channel": c["channel"], "sessions": c["sessions"], "conversions": c["conversions"], "rate": c["conversion_rate"], "low_sample": c["low_sample"]} for c in channels],
            "funnel": _funnel(session, sessions, a, b),
        },
        "tech": {
            "devices": _group(sessions, lambda s: s["tech"]["device"], "name"),
            "browsers": _group(sessions, lambda s: s["tech"]["browser"], "name"),
            "os": _group(sessions, lambda s: s["tech"]["os"], "name"),
            "viewports": _group(sessions, lambda s: {"s": "Phone (<640px)", "m": "Small tablet (640–1023px)", "l": "Laptop (1024–1439px)", "xl": "Large screen (1440px+)"}.get(s["viewport"]), "name"),
        },
        "geo": {
            "countries": _group(sessions, lambda s: s["country"], "code"),
            "coverage": _pct(sum(1 for s in sessions.values() if s["country"]), len(sessions)),
            "source": "Cloudflare's CF-IPCountry header (country only; no IP addresses are stored or looked up).",
        },
        "health": health,
        "insights": _insights(cur, prev, pages, channels, campaigns, health, comparable),
        "definitions": METRIC_DEFINITIONS,
    }


def _series(sessions: dict, enq, reg, start: date, end: date, interval: str, since: datetime | None = None) -> list[dict]:
    """Per-bucket counts. Buckets before tracking began are None (no data),
    not zero, so a chart doesn't show a false flat line."""
    keys = _buckets(start, end, interval)
    rows = {k: {"bucket": k, "pageviews": 0, "visitors": set(), "sessions": 0, "enquiries": 0, "registrations": 0} for k in keys}
    for s in sessions.values():
        k = _bucket(s["start"], interval)
        if k in rows:
            rows[k]["sessions"] += 1
        for r in s["rows"]:
            k = _bucket(r.created_at, interval)
            if k in rows:
                rows[k]["pageviews"] += 1
                if not s["visitor"].startswith("legacy-"):
                    rows[k]["visitors"].add(s["visitor"])
    for e in enq:
        k = _bucket(e.created_at, interval)
        if k in rows:
            rows[k]["enquiries"] += 1
    for r in reg:
        k = _bucket(r.created_at, interval)
        if k in rows:
            rows[k]["registrations"] += 1
    first = _bucket(since, interval) if since else None
    out = []
    for r in rows.values():
        r = {**r, "visitors": len(r["visitors"])}
        if first is None or r["bucket"] < first:
            r.update(pageviews=None, visitors=None, sessions=None, collected=False)
        else:
            r["collected"] = True
        out.append(r)
    return out


# ── CSV ──────────────────────────────────────────────────────────────────────
def export_rows(data: dict, report: str) -> list[list] | None:
    meta = [["Onction Energy analytics", report], ["Period", f"{data['range']['start']} to {data['range']['end']} ({data['range']['timezone']})"],
            ["Filters", ", ".join(f"{k}={v}" for k, v in data["filters"].items() if v) or "none"], []]
    if report == "summary":
        s = data["summary"]
        return meta + [["Metric", "Value", "Definition"]] + [[k, "" if v is None else v, data["definitions"].get(k, "")] for k, v in s.items()]
    if report == "series":
        blank = lambda v: "" if v is None else v  # noqa: E731 — no data collected yet
        return meta + [["Period", "Pageviews", "Visitors", "Sessions", "Enquiries", "Registrations"]] + [[r["bucket"], blank(r["pageviews"]), blank(r["visitors"]), blank(r["sessions"]), r["enquiries"], r["registrations"]] for r in data["series"]]
    if report == "pages":
        cols = ["path", "pageviews", "visitors", "entrances", "exits", "exit_rate", "avg_engagement_s", "engagement_rate", "bounce_rate", "conversions_assisted", "conversions_from_landing"]
        return meta + [cols] + [[r[c] if r[c] is not None else "" for c in cols] for r in data["pages"]]
    if report in ("channels", "referrers", "campaigns"):
        label = {"channels": "channel", "referrers": "referrer", "campaigns": "campaign"}[report]
        cols = [label, "sessions", "visitors", "pageviews", "engagement_rate", "conversions", "conversion_rate"] + (["source", "medium"] if report == "campaigns" else [])
        return meta + [cols] + [[r.get(c) if r.get(c) is not None else "" for c in cols] for r in data[report]]
    if report == "technology":
        rows = [["Dimension", "Value", "Sessions", "Engagement rate"]]
        for dim, key in (("Device", "devices"), ("Browser", "browsers"), ("Operating system", "os"), ("Screen size", "viewports")):
            rows += [[dim, r["name"], r["sessions"], r["engagement_rate"] or ""] for r in data["tech"][key]]
        return meta + rows
    return None
