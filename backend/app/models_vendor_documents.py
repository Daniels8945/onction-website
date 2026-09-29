from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class VendorDocument(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    vendor_id: int = Field(foreign_key="vendor.id", index=True)
    document_name: str
    document_type: Optional[str] = None
    expiry_date: Optional[datetime] = None
    notes: Optional[str] = None
    status: str = Field(default="Pending Review")  # Pending Review | Approved | Rejected
    rejection_reason: Optional[str] = None
    storage_key: Optional[str] = None  # S3 object key, see app/storage.py
    file_original_name: Optional[str] = None
    file_mime_type: Optional[str] = None
    file_size: Optional[int] = None
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


# --- API payload/response shapes -------------------------------------------

class VendorDocumentCreate(SQLModel):
    document_name: str = Field(min_length=1, max_length=200)
    document_type: Optional[str] = Field(default=None, max_length=120)
    expiry_date: Optional[datetime] = None
    notes: Optional[str] = Field(default=None, max_length=2000)


class VendorDocumentStatusUpdate(SQLModel):
    status: str
    rejection_reason: Optional[str] = None


class VendorDocumentRead(SQLModel):
    id: int
    vendor_id: int
    document_name: str
    document_type: Optional[str]
    expiry_date: Optional[datetime]
    notes: Optional[str]
    status: str
    rejection_reason: Optional[str]
    file_original_name: Optional[str]
    file_mime_type: Optional[str]
    file_size: Optional[int]
    file_url: Optional[str] = None
    uploaded_at: datetime
    updated_at: Optional[datetime]
