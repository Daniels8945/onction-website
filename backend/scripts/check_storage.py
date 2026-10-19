"""End-to-end check of the configured file storage, using the app's own code.

    cd backend
    STORAGE_BACKEND=interserver INTERSERVER_PASSWORD='...' python -m scripts.check_storage

Uploads a tiny PNG, downloads it back, compares, then deletes it. Reads the
other settings from .env / environment like the app does.
"""

import asyncio
import io

from fastapi import UploadFile
from starlette.datastructures import Headers

from app import storage

PNG = b"\x89PNG\r\n\x1a\n" + b"onction-storage-check"


async def main() -> None:
    backend = storage._backend()
    print(f"Backend: {backend}")
    upload = UploadFile(io.BytesIO(PNG), filename="storage-check.png", headers=Headers({"content-type": "image/png"}))
    key, url, size = await storage.upload_to_bucket(upload)
    print(f"Uploaded  {key} ({size} bytes) -> {url}")

    if backend == "interserver":
        chunks, _length, close = await storage.open_download(key)
        data = b"".join([c async for c in chunks])
        await close()
        assert data == PNG, "Downloaded bytes don't match what was uploaded"
        print("Downloaded and verified")

    storage.delete_from_bucket(key)
    print("Deleted")
    print("OK - storage is working")


if __name__ == "__main__":
    asyncio.run(main())
