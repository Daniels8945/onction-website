from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class MediaAsset(SQLModel, table=True):
    """Metadata for a file uploaded to object storage (Contabo S3, or any
    S3-compatible bucket — see storage.py)."""

    id: Optional[int] = Field(default=None, primary_key=True)
    key: str = Field(index=True, unique=True)  # object key inside the bucket
    url: str  # public URL to serve it from
    original_filename: str
    content_type: str
    size_bytes: int
    uploaded_by_id: Optional[int] = Field(default=None, foreign_key="adminuser.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class MediaAssetRead(SQLModel):
    id: int
    key: str
    url: str
    original_filename: str
    content_type: str
    size_bytes: int
    created_at: datetime
