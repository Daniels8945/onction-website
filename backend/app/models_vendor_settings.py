from typing import Optional

from sqlmodel import SQLModel, Field

SETTINGS_ROW_ID = 1  # single-row table — the vendor-platform config always lives at id=1


class VendorPlatformSettings(SQLModel, table=True):
    id: Optional[int] = Field(default=SETTINGS_ROW_ID, primary_key=True)
    company_name: str = Field(default="Onction Service Limited")
    company_email: str = Field(default="")
    company_phone: str = Field(default="")
    company_address: str = Field(default="")
    currency: str = Field(default="NGN")  # NGN | USD | GBP | EUR
    invoice_prefix: str = Field(default="INV")
    vendor_code_prefix: str = Field(default="OSL")
    support_email: str = Field(default="")
    require_document_approval: bool = Field(default=True)
    auto_approve_documents: bool = Field(default=False)
    email_notifications: bool = Field(default=True)
    max_invoice_amount: Optional[float] = None


# --- API payload/response shapes -------------------------------------------

class VendorPlatformSettingsUpdate(SQLModel):
    company_name: Optional[str] = None
    company_email: Optional[str] = None
    company_phone: Optional[str] = None
    company_address: Optional[str] = None
    currency: Optional[str] = None
    invoice_prefix: Optional[str] = None
    vendor_code_prefix: Optional[str] = None
    support_email: Optional[str] = None
    require_document_approval: Optional[bool] = None
    auto_approve_documents: Optional[bool] = None
    email_notifications: Optional[bool] = None
    max_invoice_amount: Optional[float] = None


class VendorPlatformSettingsRead(SQLModel):
    company_name: str
    company_email: str
    company_phone: str
    company_address: str
    currency: str
    invoice_prefix: str
    vendor_code_prefix: str
    support_email: str
    require_document_approval: bool
    auto_approve_documents: bool
    email_notifications: bool
    max_invoice_amount: Optional[float]
