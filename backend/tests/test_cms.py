"""The website content workflow: drafts stay private, publishing is gated,
history allows recovery, and protected areas need a Super Admin."""
import pytest

from app.cms_schema import COLLECTIONS, validate

HERO = {"slides": [{"kicker": "", "title": "Fully charged", "body": "Body text.", "cta": {"label": "Explore", "href": "/solutions"}}]}


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def get_doc(client, token, key):
    r = client.get(f"/api/content/docs/{key}", headers=auth(token))
    assert r.status_code == 200, r.text
    return r.json()


def test_draft_is_private_until_published(client, admin_token):
    t = admin_token("Admin")
    doc = get_doc(client, t, "home.hero")
    r = client.put("/api/content/docs/home.hero/draft", json={"data": HERO, "rev": doc["rev"]}, headers=auth(t))
    assert r.status_code == 200, r.text
    assert "home.hero" not in client.get("/api/content/public").json()  # public unchanged
    assert client.get("/api/content/preview", headers=auth(t)).json()["home.hero"] == HERO  # staff preview sees it
    assert client.get("/api/content/preview").status_code == 401  # preview is never public

    rev = r.json()["rev"]
    assert client.post("/api/content/docs/home.hero/publish", json={"rev": rev}, headers=auth(t)).status_code == 400  # no confirm
    r = client.post("/api/content/docs/home.hero/publish", json={"rev": rev, "confirm": True, "note": "first"}, headers=auth(t))
    assert r.status_code == 200, r.text
    assert client.get("/api/content/public").json()["home.hero"] == HERO
    assert r.json()["draft"] is None and r.json()["version"] >= 1


def test_invalid_content_is_blocked_with_reasons(client, admin_token):
    t = admin_token("Admin")
    bad = {"slides": [{"title": "<script>x</script>", "body": "", "cta": {"label": "Go", "href": "https://evil.example.com/x"}}]}
    doc = get_doc(client, t, "home.hero")
    r = client.put("/api/content/docs/home.hero/draft", json={"data": bad, "rev": doc["rev"]}, headers=auth(t))
    assert r.status_code == 200  # drafts may be saved with problems…
    issues = r.json()["issues"]
    assert any("HTML" in i["message"] for i in issues)
    assert any(i["path"] == "slides.0.body" for i in issues)
    before = client.get("/api/content/public").json().get("home.hero")
    r = client.post("/api/content/docs/home.hero/publish", json={"rev": r.json()["rev"], "confirm": True}, headers=auth(t))
    assert r.status_code == 422  # …but never published
    assert r.json()["detail"]["issues"]
    assert client.get("/api/content/public").json().get("home.hero") == before
    # external https links are fine for links; tidy up the draft
    doc = get_doc(client, t, "home.hero")
    client.post("/api/content/docs/home.hero/discard", json={"rev": doc["rev"]}, headers=auth(t))


def test_unknown_internal_route_is_rejected():
    data = {"slides": [{"title": "T", "body": "B", "cta": {"label": "Go", "href": "/no-such-page"}}]}
    assert any("isn't a page" in i["message"] for i in validate("home.hero", data))


def test_concurrent_edits_conflict(client, admin_token):
    a, b = admin_token("Admin"), admin_token("Admin")
    rev = get_doc(client, a, "home.sdg")["rev"]
    data = {"heading": "Affordable and clean energy for all", "goals": ["One."]}
    assert client.put("/api/content/docs/home.sdg/draft", json={"data": data, "rev": rev}, headers=auth(a)).status_code == 200
    r = client.put("/api/content/docs/home.sdg/draft", json={"data": data, "rev": rev}, headers=auth(b))
    assert r.status_code == 409


def test_viewers_cannot_edit(client, admin_token):
    v = admin_token("Viewer")
    assert client.get("/api/content/docs", headers=auth(v)).status_code == 200
    r = client.put("/api/content/docs/home.sdg/draft", json={"data": {}, "rev": 0}, headers=auth(v))
    assert r.status_code == 403


