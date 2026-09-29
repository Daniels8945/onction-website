import csv
import io
from typing import Optional

from fastapi import APIRouter, Depends, Query, Response
from sqlmodel import Session, delete, select

from ..database import get_session
from ..models_admin import AdminUser
from ..models_vendor_audit import VendorAuditLog, VendorAuditLogRead
from ..security import get_current_admin, require_role

router = APIRouter(prefix="/api/vendor-platform/audit", tags=["vendor-platform"])


@router.get("", response_model=list[VendorAuditLogRead])
def list_audit_log(
    search: Optional[str] = None,
    limit: int = Query(default=200, le=1000),
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    entries = session.exec(select(VendorAuditLog).order_by(VendorAuditLog.timestamp.desc()).limit(limit)).all()
    if search:
        term = search.lower()
        entries = [
            e for e in entries
            if term in e.action.lower() or term in (e.performed_by or "").lower() or term in (e.details or "").lower()
        ]
    return entries


@router.get("/export")
def export_audit_log(
    session: Session = Depends(get_session),
    current: AdminUser = Depends(get_current_admin),
):
    entries = session.exec(select(VendorAuditLog).order_by(VendorAuditLog.timestamp.desc())).all()
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Action", "Performed by", "Details", "Timestamp"])
    for e in entries:
        writer.writerow([e.action, e.performed_by, e.details or "", e.timestamp.isoformat()])
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=vendor-platform-audit-log.csv"},
    )


@router.delete("", status_code=204)
def clear_audit_log(
    session: Session = Depends(get_session),
    current: AdminUser = Depends(require_role("Super Admin")),
):
    session.exec(delete(VendorAuditLog))
    session.commit()
