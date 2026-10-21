"""File storage for media uploads and vendor documents.

Two interchangeable backends, picked with the STORAGE_BACKEND env var:

* ``s3`` (default) — any S3-compatible bucket, e.g. Contabo Object Storage.
  Objects are uploaded public-read and browsers load them straight from the
  bucket (or S3_PUBLIC_BASE_URL).

* ``interserver`` — InterServer storage hosting's file API (beta). It is NOT
  real S3: it uses the FTP account's login over HTTP Basic auth, and every
  download needs that login too. So files are served to browsers through this
  backend at ``/api/files/<key>`` (see routers/files.py), which fetches them
  from InterServer with the credentials kept server-side.

Routers only use upload_to_bucket / delete_from_bucket / build_public_url, so
switching backends needs no changes anywhere else.
"""

import base64
import hashlib
import hmac
import mimetypes
import re
import time
import uuid
from functools import lru_cache
from typing import AsyncIterator, Awaitable, Callable, Optional

import httpx
from fastapi import HTTPException, UploadFile, status

from .config import get_settings

settings = get_settings()

ALLOWED_CONTENT_TYPES = {
    "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml",
    "video/mp4", "video/webm", "video/quicktime",
    # Vendor-platform document uploads (certificates, tax IDs, invoices, etc.)
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
MAX_UPLOAD_BYTES = 200 * 1024 * 1024  # 200 MB, generous enough for short video clips

UPLOAD_DIR = "uploads"
# Keys this app generates: uploads/<32 hex chars>[.ext]. Anything else is
# rejected before it reaches the storage provider (no path traversal).
KEY_PATTERN = re.compile(r"^uploads/[0-9a-f]{32}(\.[a-z0-9]{1,10})?$")


def _backend() -> str:
    return (settings.storage_backend or "s3").strip().lower()


MAX_IMAGE_BYTES = 10 * 1024 * 1024  # photos for the website; larger files are almost always uncompressed originals


def _matches_signature(content_type: str, body: bytes) -> bool:
    """The browser-supplied content type is only a claim (it comes from the
    file extension), so check the file's own leading bytes agree with it."""
    head = body[:64]
    if content_type == "image/jpeg":
        return head.startswith(b"\xff\xd8\xff")
    if content_type == "image/png":
        return head.startswith(b"\x89PNG\r\n\x1a\n")
    if content_type == "image/gif":
        return head.startswith((b"GIF87a", b"GIF89a"))
    if content_type == "image/webp":
        return head[:4] == b"RIFF" and head[8:12] == b"WEBP"
    if content_type == "image/svg+xml":
        text = body[:2048].lstrip(b"\xef\xbb\xbf").lstrip().lower()
        return text.startswith((b"<svg", b"<?xml", b"<!--", b"<!doctype svg")) and b"<svg" in body[:4096].lower()
    if content_type in ("video/mp4", "video/quicktime"):
        return head[4:8] in (b"ftyp", b"moov", b"mdat", b"wide", b"free")
    if content_type == "video/webm":
        return head.startswith(b"\x1a\x45\xdf\xa3")
    if content_type == "application/pdf":
        return head.startswith(b"%PDF-")
    if content_type == "application/msword":
        return head.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1")
    if content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return head.startswith(b"PK\x03\x04")
    return False


def _validate_upload(file: UploadFile, body: bytes) -> None:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type: {file.content_type}",
        )
    if not body:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The file is empty")
    if len(body) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large (max 200MB)")
    if file.content_type.startswith("image/") and len(body) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Image too large (max 10 MB)")
    if not _matches_signature(file.content_type, body):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="The file's contents don't match its type — it may be damaged or renamed",
        )


def _new_key(filename: Optional[str]) -> str:
    ext = ""
    if filename and "." in filename:
        candidate = filename.rsplit(".", 1)[-1].lower()
        if re.fullmatch(r"[a-z0-9]{1,10}", candidate):
            ext = "." + candidate
    return f"{UPLOAD_DIR}/{uuid.uuid4().hex}{ext}"


def guess_content_type(key: str) -> str:
    return mimetypes.guess_type(key)[0] or "application/octet-stream"


# ---------------------------------------------------------------------------
# S3 backend (Contabo or any S3-compatible bucket)
# ---------------------------------------------------------------------------

