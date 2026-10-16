"""Analytics v2: ingestion rules, privacy, de-duplication and metric definitions.
Synthetic data in the throwaway test database only."""
import csv
import io
import uuid
from datetime import date, datetime, timedelta

import pytest
from sqlmodel import Session, delete, select

from app.analytics_engine import classify_channel, normalize_path, referrer_domain
from app.database import engine
from app.models import Enquiry
from app.models_analytics import AnalyticsDaily, AnalyticsEvent, PageView

SAFARI = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"}
IPHONE = {"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"}
BOT = {"User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"}


@pytest.fixture(autouse=True)
def clean():
    with Session(engine) as s:
        for m in (PageView, AnalyticsEvent, AnalyticsDaily, Enquiry):
            s.exec(delete(m))
        s.commit()
    yield


def uid():
    return str(uuid.uuid4())


def beacon(client, path="/", headers=SAFARI, **kw):
    body = {"path": path, "event_id": kw.pop("event_id", uid()), "session_id": kw.pop("session_id", "sess-aaaaaaaa"),
            "visitor_id": kw.pop("visitor_id", "visitor-aaaaaaaa"), "host": kw.pop("host", "onctionenergy.com"), **kw}
    return client.post("/api/analytics/track", json=body, headers=headers)


def stored():
    with Session(engine) as s:
        return s.exec(select(PageView)).all()


# ── ingestion ────────────────────────────────────────────────────────────────
def test_normalisation_rules():
    assert normalize_path("/About/?utm_source=x#team") == "/about"
    assert normalize_path("//solutions//") == "/solutions"
    assert normalize_path("/") == "/"
    assert normalize_path("https://evil.example/x") is None
    assert normalize_path("about") is None
    assert normalize_path("/news/wapp-update-2026") == "/news/wapp-update-2026"


def test_referrer_keeps_external_domain_only():
    assert referrer_domain("https://www.google.com/search?q=onction&token=abc", "onctionenergy.com") == "google.com"
    assert referrer_domain("https://onctionenergy.com/about", "onctionenergy.com") is None  # self
    assert referrer_domain("https://vendors.onctionenergy.com/x", "www.onctionenergy.com") is None  # own subdomain
    assert referrer_domain("http://localhost:8080/admin/content/home.hero", "localhost") is None


@pytest.mark.parametrize("ref,src,med,expected", [
    (None, None, None, "Direct / unknown"), ("google.com", None, None, "Organic search"), ("linkedin.com", None, None, "Organic social"),
    ("example.org", None, None, "Referral"), (None, "linkedin", "paid-social", "Paid social"), (None, "google", "cpc", "Paid search"),
    (None, "news", "email", "Email"), (None, "partner", "banner", "Other campaign"),
])
def test_channel_rules(ref, src, med, expected):
    assert classify_channel(ref, src, med) == expected


def test_pageview_is_stored_privately_and_parsed(client):
    assert beacon(client, "/About/", referrer="https://www.google.com/search?q=x&sid=secret", headers=IPHONE).status_code == 204
    [v] = stored()
    assert v.path == "/about" and v.known_route is True
    assert v.referrer == "google.com" and "secret" not in (v.referrer or "")
    assert v.referrer_category == "Organic search"
    assert v.device == "mobile" and v.browser.startswith("Mobile Safari")
    assert v.visitor_id and v.visitor_id != "visitor-aaaaaaaa"  # only a salted hash is stored


def test_bots_admin_and_bad_paths_are_dropped_and_counted(client):
    beacon(client, "/", headers=BOT)
    beacon(client, "/admin/content")
    beacon(client, "javascript:alert(1)")
    assert stored() == []
    with Session(engine) as s:
        d = s.exec(select(AnalyticsDaily)).one()
    assert (d.bots, d.internal, d.invalid, d.stored) == (1, 1, 1, 0)


def test_retries_are_not_double_counted(client):
    eid = uid()
    beacon(client, "/", event_id=eid)
    beacon(client, "/", event_id=eid)
    assert len(stored()) == 1


def test_unknown_routes_are_flagged(client):
    beacon(client, "/dmin")
    assert stored()[0].known_route is False


