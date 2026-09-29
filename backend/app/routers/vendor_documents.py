from datetime import datetime
from typing import Optional, Union

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from sqlmodel import Session, select

from ..config import get_settings
from ..database import get_session
from ..models_admin import AdminUser
from ..models_vendor_documents import VendorDocument, VendorDocumentRead, VendorDocumentStatusUpdate
from ..models_vendors import Vendor
from ..security import get_current_identity, require_role
from ..storage import build_public_url, delete_from_bucket, upload_to_bucket
from ..vendor_platform_utils import get_platform_settings, log_audit, notify_admins, notify_vendor, send_notification_email

router = APIRouter(prefix="/api/vendor-platform/documents", tags=["vendor-platform"])
site_settings = get_settings()

VALID_STATUSES = {"Pending Review", "Approved", "Rejected"}


def _to_read(document: VendorDocument) -> VendorDocumentRead:
    file_url = build_public_url(document.storage_key) if document.storage_key else None
    return VendorDocumentRead(**document.model_dump(), file_url=file_url)


@router.get("", response_model=list[VendorDocumentRead])
def list_documents(
    vendor_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    session: Session = Depends(get_session),
    identity: tuple[str, Union[AdminUser, Vendor]] = Depends(get_current_identity),
):
    kind, obj = identity
    query = select(VendorDocument)
    if kind == "vendor":
        query = query.where(VendorDocument.vendor_id == obj.id)
    elif vendor_id:
        query = query.where(VendorDocument.vendor_id == vendor_id)
    if status_filter:
        query = query.where(VendorDocument.status == status_filter)
    documents = session.exec(query.order_by(VendorDocument.uploaded_at.desc())).all()
    return [_to_read(d) for d in documents]


@router.get("/{document_id}", response_model=VendorDocumentRead)
def get_document(
    document_id: int,
    session: Session = Depends(get_session),
    identity: tuple[str, Union[AdminUser, Vendor]] = Depends(get_current_identity),
):
    document = session.get(VendorDocument, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    kind, obj = identity
    if kind == "vendor" and document.vendor_id != obj.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return _to_read(document)


@router.post("", response_model=VendorDocumentRead, status_code=201)
async def upload_document(
    background_tasks: BackgroundTasks,
    document_name: str = Form(...),
    document_type: Optional[str] = Form(default=None),
    expiry_date: Optional[datetime] = Form(default=None),
    notes: Optional[str] = Form(default=None),
    vendor_id: Optional[int] = Form(default=None),
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    identity: tuple[str, Union[AdminUser, Vendor]] = Depends(get_current_identity),
):
    kind, obj = identity
    if kind == "vendor":
        target_vendor_id = obj.id
        performed_by = obj.company_name
    else:
        if not vendor_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="vendor_id is required")
        vendor = session.get(Vendor, vendor_id)
        if vendor is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
        target_vendor_id = vendor.id
        performed_by = obj.email

    key, _url, size = await upload_to_bucket(file)

    settings_row = get_platform_settings(session)
    initial_status = "Approved" if settings_row.auto_approve_documents else "Pending Review"

    document = VendorDocument(
        vendor_id=target_vendor_id,
        document_name=document_name,
        document_type=document_type,
        expiry_date=expiry_date,
        notes=notes,
        status=initial_status,
        storage_key=key,
        file_original_name=file.filename,
        file_mime_type=file.content_type,
        file_size=size,
    )
    session.add(document)
    log_audit(session, "document.uploaded", performed_by, f"{document_name} ({target_vendor_id})")
    if kind == "vendor":
        notify_admins(session, "New document uploaded", f"{obj.company_name} uploaded {document_name}")
        send_notification_email(
            background_tasks,
            settings_row,
            site_settings.resolved_alert_email,
            f"New document uploaded: {document_name}",
            f"<p>{obj.company_name} uploaded <strong>{document_name}</strong>.</p>",
        )
    session.commit()
    session.refresh(document)
    return _to_read(document)


@router.put("/{document_id}/status", response_model=VendorDocumentRead)
def update_document_status(
    document_id: int,
    payload: VendorDocumentStatusUpdate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    current: AdminUser = Depends(require_role("Super Admin", "Admin")),
):
    if payload.status not in VALID_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Status must be one of {sorted(VALID_STATUSES)}")
    if payload.status == "Rejected" and not payload.rejection_reason:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A rejection reason is required")

    document = session.get(VendorDocument, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    document.status = payload.status
    document.rejection_reason = payload.rejection_reason if payload.status == "Rejected" else None
    document.updated_at = datetime.utcnow()
    session.add(document)
    log_audit(session, "document.status_changed", current.email, f"{document.document_name} -> {payload.status}")
    message = payload.rejection_reason or f"{document.document_name} was {payload.status.lower()}."
    notify_vendor(session, document.vendor_id, f"Document {payload.status.lower()}", message, type="document")
    vendor = session.get(Vendor, document.vendor_id)
    settings_row = get_platform_settings(session)
    send_notification_email(background_tasks, settings_row, vendor.email, f"Document {payload.status.lower()}: {document.document_name}", f"<p>{message}</p>")
    session.commit()
    session.refresh(document)
    return _to_read(document)


@router.delete("/{document_id}", status_code=204)
def delete_document(
    document_id: int,
    session: Session = Depends(get_session),
    identity: tuple[str, Union[AdminUser, Vendor]] = Depends(get_current_identity),
):
    document = session.get(VendorDocument, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    kind, obj = identity
    if kind == "vendor":
        if document.vendor_id != obj.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
        performed_by = obj.company_name
    else:
        if obj.role not in ("Super Admin", "Admin"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted for your role")
        performed_by = obj.email

    if document.storage_key:
        delete_from_bucket(document.storage_key)
    session.delete(document)
    log_audit(session, "document.deleted", performed_by, document.document_name)
    session.commit()
