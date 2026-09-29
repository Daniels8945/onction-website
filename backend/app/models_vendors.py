from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class Vendor(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    vendor_code: str = Field(index=True, unique=True)
    company_name: str
    business_type: Optional[str] = None  # "Manufacturer" | "Distributor" | "Service Provider"
    products_services: Optional[str] = None
    website: Optional[str] = None
    street_address: Optional[str] = None
    street_address2: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = Field(default=None, index=True)
    phone: Optional[str] = None
    status: str = Field(default="Pending Review")  # Pending Review | Approved | Rejected | Inactive
    rejection_reason: Optional[str] = None
    password_hash: Optional[str] = None
    self_registered: bool = Field(default=False)
    reset_token: Optional[str] = None
    reset_expires: Optional[datetime] = None
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    status_updated_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class VendorNote(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    vendor_id: int = Field(foreign_key="vendor.id", index=True)
    note: str
    created_by: str = Field(default="Admin")
    created_at: datetime = Field(default_factory=datetime.utcnow)


# --- API payload/response shapes -------------------------------------------

class VendorCreate(SQLModel):
    company_name: str = Field(min_length=1, max_length=200)
    business_type: Optional[str] = Field(default=None, max_length=40)
    products_services: Optional[str] = Field(default=None, max_length=2000)
    website: Optional[str] = Field(default=None, max_length=300)
    street_address: Optional[str] = Field(default=None, max_length=300)
    street_address2: Optional[str] = Field(default=None, max_length=300)
    city: Optional[str] = Field(default=None, max_length=120)
    region: Optional[str] = Field(default=None, max_length=120)
    postal_code: Optional[str] = Field(default=None, max_length=40)
    country: Optional[str] = Field(default=None, max_length=120)
    first_name: Optional[str] = Field(default=None, max_length=120)
    last_name: Optional[str] = Field(default=None, max_length=120)
    email: Optional[str] = Field(default=None, max_length=200)
    phone: Optional[str] = Field(default=None, max_length=40)


class VendorUpdate(SQLModel):
    company_name: Optional[str] = None
    business_type: Optional[str] = None
    products_services: Optional[str] = None
    website: Optional[str] = None
    street_address: Optional[str] = None
    street_address2: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class VendorStatusUpdate(SQLModel):
    status: str
    rejection_reason: Optional[str] = None


class VendorRead(SQLModel):
    id: int
    vendor_code: str
    company_name: str
    business_type: Optional[str]
    products_services: Optional[str]
    website: Optional[str]
    street_address: Optional[str]
    street_address2: Optional[str]
    city: Optional[str]
    region: Optional[str]
    postal_code: Optional[str]
    country: Optional[str]
    first_name: Optional[str]
    last_name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    status: str
    rejection_reason: Optional[str]
    self_registered: bool
    submitted_at: datetime
    status_updated_at: Optional[datetime]
    updated_at: Optional[datetime]
    has_password: bool = False


class VendorLogin(SQLModel):
    vendor_code: str
    password: Optional[str] = None


class VendorSetPassword(SQLModel):
    current_password: Optional[str] = None
    new_password: str = Field(min_length=8, max_length=200)


class VendorForgotPassword(SQLModel):
    email: str


class VendorResetPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=200)


class VendorNoteCreate(SQLModel):
    note: str = Field(min_length=1, max_length=4000)


class VendorNoteRead(SQLModel):
    id: int
    note: str
    created_by: str
    created_at: datetime


class VendorTokenResponse(SQLModel):
    access_token: str
    token_type: str = "bearer"
    vendor: VendorRead