def test_engagement_only_rises_and_is_capped(client):
    eid = uid()
    beacon(client, "/", event_id=eid)
    for ms in (5000, 3000, 10 ** 8 // 2):
        client.post("/api/analytics/engage", json={"event_id": eid, "engaged_ms": min(ms, 86_400_000)})
    assert stored()[0].engaged_ms == 30 * 60 * 1000


def test_events_keep_only_whitelisted_props(client):
    r = client.post("/api/analytics/event", json={"event_id": uid(), "type": "form_start", "path": "/contact", "session_id": "sess-aaaaaaaa",
                                                  "props": {"form": "enquiry", "email": "someone@example.com", "message": "hi"}}, headers=SAFARI)
    assert r.status_code == 204
    with Session(engine) as s:
        e = s.exec(select(AnalyticsEvent)).one()
    assert e.props == {"form": "enquiry"}
    client.post("/api/analytics/event", json={"event_id": uid(), "type": "made_up", "path": "/"}, headers=SAFARI)
    with Session(engine) as s:
        assert len(s.exec(select(AnalyticsEvent)).all()) == 1


ENQ = {"full_name": "Test Person", "email": "test@example.com", "phone": "+2348000000000", "message": "Hello"}


def test_enquiry_links_to_visit_and_ignores_resubmission(client):
    beacon(client, "/solutions", session_id="sess-conv0001")
    ref = uid()
    for _ in range(2):
        assert client.post("/api/enquiries", json={**ENQ, "session_id": "sess-conv0001", "client_ref": ref}).status_code == 201
    with Session(engine) as s:
        rows = s.exec(select(Enquiry)).all()
        assert len(rows) == 1 and rows[0].landing_path == "/solutions" and rows[0].session_id == "sess-conv0001"
        # nothing personal is copied into analytics
        for v in s.exec(select(PageView)).all():
            assert "test@example.com" not in str(v.model_dump())


# ── reports ──────────────────────────────────────────────────────────────────
def add_view(s, when, path="/", session_id="s-1-aaaaaa", visitor="v1", engaged=None, host="onctionenergy.com", **kw):
    s.add(PageView(path=path, visitor_hash="x", visitor_id=visitor, session_id=session_id, event_id=uid(), host=host, created_at=when,
                   engaged_ms=engaged, known_route=True, referrer_category=kw.pop("channel", "Direct / unknown"), device="desktop", browser="Safari", os="Mac OS X", **kw))


def report(client, token, start, end, **params):
    q = "&".join([f"start={start}", f"end={end}"] + [f"{k}={v}" for k, v in params.items()])
    r = client.get(f"/api/analytics/report?{q}", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200, r.text
    return r.json()


def test_definitions_and_counts(client, admin_token):
    t = admin_token("Viewer")
    base = datetime(2026, 3, 10, 9, 0)  # UTC
    with Session(engine) as s:
        add_view(s, base - timedelta(days=30), visitor="v-old", session_id="s-before0")  # v-old first seen before the period
        # session A: 2 pages (engaged), visitor v-old (returning)
        add_view(s, base, "/", "s-a-aaaaaa", "v-old", engaged=4000)
        add_view(s, base + timedelta(minutes=2), "/solutions", "s-a-aaaaaa", "v-old", engaged=20000)
        # session B: 1 page, 3s (bounce), new visitor
        add_view(s, base + timedelta(hours=1), "/", "s-b-bbbbbb", "v-new", engaged=3000)
        # session C: 1 page, 15s visible (engaged), same new visitor
        add_view(s, base + timedelta(hours=2), "/contact", "s-c-cccccc", "v-new", engaged=15000)
        s.add(Enquiry(**ENQ, session_id="s-c-cccccc", created_at=base + timedelta(hours=2, minutes=1)))
        s.add(Enquiry(**ENQ, created_at=base + timedelta(hours=3)))  # declined analytics: unattributed
        s.commit()
    d = report(client, t, "2026-03-10", "2026-03-10", compare="false")
    sm = d["summary"]
    assert (sm["pageviews"], sm["sessions"], sm["visitors"]) == (4, 3, 2)
    assert (sm["new_visitors"], sm["returning_visitors"]) == (1, 1)
    assert sm["engaged_sessions"] == 2 and sm["engagement_rate"] == 66.7 and sm["bounce_rate"] == 33.3
    assert sm["enquiries"] == 2 and sm["attributed_conversions"] == 1
    assert sm["conversion_rate"] == 33.3  # converting sessions ÷ sessions, not ÷ visitors
    assert sm["avg_engagement_s"] == round((24000 + 3000 + 15000) / 3 / 1000, 1)
    assert sm["small_sample"] is True
    contact = next(p for p in d["pages"] if p["path"] == "/contact")
    assert contact["conversions_from_landing"] == 1 and contact["entrances"] == 1


def test_wat_day_boundary(client, admin_token):
    t = admin_token("Viewer")
    with Session(engine) as s:
        add_view(s, datetime(2026, 4, 1, 23, 30), session_id="s-late-aaaa")  # 00:30 on 2 April in Lagos
        s.commit()
    assert report(client, t, "2026-04-01", "2026-04-01", compare="false")["summary"]["pageviews"] == 0
    assert report(client, t, "2026-04-02", "2026-04-02", compare="false")["summary"]["pageviews"] == 1


def test_comparison_needs_a_full_previous_period(client, admin_token):
    t = admin_token("Viewer")
    with Session(engine) as s:
        add_view(s, datetime(2026, 5, 20, 10), session_id="s-only-aaaa")
        s.commit()
    d = report(client, t, "2026-05-15", "2026-05-21")
    assert d["comparison"]["available"] is False and "Tracking began" in d["comparison"]["note"]
    assert all(v is None for v in d["deltas"].values())


def test_empty_period_is_zero_not_error(client, admin_token):
    d = report(client, admin_token("Viewer"), "2020-01-01", "2020-01-07")
    assert d["summary"]["sessions"] == 0 and d["summary"]["engagement_rate"] is None
    # before any tracking existed, days are "no data", not zero
    assert len(d["series"]) == 7 and all(r["pageviews"] is None and r["collected"] is False for r in d["series"])


def test_host_filter_excludes_development_traffic(client, admin_token):
    t = admin_token("Viewer")
    with Session(engine) as s:
        add_view(s, datetime(2026, 6, 1, 10), session_id="s-prod-aaaa", host="onctionenergy.com")
        add_view(s, datetime(2026, 6, 1, 11), session_id="s-dev-aaaaa", host="localhost")
        s.commit()
    d = report(client, t, "2026-06-01", "2026-06-01", compare="false", host="onctionenergy.com")
    assert d["summary"]["sessions"] == 1
    assert next(c for c in d["health"]["checks"] if c["id"] == "dev_traffic")["status"] == "warn"


def test_reports_need_a_login_and_csv_has_no_identifiers(client, admin_token):
    assert client.get("/api/analytics/report?start=2026-01-01&end=2026-01-02").status_code == 401
    with Session(engine) as s:
        add_view(s, datetime(2026, 7, 1, 10), session_id="s-csv-aaaaa", visitor="secret-visitor-id")
        s.commit()
    r = client.get("/api/analytics/export?report=pages&start=2026-07-01&end=2026-07-01", headers={"Authorization": f"Bearer {admin_token('Viewer')}"})
    assert r.status_code == 200 and r.headers["content-type"].startswith("text/csv")
    body = r.text
    assert "secret-visitor-id" not in body and "s-csv-aaaaa" not in body
    rows = list(csv.reader(io.StringIO(body)))
    assert ["path", "pageviews"] == rows[4][:2] and rows[5][0] == "/"


def test_legacy_rows_are_not_counted_as_visitors(client, admin_token):
    with Session(engine) as s:
        # previous tracker: no event_id / visitor_id, IP-based hash only
        s.add(PageView(path="/dmin", visitor_hash="iphash-1", session_id="old-sess-01", created_at=datetime(2026, 8, 1, 10)))
        s.add(PageView(path="/", visitor_hash="iphash-2", session_id="old-sess-01", created_at=datetime(2026, 8, 1, 10, 5)))
        s.commit()
    d = report(client, admin_token("Viewer"), "2026-08-01", "2026-08-01", compare="false")
    assert d["summary"]["pageviews"] == 2 and d["summary"]["sessions"] == 1
    assert d["summary"]["visitors"] is None and d["summary"]["legacy_sessions"] == 1
    nf = next(c for c in d["health"]["checks"] if c["id"] == "not_found")
    assert nf["value"] == 1 and "/dmin" in nf["detail"]
