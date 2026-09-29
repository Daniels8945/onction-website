from typing import Union

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..database import get_session
from ..models_admin import AdminUser
from ..models_vendor_notifications import VendorNotification, VendorNotificationRead
from ..models_vendors import Vendor
from ..security import get_current_identity

router = APIRouter(prefix="/api/vendor-platform/notifications", tags=["vendor-platform"])


def _scope(query, identity: tuple[str, Union[AdminUser, Vendor]]):
    kind, obj = identity
    if kind == "admin":
        return query.where(VendorNotification.is_admin == True)  # noqa: E712
    return query.where(VendorNotification.vendor_id == obj.id)


@router.get("", response_model=list[VendorNotificationRead])
def list_notifications(
    session: Session = Depends(get_session),
    identity: tuple[str, Union[AdminUser, Vendor]] = Depends(get_current_identity),
):
    query = _scope(select(VendorNotification), identity)
    return session.exec(query.order_by(VendorNotification.created_at.desc())).all()


@router.put("/read-all", status_code=204)
def mark_all_read(
    session: Session = Depends(get_session),
    identity: tuple[str, Union[AdminUser, Vendor]] = Depends(get_current_identity),
):
    query = _scope(select(VendorNotification), identity)
    for notification in session.exec(query).all():
        notification.is_read = True
        session.add(notification)
    session.commit()


def _load_owned(session: Session, notification_id: int, identity: tuple[str, Union[AdminUser, Vendor]]) -> VendorNotification:
    notification = session.get(VendorNotification, notification_id)
    if notification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    kind, obj = identity
    owned = notification.is_admin if kind == "admin" else notification.vendor_id == obj.id
    if not owned:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return notification


@router.put("/{notification_id}/read", response_model=VendorNotificationRead)
def mark_read(
    notification_id: int,
    session: Session = Depends(get_session),
    identity: tuple[str, Union[AdminUser, Vendor]] = Depends(get_current_identity),
):
    notification = _load_owned(session, notification_id, identity)
    notification.is_read = True
    session.add(notification)
    session.commit()
    session.refresh(notification)
    return notification


@router.delete("/{notification_id}", status_code=204)
def delete_notification(
    notification_id: int,
    session: Session = Depends(get_session),
    identity: tuple[str, Union[AdminUser, Vendor]] = Depends(get_current_identity),
):
    notification = _load_owned(session, notification_id, identity)
    session.delete(notification)
    session.commit()