@lru_cache
def get_s3_client():
    if not (settings.s3_endpoint_url and settings.s3_access_key and settings.s3_secret_key):
        return None
    import boto3  # imported lazily so the InterServer backend doesn't need it

    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url,
        region_name=settings.s3_region,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
    )


def _s3_public_url(key: str) -> str:
    base = settings.s3_public_base_url.rstrip("/")
    if base:
        return f"{base}/{key}"
    endpoint = settings.s3_endpoint_url.rstrip("/")
    return f"{endpoint}/{settings.s3_bucket}/{key}"


def _s3_upload(key: str, body: bytes, content_type: str) -> None:
    client = get_s3_client()
    if client is None or not settings.s3_bucket:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Object storage isn't configured yet (missing S3 env vars). "
                   "Set S3_ENDPOINT_URL, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET.",
        )
    client.put_object(Bucket=settings.s3_bucket, Key=key, Body=body, ContentType=content_type, ACL="public-read")


def _s3_delete(key: str) -> None:
    client = get_s3_client()
    if client is None:
        return
    client.delete_object(Bucket=settings.s3_bucket, Key=key)


# ---------------------------------------------------------------------------
# InterServer storage hosting backend (file API, beta)
# ---------------------------------------------------------------------------

# Tests swap this for an httpx.MockTransport.
_interserver_transport: Optional[httpx.BaseTransport] = None
_interserver_async_transport: Optional[httpx.AsyncBaseTransport] = None
_upload_dir_ready = False


def _is_configured() -> bool:
    return bool(settings.interserver_url and settings.interserver_user and settings.interserver_password)


def _require_interserver() -> None:
    if not _is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="File storage isn't configured yet (missing InterServer env vars). "
                   "Set INTERSERVER_URL, INTERSERVER_USER, INTERSERVER_PASSWORD.",
        )


def _base_subpath() -> str:
    return (settings.interserver_base_subpath or ".").strip().strip("/") or "."


def _subpath_for(directory: str) -> str:
    base = _base_subpath()
    return directory if base == "." else f"{base}/{directory}"


def _split_key(key: str) -> tuple[str, str]:
    directory, name = key.rsplit("/", 1)
    return _subpath_for(directory), name


def _client_kwargs(timeout: float) -> dict:
    return {
        "base_url": settings.interserver_url.rstrip("/"),
        "auth": (settings.interserver_user, settings.interserver_password),
        "timeout": httpx.Timeout(timeout, connect=10.0),
    }


def _sync_client(timeout: float = 30.0) -> httpx.Client:
    return httpx.Client(transport=_interserver_transport, **_client_kwargs(timeout))


def _async_client(timeout: float = 30.0) -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=_interserver_async_transport, **_client_kwargs(timeout))


def _form(**fields: str) -> dict:
    """Form fields sent as multipart/form-data — the encoding the API is
    documented and tested with (curl -F), even when no file is attached."""
    return {name.replace("__", "[]"): (None, value) for name, value in fields.items()}


def _api_ok(resp: httpx.Response) -> bool:
    """The API sometimes reports failures as HTTP 200 with ok:false (or a 502
    wrapping the real status), so check both the status and the body."""
    if resp.status_code != 200:
        return False
    try:
        return bool(resp.json().get("ok"))
    except ValueError:
        return False


async def _ensure_upload_dir(client: httpx.AsyncClient) -> None:
    """Create <base>/uploads once per process. mkdir on an existing folder
    fails harmlessly, so the result is only checked via /stat afterwards."""
    global _upload_dir_ready
    if _upload_dir_ready:
        return
    parent = _base_subpath()
    stat = await client.get("/stat", params={"subpath": parent, "name": UPLOAD_DIR})
    if not _api_ok(stat):
        await client.post("/mkdir", files=_form(subpath=parent, name=UPLOAD_DIR))
        stat = await client.get("/stat", params={"subpath": parent, "name": UPLOAD_DIR})
        if not _api_ok(stat):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Couldn't create the uploads folder on file storage",
            )
    _upload_dir_ready = True


async def _interserver_upload(key: str, body: bytes, content_type: str) -> None:
    _require_interserver()
    subpath, name = _split_key(key)
    async with _async_client(timeout=600.0) as client:
        await _ensure_upload_dir(client)
        resp = await client.post(
            "/upload",
            files={**_form(subpath=subpath), "file": (name, body, content_type)},
        )
    if not _api_ok(resp):
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Upload to file storage failed")


