"""News, events and newsletter management: roles, validation, private
previews, stale-save protection, campaign safety and upload checks."""

import pytest
from sqlmodel import Session

from app.database import engine
from app.models_newsletter import Campaign, Subscriber
from app.routers import newsletter as newsletter_router

from test_storage_interserver import fake  # noqa: F401 — fixture

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32
JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 32


def h(token):
    return {"Authorization": f"Bearer {token}"}


def _unique(prefix):
    import os

    return f"{prefix}-{os.urandom(3).hex()}"


# --- News --------------------------------------------------------------------

def test_news_lifecycle_and_private_preview(client, admin_token):
    t = admin_token("Admin")
    slug = _unique("market-update")
    r = client.post("/api/news", headers=h(t), json={"slug": slug, "title": "Market update"})
    assert r.status_code == 201, r.text
    post = r.json()
    assert post["status"] == "draft"

    # Drafts never reach the public endpoints, but staff can preview them.
    assert client.get(f"/api/news/public/{slug}").status_code == 404
    assert slug not in [p["slug"] for p in client.get("/api/news/public").json()]
    assert client.get(f"/api/news/preview/{slug}").status_code == 401
    assert client.get(f"/api/news/preview/{slug}", headers=h(admin_token("Viewer"))).status_code == 200

    # Edit one field: the others are preserved.
    r = client.put(f"/api/news/{post['id']}", headers=h(t), json={"summary": "Short summary", "expected_updated_at": post["updated_at"]})
    assert r.status_code == 200, r.text
    edited = r.json()
    assert edited["summary"] == "Short summary" and edited["title"] == "Market update"

    # A save based on the old copy is refused rather than overwriting.
    r = client.put(f"/api/news/{post['id']}", headers=h(t), json={"title": "Stale", "expected_updated_at": post["updated_at"]})
    assert r.status_code == 409

    # Publish → public; unpublish → gone again.
    r = client.put(f"/api/news/{post['id']}", headers=h(t), json={"status": "published"})
    assert r.json()["published_at"]
    assert client.get(f"/api/news/public/{slug}").status_code == 200
    client.put(f"/api/news/{post['id']}", headers=h(t), json={"status": "draft"})
    assert client.get(f"/api/news/public/{slug}").status_code == 404

    assert client.delete(f"/api/news/{post['id']}", headers=h(t)).status_code == 204
    assert client.get(f"/api/news/{post['id']}", headers=h(t)).status_code == 404


@pytest.mark.parametrize(
    "body, message",
    [
        ({"slug": "Has Spaces", "title": "x"}, "web address"),
        ({"slug": "ok-slug-1", "title": "   "}, "Title is required"),
        ({"slug": "ok-slug-2", "title": "x", "status": "live"}, "draft or published"),
        ({"slug": "ok-slug-3", "title": "x", "cover_image_url": "javascript:alert(1)"}, "uploaded file"),
    ],
)
def test_news_validation(client, admin_token, body, message):
    r = client.post("/api/news", headers=h(admin_token("Admin")), json=body)
    assert r.status_code == 422 and message in r.text


def test_news_accepts_uploaded_and_legacy_image_addresses(client, admin_token):
    t = admin_token("Admin")
    for url in ("/api/files/uploads/" + "a" * 32 + ".jpg", "https://images.example.com/photo.jpg"):
        r = client.post("/api/news", headers=h(t), json={"slug": _unique("img"), "title": "x", "cover_image_url": url})
        assert r.status_code == 201 and r.json()["cover_image_url"] == url


def test_viewers_cannot_change_news_or_events(client, admin_token):
    v = admin_token("Viewer")
    assert client.post("/api/news", headers=h(v), json={"slug": _unique("v"), "title": "x"}).status_code == 403
    assert client.post("/api/events", headers=h(v), json={"slug": _unique("v"), "title": "x", "starts_at": "2026-11-01T09:00:00Z"}).status_code == 403
    assert client.get("/api/news", headers=h(v)).status_code == 200  # but can still read


# --- Events ------------------------------------------------------------------

