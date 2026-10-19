"""Serves stored files to browsers when STORAGE_BACKEND=interserver.

InterServer's file API needs the FTP login for every download, so browsers
can't load files from it directly. This route fetches the file with the
credentials kept server-side and streams it back.

Media-library files are public: keys are random UUIDs (uploads/<32 hex>.<ext>),
the same "unguessable link" model the public-read S3 bucket used. Vendor
documents (tax IDs, certificates, invoices) are private: they're only served
with a valid, unexpired signature (storage.build_private_url), which the
documents API issues only to an admin or the owning vendor. With the S3
backend this route is unused.
"""

from typing import Optional
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select
from starlette.background import BackgroundTask

from .. import storage
from ..database import get_session
from ..models_vendor_documents import VendorDocument

router = APIRouter(prefix="/api/files", tags=["files"])


@router.get("/{key:path}")
async def get_file(key: str, exp: Optional[int] = None, sig: Optional[str] = None, session: Session = Depends(get_session)):
    if storage._backend() != "interserver":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if not storage.KEY_PATTERN.fullmatch(key):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    document = session.exec(select(VendorDocument).where(VendorDocument.storage_key == key)).first()
    private = document is not None
    if private and not storage.verify_signature(key, exp, sig):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This document link has expired or isn't valid. Open the document again from the dashboard or vendor portal.",
        )

    chunks, length, close = await storage.open_download(key)
    content_type = storage.guess_content_type(key)

    headers = {
        # Public media: keys never change content (a new upload gets a new UUID).
        # Private documents: never kept in shared caches or the browser cache.
        "Cache-Control": "private, no-store" if private else "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
    }
    if private:
        headers["X-Robots-Tag"] = "noindex, nofollow"
        headers["Referrer-Policy"] = "no-referrer"  # don't leak the signed link to sites the document links to
        if document.file_original_name:
            headers["Content-Disposition"] = f"inline; filename*=UTF-8''{quote(document.file_original_name)}"
    if length:
        headers["Content-Length"] = length
    if content_type == "image/svg+xml":
        # Files are now served from the site's own origin, so stop any script
        # inside an uploaded SVG from running against the site.
        headers["Content-Security-Policy"] = "default-src 'none'; style-src 'unsafe-inline'; sandbox"

    return StreamingResponse(chunks, media_type=content_type, headers=headers, background=BackgroundTask(close))
