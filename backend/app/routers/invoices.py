from datetime import datetime
from typing import Optional, Union

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlmodel import Session, delete, select

from ..config import get_settings
from ..database import get_session
from ..models_admin import AdminUser
from ..models_invoices import (
    Invoice,
    InvoiceCreate,
    InvoiceLineItem,
    InvoiceLineItemRead,
    InvoicePaymentUpdate,
    InvoiceRead,
    InvoiceStatusHistory,
    InvoiceStatusHistoryRead,
    InvoiceStatusUpdate,
    InvoiceUpdate,
)
from ..models_services import Service
from ..models_vendors import Vendor
from ..security import get_current_identity, require_role
from ..vendor_platform_utils import (
    generate_invoice_number,
    get_platform_settings,
    log_audit,
    notify_admins,
    notify_vendor,
    send_notification_email,
)

router = APIRouter(prefix="/api/vendor-platform/invoices", tags=["vendor-platform"])
site_settings = get_settings()

VALID_STATUSES = {"Submitted", "Under Review", "Approved", "Paid", "Rejected"}
EDITABLE_STATUSES = {"Submitted"}
DELETABLE_STATUSES = {"Submitted", "Rejected"}


def _to_read(session: Session, invoice: Invoice) -> InvoiceRead:
    line_items = session.exec(select(InvoiceLineItem).where(InvoiceLineItem.invoice_id == invoice.id)).all()
    return InvoiceRead(**invoice.model_dump(), line_items=[InvoiceLineItemRead(**li.model_dump()) for li in line_items])


def _require_admin(identity: tuple[str, Union[AdminUser, Vendor]]) -> AdminUser:
    kind, obj = identity
    if kind != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins only")
    return obj


def _load_for_identity(session: Session, invoice_id: int, identity: tuple[str, Union[AdminUser, Vendor]]) -> Invoice:
    invoice = session.get(Invoice, invoice_id)
    if invoice is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    kind, obj = identity
    if kind == "vendor" and invoice.vendor_id != obj.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    return invoice


@router.get("", response_model=list[InvoiceRead])
def list_invoices(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    vendor_id: Optional[int] = None,
    session: Session = Depends(get_session),
    identity: tuple[str, Union[AdminUser, Vendor]] = Depends(get_current_identity),
):
    kind, obj = identity
    query = select(Invoice)
    if kind == "vendor":
        query = query.where(Invoice.vendor_id == obj.id)
    elif vendor_id:
        query = query.where(Invoice.vendor_id == vendor_id)
    if status_filter:
        query = query.where(Invoice.status == status_filter)
    invoices = session.exec(query.order_by(Invoice.submitted_at.desc())).all()
    return [_to_read(session, inv) for inv in invoices]


@router.get("/{invoice_id}", response_model=InvoiceRead)
def get_invoice(
    invoice_id: int,
    session: Session = Depends(get_session),
    identity: tuple[str, Union[AdminUser, Vendor]] = Depends(get_current_identity),
):
    invoice = _load_for_identity(session, invoice_id, identity)
    return _to_read(session, invoice)


@router.get("/{invoice_id}/history", response_model=list[InvoiceStatusHistoryRead])
def get_invoice_history(
    invoice_id: int,
    session: Session = Depends(get_session),
    identity: tuple[str, Union[AdminUser, Vendor]] = Depends(get_current_identity),
):
    _load_for_identity(session, invoice_id, identity)
    return session.exec(
        select(InvoiceStatusHistory).where(InvoiceStatusHistory.invoice_id == invoice_id).order_by(InvoiceStatusHistory.changed_at)
    ).all()


@router.post("", response_model=InvoiceRead, status_code=201)
def create_invoice(
    payload: InvoiceCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    identity: tuple[str, Union[AdminUser, Vendor]] = Depends(get_current_identity),
):
    kind, obj = identity
    if kind == "vendor":
        vendor = obj
        vendor_id = obj.id
        performed_by = obj.company_name
    else:
        if not payload.vendor_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="vendor_id is required")
        vendor = session.get(Vendor, payload.vendor_id)
        if vendor is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
        vendor_id = vendor.id
        performed_by = obj.email

    service_name = None
    if payload.service_id:
        service = session.get(Service, payload.service_id)
        if service is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
        service_name = service.name

    settings_row = get_platform_settings(session)
    invoice_number = payload.invoice_number or generate_invoice_number(session, settings_row)
    if payload.invoice_number:
        clash = session.exec(select(Invoice).where(Invoice.invoice_number == invoice_number)).first()
        if clash:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An invoice with this number already exists")

    invoice = Invoice(
        vendor_id=vendor_id,
        invoice_number=invoice_number,
        description=payload.description,
        amount=payload.amount,
        service_id=payload.service_id,
        service_name=service_name,
        due_date=payload.due_date,
        notes=payload.notes,
    )
    session.add(invoice)
    session.flush()  # get invoice.id before inserting line items
    for item in payload.line_items:
        session.add(
            InvoiceLineItem(
                invoice_id=invoice.id,
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price,
                amount=item.quantity * item.unit_price,
            )
        )
    log_audit(session, "invoice.created", performed_by, f"Invoice {invoice.invoice_number}")
    settings_row = get_platform_settings(session)
    if kind == "vendor":
        notify_admins(session, "New invoice submitted", f"{obj.company_name} submitted invoice {invoice.invoice_number}")
        send_notification_email(
            background_tasks,
            settings_row,
            site_settings.resolved_alert_email,
            f"New invoice submitted: {invoice.invoice_number}",
            f"<p>{vendor.company_name} submitted invoice <strong>{invoice.invoice_number}</strong> for {invoice.amount}.</p>",
        )
    send_notification_email(
        background_tasks,
        settings_row,
        vendor.email,
        f"Invoice {invoice.invoice_number} received",
        f"<p>We've received your invoice <strong>{invoice.invoice_number}</strong>. We'll notify you once it's reviewed.</p>",
    )
    session.commit()
    session.refresh(invoice)
    return _to_read(session, invoice)


