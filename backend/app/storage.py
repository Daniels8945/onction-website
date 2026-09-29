import uuid
from functools import lru_cache

import boto3
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


@lru_cache
def get_s3_client():
    if not (settings.s3_endpoint_url and settings.s3_access_key and settings.s3_secret_key):
        return None
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url,
        region_name=settings.s3_region,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
    )


def build_public_url(key: str) -> str:
    base = settings.s3_public_base_url.rstrip("/")
    if base:
        return f"{base}/{key}"
    # Fall back to the bucket's own endpoint if no CDN/public base is set.
    endpoint = settings.s3_endpoint_url.rstrip("/")
    return f"{endpoint}/{settings.s3_bucket}/{key}"


async def upload_to_bucket(file: UploadFile) -> tuple[str, str, int]:
    """Streams an UploadFile to the configured S3-compatible bucket.

    Returns (object_key, public_url, size_bytes). Raises HTTPException on
    misconfiguration or validation failure.
    """
    client = get_s3_client()
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Object storage isn't configured yet (missing S3 env vars). "
                   "Set S3_ENDPOINT_URL, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET.",
        )
    if not settings.s3_bucket:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="S3_BUCKET is not set")

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type: {file.content_type}",
        )

    body = await file.read()
    size = len(body)
    if size > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large (max 200MB)")

    ext = ""
    if file.filename and "." in file.filename:
        ext = "." + file.filename.rsplit(".", 1)[-1].lower()
    key = f"uploads/{uuid.uuid4().hex}{ext}"

    client.put_object(
        Bucket=settings.s3_bucket,
        Key=key,
        Body=body,
        ContentType=file.content_type,
        ACL="public-read",
    )

    return key, build_public_url(key), size


def delete_from_bucket(key: str) -> None:
    client = get_s3_client()
    if client is None:
        return
    client.delete_object(Bucket=settings.s3_bucket, Key=key)
