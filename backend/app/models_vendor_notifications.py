from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class VendorNotification(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    vendor_id: Optional[int] = Field(default=None, foreign_key="vendor.id", index=True)  # None for admin-facing notifications
    is_admin: bool = Field(default=False)
    type: str = Field(default="info")
    title: str
    message: Optional[str] = None
    is_read: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class VendorNotificationRead(SQLModel):
    id: int
    vendor_id: Optional[int]
    is_admin: bool
    type: str
    title: str
    message: Optional[str]
    is_read: bool
    created_at: datetime