def _interserver_delete(key: str) -> None:
    if not _is_configured():
        return
    subpath, name = _split_key(key)
    with _sync_client() as client:
        resp = client.post("/delete", files=_form(subpath=subpath, names__=name))
    # A 404 means it's already gone, which is what we wanted.
    if resp.status_code != 404 and not _api_ok(resp):
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Delete from file storage failed")


async def open_download(key: str) -> tuple[AsyncIterator[bytes], Optional[str], Callable[[], Awaitable[None]]]:
    """Starts streaming a stored file from InterServer.

    Returns (chunk_iterator, content_length, close). Raises 404 if the file
    doesn't exist. Used by routers/files.py.
    """
    _require_interserver()
    if not KEY_PATTERN.fullmatch(key):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    subpath, name = _split_key(key)
    client = _async_client(timeout=120.0)
    request = client.build_request("GET", "/download", params={"subpath": subpath, "name": name})
    try:
        resp = await client.send(request, stream=True)
    except httpx.HTTPError:
        await client.aclose()  # don't leak the connection if InterServer is unreachable
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="File storage is unreachable")
    if resp.status_code != 200 or resp.headers.get("content-type", "").startswith("application/json"):
        # Errors come back as small JSON bodies; a real file never does here.
        await resp.aclose()
        await client.aclose()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    async def close() -> None:
        await resp.aclose()
        await client.aclose()

    return resp.aiter_bytes(), resp.headers.get("content-length"), close


# ---------------------------------------------------------------------------
# Signed links for private files (vendor documents)
# ---------------------------------------------------------------------------
# A private file's URL carries an expiry and an HMAC of (key, expiry) made
# with a key derived from JWT_SECRET. Links are only handed out by endpoints
# that already checked who's asking (an admin, or the vendor who owns the
# document), so holding a valid link is the permission to view it — and it
# stops working after PRIVATE_URL_TTL.

PRIVATE_URL_TTL = 2 * 60 * 60  # seconds a signed link stays valid


def _signing_key() -> bytes:
    return hashlib.sha256(f"{settings.jwt_secret}:private-files:v1".encode()).digest()


def _signature(key: str, expires: int) -> str:
    mac = hmac.new(_signing_key(), f"{key}\n{expires}".encode(), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(mac).decode().rstrip("=")


def verify_signature(key: str, expires: Optional[int], sig: Optional[str]) -> bool:
    if not expires or not sig:
        return False
    now = int(time.time())
    if expires < now or expires > now + PRIVATE_URL_TTL + 60:  # expired, or minted with a longer lifetime than we issue
        return False
    return hmac.compare_digest(_signature(key, expires), sig)


def build_private_url(key: str, ttl: int = PRIVATE_URL_TTL) -> str:
    """URL for a file only authorised users should open.

    InterServer: a short-lived signed /api/files link. S3: the object's URL
    unchanged (objects there are public-read; switching back to Contabo keeps
    the old behaviour — use presigned URLs with private ACLs if that matters)."""
    if _backend() == "interserver":
        expires = int(time.time()) + ttl
        return f"/api/files/{key}?exp={expires}&sig={_signature(key, expires)}"
    return _s3_public_url(key)


# ---------------------------------------------------------------------------
# Public interface used by the routers
# ---------------------------------------------------------------------------

def build_public_url(key: str) -> str:
    if _backend() == "interserver":
        # Relative, so it works on both onctionenergy.com and the vendors.
        # subdomain (nginx proxies /api/ to the backend on every host).
        return f"/api/files/{key}"
    return _s3_public_url(key)


async def upload_to_bucket(file: UploadFile) -> tuple[str, str, int]:
    """Stores an UploadFile with the configured backend.

    Returns (object_key, public_url, size_bytes). Raises HTTPException on
    misconfiguration or validation failure.
    """
    if _backend() == "interserver":
        _require_interserver()
    body = await file.read()
    _validate_upload(file, body)
    key = _new_key(file.filename)

    if _backend() == "interserver":
        await _interserver_upload(key, body, file.content_type)
    else:
        _s3_upload(key, body, file.content_type)

    return key, build_public_url(key), len(body)


def delete_from_bucket(key: str) -> None:
    if _backend() == "interserver":
        _interserver_delete(key)
    else:
        _s3_delete(key)