@router.put("/{invoice_id}", response_model=InvoiceRead)
def update_invoice(
    invoice_id: int,
    payload: InvoiceUpdate,
    session: Session = Depends(get_session),
    identity: tuple[str, Union[AdminUser, Vendor]] = Depends(get_current_identity),
):
    invoice = _load_for_identity(session, invoice_id, identity)
    if invoice.status not in EDITABLE_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Only {sorted(EDITABLE_STATUSES)} invoices can be edited")

    updates = payload.model_dump(exclude_unset=True, exclude={"line_items"})
    for field, value in updates.items():
        setattr(invoice, field, value)
    if payload.line_items is not None:
        session.exec(delete(InvoiceLineItem).where(InvoiceLineItem.invoice_id == invoice.id))
        for item in payload.line_items:
            session.add(
                InvoiceLineItem(
                    invoice_id=invoice.id,
                    description=item.description,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    amount=item.quantity * item.unit_price,
                )
            )
    invoice.updated_at = datetime.utcnow()
    session.add(invoice)
    session.commit()
    session.refresh(invoice)
    return _to_read(session, invoice)


@router.delete("/{invoice_id}", status_code=204)
def delete_invoice(
    invoice_id: int,
    session: Session = Depends(get_session),
    identity: tuple[str, Union[AdminUser, Vendor]] = Depends(get_current_identity),
):
    invoice = _load_for_identity(session, invoice_id, identity)
    kind, obj = identity
    if kind == "vendor" and invoice.status not in DELETABLE_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Only {sorted(DELETABLE_STATUSES)} invoices can be deleted")
    if kind == "admin" and obj.role not in ("Super Admin", "Admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted for your role")

    session.exec(delete(InvoiceLineItem).where(InvoiceLineItem.invoice_id == invoice_id))
    session.exec(delete(InvoiceStatusHistory).where(InvoiceStatusHistory.invoice_id == invoice_id))
    session.delete(invoice)
    session.commit()


@router.put("/{invoice_id}/status", response_model=InvoiceRead)
def update_invoice_status(
    invoice_id: int,
    payload: InvoiceStatusUpdate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(require_role("Super Admin", "Admin")),
):
    if payload.status not in VALID_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Status must be one of {sorted(VALID_STATUSES)}")
    if payload.status == "Rejected" and not payload.reason:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A rejection reason is required")

    invoice = session.get(Invoice, invoice_id)
    if invoice is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    invoice.status = payload.status
    invoice.rejection_reason = payload.reason if payload.status == "Rejected" else None
    invoice.updated_at = datetime.utcnow()
    session.add(invoice)
    session.add(InvoiceStatusHistory(invoice_id=invoice.id, status=payload.status, reason=payload.reason, changed_by=current.email))
    log_audit(session, "invoice.status_changed", current.email, f"{invoice.invoice_number} -> {payload.status}")
    message = payload.reason or f"Your invoice status changed to {payload.status}."
    notify_vendor(session, invoice.vendor_id, f"Invoice {invoice.invoice_number} {payload.status.lower()}", message, type="invoice")
    vendor = session.get(Vendor, invoice.vendor_id)
    settings_row = get_platform_settings(session)
    send_notification_email(
        background_tasks, settings_row, vendor.email, f"Invoice {invoice.invoice_number} {payload.status.lower()}", f"<p>{message}</p>"
    )
    session.commit()
    session.refresh(invoice)
    return _to_read(session, invoice)


@router.post("/{invoice_id}/payment", response_model=InvoiceRead)
def record_payment(
    invoice_id: int,
    payload: InvoicePaymentUpdate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(require_role("Super Admin", "Admin")),
):
    invoice = session.get(Invoice, invoice_id)
    if invoice is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    invoice.payment_date = payload.payment_date
    invoice.payment_method = payload.payment_method
    invoice.payment_reference = payload.payment_reference
    invoice.payment_notes = payload.payment_notes
    invoice.status = "Paid"
    invoice.updated_at = datetime.utcnow()
    session.add(invoice)
    session.add(InvoiceStatusHistory(invoice_id=invoice.id, status="Paid", changed_by=current.email))
    log_audit(session, "invoice.paid", current.email, f"{invoice.invoice_number} — {payload.payment_method or 'payment recorded'}")
    notify_vendor(session, invoice.vendor_id, f"Invoice {invoice.invoice_number} paid", "Payment has been recorded for this invoice.", type="invoice")
    vendor = session.get(Vendor, invoice.vendor_id)
    settings_row = get_platform_settings(session)
    send_notification_email(
        background_tasks,
        settings_row,
        vendor.email,
        f"Invoice {invoice.invoice_number} paid",
        f"<p>Payment has been recorded for invoice <strong>{invoice.invoice_number}</strong>{f' via {payload.payment_method}' if payload.payment_method else ''}.</p>",
    )
    session.commit()
    session.refresh(invoice)
    return _to_read(session, invoice)
