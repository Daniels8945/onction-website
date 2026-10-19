"""STORAGE_BACKEND=interserver, against a fake InterServer file API that
behaves like the real one (sandboxed paths, 404 JSON for missing files,
ALREADY_EXISTS wrapped in a 502)."""

import httpx
import pytest

from app import storage


class FakeInterServer:
    def __init__(self):
        self.dirs = {"onction-documents"}
        self.files: dict[str, bytes] = {}
        self.auth_ok = True

    def _json(self, code, body):
        return httpx.Response(code, json=body)

    def handle(self, request: httpx.Request) -> httpx.Response:
        if not request.headers.get("authorization", "").startswith("Basic "):
            return self._json(401, {"ok": False})
        path = request.url.path
        q = request.url.params
        if path == "/stat":
            full = f"{q['subpath']}/{q['name']}"
            if full in self.dirs or full in self.files:
                return self._json(200, {"ok": True, "meta": {}})
            return self._json(404, {"ok": False, "err": "not found"})
        if path == "/download":
            full = f"{q['subpath']}/{q['name']}"
            if full in self.files:
                return httpx.Response(200, content=self.files[full], headers={"content-type": "application/octet-stream"})
            return self._json(404, {"error": "files not found"})

        # Multipart POSTs: parse just enough to get fields and the file.
        body = request.read()
        ctype = request.headers["content-type"]
        boundary = ctype.split("boundary=")[1].encode()
        fields, file_name, file_body = {}, None, None
        for part in body.split(b"--" + boundary):
            if b"\r\n\r\n" not in part:
                continue
            head, content = part.split(b"\r\n\r\n", 1)
            content = content.rstrip(b"\r\n")
            name = head.split(b'name="')[1].split(b'"')[0].decode()
            if b"filename=" in head:
                file_name = head.split(b'filename="')[1].split(b'"')[0].decode()
                file_body = content
            else:
                fields[name] = content.decode()

        if path == "/mkdir":
            self.dirs.add(f"{fields['subpath']}/{fields['name']}")
            return self._json(200, {"ok": True})
        if path == "/upload":
            if fields["subpath"] not in self.dirs:
                return self._json(502, {"ok": False, "status": 404})
            full = f"{fields['subpath']}/{file_name}"
            if full in self.files:
                return self._json(502, {"ok": False, "status": 409, "body": "ALREADY_EXISTS"})
            self.files[full] = file_body
            return self._json(200, {"ok": True, "status": 200})
        if path == "/delete":
            full = f"{fields['subpath']}/{fields['names[]']}"
            if full not in self.files:
                return self._json(404, {"error": "files not found"})
            del self.files[full]
            return self._json(200, {"ok": True, "status": 204, "body": ""})
        return self._json(404, {"ok": False})


@pytest.fixture
def fake(monkeypatch):
    server = FakeInterServer()
    monkeypatch.setattr(storage.settings, "storage_backend", "interserver")
    monkeypatch.setattr(storage.settings, "interserver_url", "https://storage.test:8080")
    monkeypatch.setattr(storage.settings, "interserver_user", "api@example.test")
    monkeypatch.setattr(storage.settings, "interserver_password", "secret")
    monkeypatch.setattr(storage.settings, "interserver_base_subpath", "onction-documents")
    monkeypatch.setattr(storage, "_interserver_transport", httpx.MockTransport(server.handle))
    monkeypatch.setattr(storage, "_interserver_async_transport", httpx.MockTransport(server.handle))
    monkeypatch.setattr(storage, "_upload_dir_ready", False)
    return server


def _upload(client, token, name="logo.png", content=b"\x89PNG fake", ctype="image/png"):
    return client.post(
        "/api/media",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": (name, content, ctype)},
    )


def test_upload_serve_and_delete_roundtrip(client, admin_token, fake):
    token = admin_token("Super Admin")
    r = _upload(client, token)
    assert r.status_code == 201, r.text
    asset = r.json()
    assert asset["url"].startswith("/api/files/uploads/") and asset["url"].endswith(".png")

    # Stored under the base folder, in an uploads/ folder created on demand.
    assert "onction-documents/uploads" in fake.dirs
    stored = asset["key"].split("/", 1)[1]
    assert fake.files[f"onction-documents/uploads/{stored}"] == b"\x89PNG fake"

    # Served through the backend with the right type and caching.
    f = client.get(asset["url"])
    assert f.status_code == 200
    assert f.content == b"\x89PNG fake"
    assert f.headers["content-type"] == "image/png"
    assert "immutable" in f.headers["cache-control"]

    d = client.delete(f"/api/media/{asset['id']}", headers={"Authorization": f"Bearer {token}"})
    assert d.status_code == 204
    assert fake.files == {}
    assert client.get(asset["url"]).status_code == 404