def test_event_lifecycle_preview_and_dates(client, admin_token):
    t = admin_token("Super Admin")
    slug = _unique("trading-forum")
    r = client.post("/api/events", headers=h(t), json={"slug": slug, "title": "Trading forum", "starts_at": "2026-11-20T09:00:00Z"})
    assert r.status_code == 201, r.text
    ev = r.json()
    assert ev["starts_at"].startswith("2026-11-20T09:00:00")  # stored as UTC

    assert client.get(f"/api/events/public/{slug}").status_code == 404
    assert client.get(f"/api/events/preview/{slug}", headers=h(t)).json()["title"] == "Trading forum"
    # Registration is impossible while the event is a draft.
    assert client.post(f"/api/events/public/{slug}/register", json={"full_name": "A", "email": "a@example.com"}).status_code == 404

    r = client.put(f"/api/events/{ev['id']}", headers=h(t), json={"ends_at": "2026-11-20T08:00:00Z"})
    assert r.status_code == 422 and "end before it starts" in r.text

    r = client.put(
        f"/api/events/{ev['id']}",
        headers=h(t),
        json={"location": "Lagos", "cover_image_url": "/api/files/uploads/" + "b" * 32 + ".png", "status": "published", "expected_updated_at": ev["updated_at"]},
    )
    assert r.status_code == 200, r.text
    assert r.json()["title"] == "Trading forum" and r.json()["location"] == "Lagos"
    assert client.get(f"/api/events/public/{slug}").json()["cover_image_url"].endswith(".png")

    assert client.delete(f"/api/events/{ev['id']}", headers=h(t)).status_code == 204
    assert client.get(f"/api/events/preview/{slug}", headers=h(t)).status_code == 404


def test_editing_a_deleted_event_explains_what_happened(client, admin_token):
    r = client.put("/api/events/999999", headers=h(admin_token("Admin")), json={"title": "x"})
    assert r.status_code == 404 and "no longer exists" in r.text


# --- Newsletter --------------------------------------------------------------

def test_subscribe_is_case_insensitive_and_validated(client):
    email = f"{_unique('Reader')}@Example.com"
    a = client.post("/api/newsletter/subscribe", json={"email": email})
    b = client.post("/api/newsletter/subscribe", json={"email": email.upper()})
    assert a.status_code == b.status_code == 201
    assert a.json()["id"] == b.json()["id"] and a.json()["email"] == email.lower()
    assert client.post("/api/newsletter/subscribe", json={"email": "not-an-email"}).status_code == 422


def test_campaign_preview_escapes_and_sends_nothing(client, admin_token, monkeypatch):
    sent = []
    monkeypatch.setattr(newsletter_router, "try_send_email", lambda *a, **k: sent.append(a) or True)
    monkeypatch.setattr(newsletter_router, "send_email", lambda *a, **k: sent.append(a))
    t = admin_token("Admin")
    c = client.post(
        "/api/newsletter/campaigns",
        headers=h(t),
        json={"subject": "Q4 <update>", "body": "First line\n<script>x</script>", "image_url": "/api/files/uploads/" + "c" * 32 + ".jpg"},
    ).json()
    p = client.get(f"/api/newsletter/campaigns/{c['id']}/preview", headers=h(t))
    assert p.status_code == 200
    html = p.json()["html"]
    assert "Q4 &lt;update&gt;" in html and "&lt;script&gt;" in html and "<script>" not in html
    assert f"/api/files/uploads/{'c' * 32}.jpg" in html and 'src="http' in html  # absolute for email clients
    assert sent == []
    assert client.get(f"/api/newsletter/campaigns/{c['id']}", headers=h(t)).json()["status"] == "draft"


def test_campaign_edit_and_send_rules(client, admin_token, monkeypatch):
    t = admin_token("Admin")
    c = client.post("/api/newsletter/campaigns", headers=h(t), json={"subject": "Hello", "body": "Hi"}).json()
    r = client.put(f"/api/newsletter/campaigns/{c['id']}", headers=h(t), json={"subject": "Hello again", "body": "Hi there"})
    assert r.status_code == 200 and r.json()["subject"] == "Hello again"
    assert client.put(f"/api/newsletter/campaigns/{c['id']}", headers=h(t), json={"subject": "  ", "body": ""}).status_code == 422

    # No SMTP configured: neither a test nor a real send pretends to work.
    monkeypatch.setattr(newsletter_router.settings, "smtp_host", "")
    assert client.post(f"/api/newsletter/campaigns/{c['id']}/test", headers=h(t)).status_code == 503
    assert client.post(f"/api/newsletter/campaigns/{c['id']}/send", headers=h(t)).status_code == 503
    assert client.get(f"/api/newsletter/campaigns/{c['id']}", headers=h(t)).json()["status"] == "draft"

    # With SMTP, a send claims the campaign once and records real results.
    monkeypatch.setattr(newsletter_router.settings, "smtp_host", "smtp.example.com")
    client.post("/api/newsletter/subscribe", json={"email": f"{_unique('r')}@example.com"})
    delivered = []
    monkeypatch.setattr(newsletter_router, "try_send_email", lambda to, *a, **k: delivered.append(to) or True)
    monkeypatch.setattr(newsletter_router, "_send_welcome", lambda *a, **k: None)
    r = client.post(f"/api/newsletter/campaigns/{c['id']}/send", headers=h(t))
    assert r.status_code == 200
    done = client.get(f"/api/newsletter/campaigns/{c['id']}", headers=h(t)).json()
    assert done["status"] == "sent" and done["sent_count"] == len(delivered) > 0
    assert client.post(f"/api/newsletter/campaigns/{c['id']}/send", headers=h(t)).status_code == 400
    assert client.put(f"/api/newsletter/campaigns/{c['id']}", headers=h(t), json={"subject": "x", "body": ""}).status_code == 400


