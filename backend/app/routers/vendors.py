from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlmodel import Session, delete, select

from ..database import get_session
from ..models_admin import AdminUser
from ..models_invoices import Invoice, InvoiceLineItem, InvoiceStatusHistory
from ..models_vendor_documents import VendorDocument
from ..models_vendor_notifications import VendorNotification
from ..models_vendors import (
    Vendor,
    VendorCreate,
    VendorNote,
    VendorNoteCreate,
    VendorNoteRead,
    VendorRead,
    VendorStatusUpdate,
    VendorUpdate,
)
from ..security import get_current_admin, require_role
from ..vendor_platform_utils import (
    generate_vendor_code,
    get_platform_settings,
    log_audit,
    notify_vendor,
    send_notification_email,
)

router = APIRouter(prefix="/api/vendor-platform/vendors", tags=["vendor-platform"])

VALID_STATUSES = {"Pending Review", "Approved", "Rejected", "Inactive"}


def _to_read(vendor: Vendor) -> VendorRead:
    return VendorRead(**vendor.model_dump(), has_password=bool(vendor.password_hash))


@router.get("", response_model=list[VendorRead])
def list_vendors(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    business_type: Optional[str] = None,
    search: Optional[str] = None,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    query = select(Vendor)
    if status_filter:
        query = query.where(Vendor.status == status_filter)
    if business_type:
        query = query.where(Vendor.business_type == business_type)
    vendors = session.exec(query.order_by(Vendor.submitted_at.desc())).all()
    if search:
        term = search.lower()
        vendors = [
            v for v in vendors
            if term in (v.company_name or "").lower()
            or term in (v.email or "").lower()
            or term in (v.vendor_code or "").lower()
            or term in f"{v.first_name or ''} {v.last_name or ''}".lower()
            or term in (v.products_services or "").lower()
        ]
    return [_to_read(v) for v in vendors]


@router.get("/{vendor_id}", response_model=VendorRead)
def get_vendor(
    vendor_id: int,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    vendor = session.get(Vendor, vendor_id)
    if vendor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    return _to_read(vendor)


@router.post("", response_model=VendorRead, status_code=201)
def create_vendor(
    payload: VendorCreate,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(require_role("Super Admin", "Admin")),
):
    if payload.email:
        clash = session.exec(
            select(Vendor).where(Vendor.company_name == payload.company_name, Vendor.email == payload.email)
        ).first()
        if clash:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A vendor with this company name and email already exists")

    settings_row = get_platform_settings(session)
    vendor = Vendor(**payload.model_dump(), vendor_code=generate_vendor_code(session, settings_row))
    session.add(vendor)
    log_audit(session, "vendor.created", current.email, f"Created vendor {vendor.company_name}")
    session.commit()
    session.refresh(vendor)
    return _to_read(vendor)


@router.put("/{vendor_id}", response_model=VendorRead)
def update_vendor(
    vendor_id: int,
    payload: VendorUpdate,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(require_role("Super Admin", "Admin")),
):
    vendor = session.get(Vendor, vendor_id)
    if vendor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(vendor, field, value)
    vendor.updated_at = datetime.utcnow()
    session.add(vendor)
    log_audit(session, "vendor.updated", current.email, f"Updated vendor {vendor.company_name}")
    session.commit()
    session.refresh(vendor)
    return _to_read(vendor)


@router.put("/{vendor_id}/status", response_model=VendorRead)
def update_vendor_status(
    vendor_id: int,
    payload: VendorStatusUpdate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(require_role("Super Admin", "Admin")),
):
    if payload.status not in VALID_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Status must be one of {sorted(VALID_STATUSES)}")
    if payload.status == "Rejected" and not payload.rejection_reason:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A rejection reason is required")

    vendor = session.get(Vendor, vendor_id)
    if vendor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")

    vendor.status = payload.status
    vendor.rejection_reason = payload.rejection_reason if payload.status == "Rejected" else None
    vendor.status_updated_at = datetime.utcnow()
    session.add(vendor)
    log_audit(session, "vendor.status_changed", current.email, f"{vendor.company_name} -> {payload.status}")
    message = (
        payload.rejection_reason if payload.status == "Rejected" else f"Your vendor account status changed to {payload.status}."
    )
    notify_vendor(session, vendor.id, f"Your account is now {payload.status}", message, type="status")
    settings_row = get_platform_settings(session)
    send_notification_email(
        background_tasks, settings_row, vendor.email, f"Your Onction vendor account is now {payload.status}", f"<p>{message}</p>"
    )
    session.commit()
    session.refresh(vendor)
    return _to_read(vendor)


@router.delete("/{vendor_id}", status_code=204)
def delete_vendor(
    vendor_id: int,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(require_role("Super Admin", "Admin")),
):
    vendor = session.get(Vendor, vendor_id)
    if vendor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")

    # No ORM cascade is configured (plain FK ints, matching the rest of this
    # codebase's style) — clear dependent rows first or these deletes violate FKs.
    invoice_ids = session.exec(select(Invoice.id).where(Invoice.vendor_id == vendor_id)).all()
    if invoice_ids:
        session.exec(delete(InvoiceLineItem).where(InvoiceLineItem.invoice_id.in_(invoice_ids)))
        session.exec(delete(InvoiceStatusHistory).where(InvoiceStatusHistory.invoice_id.in_(invoice_ids)))
        session.exec(delete(Invoice).where(Invoice.vendor_id == vendor_id))
    session.exec(delete(VendorDocument).where(VendorDocument.vendor_id == vendor_id))
    session.exec(delete(VendorNotification).where(VendorNotification.vendor_id == vendor_id))
    session.exec(delete(VendorNote).where(VendorNote.vendor_id == vendor_id))

    company_name = vendor.company_name
    session.delete(vendor)
    log_audit(session, "vendor.deleted", current.email, f"Deleted vendor {company_name}")
    session.commit()


@router.get("/{vendor_id}/notes", response_model=list[VendorNoteRead])
def list_vendor_notes(
    vendor_id: int,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    return session.exec(
        select(VendorNote).where(VendorNote.vendor_id == vendor_id).order_by(VendorNote.created_at.desc())
    ).all()


@router.post("/{vendor_id}/notes", response_model=VendorNoteRead, status_code=201)
def add_vendor_note(
    vendor_id: int,
    payload: VendorNoteCreate,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(require_role("Super Admin", "Admin")),
):
    vendor = session.get(Vendor, vendor_id)
    if vendor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    note = VendorNote(vendor_id=vendor_id, note=payload.note, created_by=current.email)
    session.add(note)
    session.commit()
    session.refresh(note)
    return note


@router.delete("/notes/{note_id}", status_code=204)
def delete_vendor_note(
    note_id: int,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(require_role("Super Admin", "Admin")),
):
    note = session.get(VendorNote, note_id)
    if note is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    session.delete(note)
    session.commit()