def test_protected_area_needs_super_admin_and_keeps_critical_links(client, admin_token):
    admin, sup = admin_token("Admin"), admin_token("Super Admin")
    footer = {"companyLinks": [{"label": "Home", "href": "/"}], "resourceLinks": []}
    rev = get_doc(client, admin, "site.footer")["rev"]
    r = client.put("/api/content/docs/site.footer/draft", json={"data": footer, "rev": rev}, headers=auth(admin))
    assert any("/contact" in i["message"] for i in r.json()["issues"])  # can't drop Contact
    footer["companyLinks"].append({"label": "Contact", "href": "/contact"})
    r = client.put("/api/content/docs/site.footer/draft", json={"data": footer, "rev": r.json()["rev"]}, headers=auth(admin))
    assert not [i for i in r.json()["issues"] if i["level"] == "error"]
    rev = r.json()["rev"]
    assert client.post("/api/content/docs/site.footer/publish", json={"rev": rev, "confirm": True}, headers=auth(admin)).status_code == 403
    assert client.post("/api/content/docs/site.footer/publish", json={"rev": rev, "confirm": True}, headers=auth(sup)).status_code == 200


def test_history_restore_and_unpublish(client, admin_token):
    t = admin_token("Admin")
    key = "page.case-studies"
    v1 = {"hero": {"title": "Trading solutions in action", "accent": "in action"}, "next": {"title": "Partner with Onction"}}
    v2 = {"hero": {"title": "Deals that worked", "accent": "worked"}, "next": {"title": "Partner with Onction"}}
    for data in (v1, v2):
        rev = get_doc(client, t, key)["rev"]
        rev = client.put(f"/api/content/docs/{key}/draft", json={"data": data, "rev": rev}, headers=auth(t)).json()["rev"]
        assert client.post(f"/api/content/docs/{key}/publish", json={"rev": rev, "confirm": True}, headers=auth(t)).status_code == 200
    assert client.get("/api/content/public").json()[key] == v2
    hist = client.get(f"/api/content/docs/{key}/history", headers=auth(t)).json()
    first = [h for h in hist if h["action"] == "publish" and h["data"] == v1][0]
    rev = get_doc(client, t, key)["rev"]
    r = client.post(f"/api/content/docs/{key}/restore/{first['id']}", json={"rev": rev}, headers=auth(t))
    assert r.json()["draft"] == v1
    assert client.get("/api/content/public").json()[key] == v2  # restoring only fills the draft
    r = client.post(f"/api/content/docs/{key}/publish", json={"rev": r.json()["rev"], "confirm": True}, headers=auth(t))
    assert client.get("/api/content/public").json()[key] == v1
    r = client.post(f"/api/content/docs/{key}/unpublish", json={"rev": r.json()["rev"], "confirm": True}, headers=auth(t))
    assert r.status_code == 200
    assert key not in client.get("/api/content/public").json()  # back to built-in content


def test_fixed_lists_keep_their_length():
    data = {"eyebrow": "x", "heading": "Why", "items": [{"title": "a", "body": "b"}]}
    assert any("exactly 6" in i["message"] for i in validate("home.highlights", data))


def test_verified_profiles_need_name_and_portrait():
    item = {"id": "jane", "group": "board", "title": "Director", "verified": True}
    msgs = [i["message"] for i in validate("leadership.people", {"items": [item]})]
    assert any("Full name" in m for m in msgs) and any("Portrait" in m for m in msgs)
    item["verified"] = False
    assert not [i for i in validate("leadership.people", {"items": [item]}) if i["level"] == "error"]


def test_unknown_area_404(client, admin_token):
    assert client.get("/api/content/docs/nope", headers=auth(admin_token("Admin"))).status_code == 404


def test_coverage_report(client, admin_token):
    r = client.get("/api/content/coverage", headers=auth(admin_token("Viewer")))
    assert r.status_code == 200
    body = r.json()
    assert len(body["managed"]) == len(COLLECTIONS) and body["code_managed"]


def test_unverified_items_never_reach_the_public(client, admin_token):
    t = admin_token("Admin")
    people = {"items": [
        {"id": "a", "group": "board", "name": "Approved Person", "title": "Director", "portrait": "/x.jpg", "verified": True},
        {"id": "b", "group": "board", "name": "Pending Person", "title": "Director", "verified": False},
    ]}
    rev = get_doc(client, t, "leadership.people")["rev"]
    rev = client.put("/api/content/docs/leadership.people/draft", json={"data": people, "rev": rev}, headers=auth(t)).json()["rev"]
    assert client.post("/api/content/docs/leadership.people/publish", json={"rev": rev, "confirm": True}, headers=auth(t)).status_code == 200
    names = [p["name"] for p in client.get("/api/content/public").json()["leadership.people"]["items"]]
    assert names == ["Approved Person"]
    staff = [p["name"] for p in client.get("/api/content/preview", headers=auth(t)).json()["leadership.people"]["items"]]
    assert "Pending Person" in staff