def test_campaign_that_reaches_nobody_is_marked_failed(client, admin_token, monkeypatch):
    t = admin_token("Admin")
    monkeypatch.setattr(newsletter_router.settings, "smtp_host", "smtp.example.com")
    client.post("/api/newsletter/subscribe", json={"email": f"{_unique('r')}@example.com"})
    monkeypatch.setattr(newsletter_router, "try_send_email", lambda *a, **k: False)
    c = client.post("/api/newsletter/campaigns", headers=h(t), json={"subject": "Bounces", "body": "x"}).json()
    client.post(f"/api/newsletter/campaigns/{c['id']}/send", headers=h(t))
    done = client.get(f"/api/newsletter/campaigns/{c['id']}", headers=h(t)).json()
    assert done["status"] == "failed" and done["sent_count"] == 0 and done["failed_count"] > 0


def test_subscriber_management_permissions(client, admin_token):
    email = f"{_unique('sub')}@example.com"
    sub = client.post("/api/newsletter/subscribe", json={"email": email}).json()
    viewer, editor = admin_token("Viewer"), admin_token("Admin")

    assert client.get("/api/newsletter/subscribers/export", headers=h(viewer)).status_code == 403
    assert client.post(f"/api/newsletter/subscribers/{sub['id']}/unsubscribe", headers=h(viewer)).status_code == 403
    assert client.get("/api/newsletter/subscribers/export").status_code == 401

    csv = client.get("/api/newsletter/subscribers/export", headers=h(editor))
    assert csv.status_code == 200 and email in csv.text and csv.headers["content-type"].startswith("text/csv")

    r = client.post(f"/api/newsletter/subscribers/{sub['id']}/unsubscribe", headers=h(editor))
    assert r.json()["status"] == "unsubscribed"
    assert client.delete(f"/api/newsletter/subscribers/{sub['id']}", headers=h(editor)).status_code == 204
    with Session(engine) as s:
        assert s.get(Subscriber, sub["id"]) is None


def test_viewer_cannot_send_or_edit_campaigns(client, admin_token):
    with Session(engine) as s:
        c = Campaign(subject="Locked", body="")
        s.add(c)
        s.commit()
        s.refresh(c)
    v = admin_token("Viewer")
    assert client.post(f"/api/newsletter/campaigns/{c.id}/send", headers=h(v)).status_code == 403
    assert client.put(f"/api/newsletter/campaigns/{c.id}", headers=h(v), json={"subject": "x", "body": ""}).status_code == 403
    assert client.get(f"/api/newsletter/campaigns/{c.id}/preview", headers=h(v)).status_code == 200


# --- Uploads -----------------------------------------------------------------

def _upload(client, token, name, content, ctype):
    return client.post("/api/media", headers=h(token), files={"file": (name, content, ctype)})


def test_valid_images_upload_and_render(client, admin_token, fake):  # noqa: F811
    t = admin_token("Admin")
    for name, body, ctype in (("a.png", PNG, "image/png"), ("b.jpg", JPEG, "image/jpeg")):
        r = _upload(client, t, name, body, ctype)
        assert r.status_code == 201, r.text
        assert client.get(r.json()["url"]).content == body


@pytest.mark.parametrize(
    "name, body, ctype, code",
    [
        ("renamed.jpg", b"MZ\x90\x00 not really a jpeg", "image/jpeg", 415),  # contents don't match the type
        ("page.png", b"<html><script>", "image/png", 415),
        ("empty.png", b"", "image/png", 400),
        ("tool.exe", b"MZ", "application/x-msdownload", 415),
    ],
)
def test_bad_uploads_rejected(client, admin_token, fake, name, body, ctype, code):  # noqa: F811
    assert _upload(client, admin_token("Admin"), name, body, ctype).status_code == code
    assert fake.files == {}


def test_oversized_image_rejected(client, admin_token, fake, monkeypatch):  # noqa: F811
    from app import storage

    monkeypatch.setattr(storage, "MAX_IMAGE_BYTES", 100)
    r = _upload(client, admin_token("Admin"), "big.png", PNG + b"\x00" * 200, "image/png")
    assert r.status_code == 413 and "10 MB" in r.text


def test_viewer_cannot_upload(client, admin_token, fake):  # noqa: F811
    assert _upload(client, admin_token("Viewer"), "a.png", PNG, "image/png").status_code == 403


def test_newsletter_overview_reports_email_setup(client, admin_token, monkeypatch):
    monkeypatch.setattr(newsletter_router.settings, "smtp_host", "")
    r = client.get("/api/newsletter/overview", headers=h(admin_token("Viewer")))
    assert r.status_code == 200 and r.json()["email_configured"] is False
    assert isinstance(r.json()["active_subscribers"], int)