def test_svg_is_sandboxed(client, admin_token, fake):
    token = admin_token("Super Admin")
    r = _upload(client, token, "icon.svg", b"<svg><script>alert(1)</script></svg>", "image/svg+xml")
    assert r.status_code == 201, r.text
    f = client.get(r.json()["url"])
    assert "sandbox" in f.headers["content-security-policy"]


def test_rejects_bad_keys(client, fake):
    for key in ["../etc/passwd", "uploads/../../secret", "uploads/notahexkey.png", "other/abc"]:
        assert client.get(f"/api/files/{key}").status_code == 404


def test_missing_config_is_503(client, admin_token, fake, monkeypatch):
    monkeypatch.setattr(storage.settings, "interserver_password", "")
    r = _upload(client, admin_token("Super Admin"))
    assert r.status_code == 503


def test_unsupported_type_rejected(client, admin_token, fake):
    r = _upload(client, admin_token("Super Admin"), "run.exe", b"MZ", "application/x-msdownload")
    assert r.status_code == 415
    assert fake.files == {}


def test_files_route_off_for_s3_backend(client, monkeypatch):
    monkeypatch.setattr(storage.settings, "storage_backend", "s3")
    assert client.get("/api/files/uploads/" + "a" * 32 + ".png").status_code == 404


# ── Private vendor documents: signed, expiring links ─────────────────────────
from sqlmodel import Session  # noqa: E402

from app.database import engine  # noqa: E402
from app.models_vendor_documents import VendorDocument  # noqa: E402


def _private_doc(fake, name="tax-id.pdf"):
    """A vendor document stored on the fake server, as the documents API would."""
    key = f"uploads/{'a' * 31}{len(fake.files)}.pdf"
    fake.dirs.add("onction-documents/uploads")
    fake.files[f"onction-documents/{key}"] = b"%PDF-1.4 vendor tax certificate"
    with Session(engine) as s:
        s.add(VendorDocument(vendor_id=1, document_name="Tax ID", storage_key=key, file_original_name=name, file_mime_type="application/pdf"))
        s.commit()
    return key


def test_private_document_needs_a_valid_signature(client, fake):
    key = _private_doc(fake)
    assert client.get(f"/api/files/{key}").status_code == 403  # the bare link is not enough
    url = storage.build_private_url(key)
    assert "exp=" in url and "sig=" in url
    r = client.get(url)
    assert r.status_code == 200 and r.content.startswith(b"%PDF")
    assert r.headers["cache-control"] == "private, no-store"
    assert "tax-id.pdf" in r.headers["content-disposition"]
    assert r.headers["referrer-policy"] == "no-referrer"


def test_tampered_or_reused_signatures_are_refused(client, fake):
    key, other = _private_doc(fake), _private_doc(fake, "other.pdf")
    url = storage.build_private_url(key)
    assert client.get(url.replace("sig=", "sig=x")).status_code == 403
    exp = url.split("exp=")[1].split("&")[0]
    assert client.get(url.replace(f"exp={exp}", f"exp={int(exp) + 1}")).status_code == 403  # can't extend it
    # a signature for one document doesn't open another
    assert client.get(url.replace(key, other)).status_code == 403


def test_signed_links_expire(client, fake, monkeypatch):
    key = _private_doc(fake)
    url = storage.build_private_url(key)
    real = storage.time.time
    monkeypatch.setattr(storage.time, "time", lambda: real() + storage.PRIVATE_URL_TTL + 5)
    assert client.get(url).status_code == 403


def test_media_library_files_stay_public(client, fake, admin_token):
    r = _upload(client, admin_token("Admin"))
    url = r.json()["url"]
    assert "sig=" not in url
    got = client.get(url)
    assert got.status_code == 200 and "public" in got.headers["cache-control"]


def test_documents_api_hands_out_signed_links(client, fake, admin_token):
    key = _private_doc(fake)
    docs = client.get("/api/vendor-platform/documents", headers={"Authorization": f"Bearer {admin_token('Admin')}"}).json()
    doc = next(d for d in docs if d["file_url"] and key in d["file_url"])
    assert "sig=" in doc["file_url"] and client.get(doc["file_url"]).status_code == 200


def test_s3_backend_keeps_plain_urls(monkeypatch):
    monkeypatch.setattr(storage.settings, "storage_backend", "s3")
    monkeypatch.setattr(storage.settings, "s3_endpoint_url", "https://usc1.contabostorage.com")
    monkeypatch.setattr(storage.settings, "s3_bucket", "onction-media")
    monkeypatch.setattr(storage.settings, "s3_public_base_url", "")
    assert storage.build_private_url("uploads/" + "b" * 32 + ".pdf") == "https://usc1.contabostorage.com/onction-media/uploads/" + "b" * 32 + ".pdf"
