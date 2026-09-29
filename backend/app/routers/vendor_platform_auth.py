import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlmodel import Session, select

from ..config import get_settings
from ..database import get_session
from ..email import render_shell, try_send_email
from ..models_vendors import (
    Vendor,
    VendorCreate,
    VendorForgotPassword,
    VendorLogin,
    VendorRead,
    VendorResetPassword,
    VendorSetPassword,
    VendorTokenResponse,
)
from ..security import create_access_token, get_current_vendor, hash_password, verify_password
from ..vendor_platform_utils import generate_vendor_code, get_platform_settings, log_audit, notify_admins, send_notification_email

router = APIRouter(prefix="/api/vendor-platform/auth", tags=["vendor-platform"])
settings = get_settings()
RESET_TOKEN_TTL = timedelta(hours=1)


def _to_read(vendor: Vendor) -> VendorRead:
    return VendorRead(**vendor.model_dump(), has_password=bool(vendor.password_hash))


@router.post("/register", response_model=VendorRead, status_code=201)
def register_vendor(
    payload: VendorCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    if payload.email:
        clash = session.exec(
            select(Vendor).where(Vendor.company_name == payload.company_name, Vendor.email == payload.email)
        ).first()
        if clash:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A vendor with this company name and email already exists")

    settings_row = get_platform_settings(session)
    vendor = Vendor(
        **payload.model_dump(),
        vendor_code=generate_vendor_code(session, settings_row),
        self_registered=True,
    )
    session.add(vendor)
    log_audit(session, "vendor.self_registered", vendor.company_name, vendor.vendor_code)
    notify_admins(session, "New vendor registration", f"{vendor.company_name} self-registered and is awaiting review.")
    session.commit()
    session.refresh(vendor)

    send_notification_email(
        background_tasks,
        settings_row,
        settings.resolved_alert_email,
        f"New vendor registration: {vendor.company_name}",
        f"<p><strong>{vendor.company_name}</strong> just registered ({vendor.vendor_code}) and is awaiting review.</p>",
    )
    send_notification_email(
        background_tasks,
        settings_row,
        vendor.email,
        "We've received your vendor registration",
        f"<p>Thanks for registering with Onction Energy. Your vendor code is <strong>{vendor.vendor_code}</strong> — "
        f"save it, you'll need it to log in.</p><p>Your account is <strong>Pending Review</strong>. We'll email you once it's approved.</p>",
    )
    return _to_read(vendor)


@router.post("/login", response_model=VendorTokenResponse)
def login_vendor(payload: VendorLogin, session: Session = Depends(get_session)):
    vendor = session.exec(select(Vendor).where(Vendor.vendor_code == payload.vendor_code)).first()
    if vendor is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect vendor code or password")

    if vendor.status == "Rejected":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=vendor.rejection_reason or "Your registration was rejected")
    if vendor.status == "Inactive":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Your account is inactive — please contact support")

    if vendor.password_hash:
        if not payload.password or not verify_password(payload.password, vendor.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect vendor code or password")

    token = create_access_token(subject=vendor.vendor_code, scope="vendor")
    return VendorTokenResponse(access_token=token, vendor=_to_read(vendor))


@router.get("/me", response_model=VendorRead)
def me(current: Vendor = Depends(get_current_vendor)):
    return _to_read(current)


@router.post("/set-password", status_code=204)
def set_password(
    payload: VendorSetPassword,
    session: Session = Depends(get_session),
    current: Vendor = Depends(get_current_vendor),
):
    if current.password_hash and (not payload.current_password or not verify_password(payload.current_password, current.password_hash)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    current.password_hash = hash_password(payload.new_password)
    session.add(current)
    session.commit()


@router.post("/forgot-password", status_code=202)
def forgot_password(
    payload: VendorForgotPassword,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    """Always responds 202 regardless of whether the email matched an account,
    so this endpoint can't be used to enumerate vendor email addresses."""
    vendor = session.exec(select(Vendor).where(Vendor.email == payload.email)).first()
    if vendor:
        vendor.reset_token = secrets.token_urlsafe(32)
        vendor.reset_expires = datetime.utcnow() + RESET_TOKEN_TTL
        session.add(vendor)
        session.commit()
        reset_url = f"{settings.vendor_portal_url}/reset-password?token={vendor.reset_token}"
        background_tasks.add_task(
            try_send_email,
            vendor.email,
            "Reset your vendor portal password",
            render_shell(
                f'<p>Click the link below to set a new password. It expires in 1 hour.</p>'
                f'<p><a href="{reset_url}">{reset_url}</a></p>'
                f"<p>If you didn't request this, you can ignore this email.</p>"
            ),
        )
    return {"detail": "If that email is registered, a reset link has been sent."}


@router.post("/reset-password", status_code=204)
def reset_password(payload: VendorResetPassword, session: Session = Depends(get_session)):
    vendor = session.exec(select(Vendor).where(Vendor.reset_token == payload.token)).first()
    if vendor is None or vendor.reset_expires is None or vendor.reset_expires < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset link")
    vendor.password_hash = hash_password(payload.new_password)
    vendor.reset_token = None
    vendor.reset_expires = None
    session.add(vendor)
    session.commit()
