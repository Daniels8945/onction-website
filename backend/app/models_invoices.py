from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class Invoice(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    vendor_id: int = Field(foreign_key="vendor.id", index=True)
    invoice_number: str = Field(index=True, unique=True)
    description: Optional[str] = None
    amount: float = Field(default=0)
    status: str = Field(default="Submitted")  # Submitted | Under Review | Approved | Paid | Rejected
    service_id: Optional[int] = Field(default=None, foreign_key="service.id")
    service_name: Optional[str] = None  # snapshot of the service name at submission time
    due_date: Optional[datetime] = None
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    payment_date: Optional[datetime] = None
    payment_method: Optional[str] = None
    payment_reference: Optional[str] = None
    payment_notes: Optional[str] = None
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


class InvoiceLineItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    invoice_id: int = Field(foreign_key="invoice.id", index=True)
    description: Optional[str] = None
    quantity: float = Field(default=1)
    unit_price: float = Field(default=0)
    amount: float = Field(default=0)


class InvoiceStatusHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    invoice_id: int = Field(foreign_key="invoice.id", index=True)
    status: str
    reason: Optional[str] = None
    changed_by: Optional[str] = None
    changed_at: datetime = Field(default_factory=datetime.utcnow)


# --- API payload/response shapes -------------------------------------------

class InvoiceLineItemCreate(SQLModel):
    description: Optional[str] = Field(default=None, max_length=500)
    quantity: float = Field(default=1, gt=0)
    unit_price: float = Field(default=0, ge=0)


class InvoiceLineItemRead(SQLModel):
    id: int
    description: Optional[str]
    quantity: float
    unit_price: float
    amount: float


class InvoiceCreate(SQLModel):
    vendor_id: Optional[int] = None  # set by the router when an admin creates on a vendor's behalf
    invoice_number: Optional[str] = Field(default=None, max_length=60)
    service_id: Optional[int] = None
    description: Optional[str] = Field(default=None, max_length=2000)
    amount: float = Field(default=0, ge=0)
    due_date: Optional[datetime] = None
    notes: Optional[str] = Field(default=None, max_length=2000)
    line_items: list[InvoiceLineItemCreate] = Field(default_factory=list)


class InvoiceUpdate(SQLModel):
    description: Optional[str] = None
    service_id: Optional[int] = None
    amount: Optional[float] = None
    due_date: Optional[datetime] = None
    notes: Optional[str] = None
    line_items: Optional[list[InvoiceLineItemCreate]] = None


class InvoiceStatusUpdate(SQLModel):
    status: str
    reason: Optional[str] = None


class InvoicePaymentUpdate(SQLModel):
    payment_date: datetime
    payment_method: Optional[str] = None
    payment_reference: Optional[str] = None
    payment_notes: Optional[str] = None


class InvoiceStatusHistoryRead(SQLModel):
    id: int
    status: str
    reason: Optional[str]
    changed_by: Optional[str]
    changed_at: datetime


class InvoiceRead(SQLModel):
    id: int
    vendor_id: int
    invoice_number: str
    description: Optional[str]
    amount: float
    status: str
    service_id: Optional[int]
    service_name: Optional[str]
    due_date: Optional[datetime]
    notes: Optional[str]
    rejection_reason: Optional[str]
    payment_date: Optional[datetime]
    payment_method: Optional[str]
    payment_reference: Optional[str]
    payment_notes: Optional[str]
    submitted_at: datetime
    updated_at: Optional[datetime]
    line_items: list[InvoiceLineItemRead] = Field(default_factory=list)
