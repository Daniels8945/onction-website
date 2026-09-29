import random
import string
from datetime import datetime

from fastapi import BackgroundTasks
from sqlmodel import Session, select

from .email import render_shell, try_send_email
from .models_vendor_audit import VendorAuditLog
from .models_vendor_notifications import VendorNotification
from .models_vendor_settings import SETTINGS_ROW_ID, VendorPlatformSettings
from .models_vendors import Vendor
from .models_invoices import Invoice


def get_platform_settings(session: Session) -> VendorPlatformSettings:
    """Fetches the single settings row, creating it with defaults on first use —
    there's no separate seed step, so whichever endpoint touches settings first
    (vendor code generation, an invoice number, the settings page itself) creates it."""
    settings_row = session.get(VendorPlatformSettings, SETTINGS_ROW_ID)
    if settings_row is None:
        settings_row = VendorPlatformSettings(id=SETTINGS_ROW_ID)
        session.add(settings_row)
        session.commit()
        session.refresh(settings_row)
    return settings_row


def generate_vendor_code(session: Session, settings_row: VendorPlatformSettings) -> str:
    """e.g. OSL-2026-XYZ-1234, matching the format vendors already have on file
    (in emails, printed paperwork, etc.) from the original vendor-registration app."""
    year = datetime.utcnow().year
    for _ in range(20):
        letters = "".join(random.choices(string.ascii_uppercase, k=3))
        digits = "".join(random.choices(string.digits, k=4))
        code = f"{settings_row.vendor_code_prefix}-{year}-{letters}-{digits}"
        if not session.exec(select(Vendor).where(Vendor.vendor_code == code)).first():
            return code
    raise RuntimeError("Could not generate a unique vendor code")


def generate_invoice_number(session: Session, settings_row: VendorPlatformSettings) -> str:
    year = datetime.utcnow().year
    for _ in range(20):
        suffix = "".join(random.choices(string.digits, k=6))
        number = f"{settings_row.invoice_prefix}-{year}-{suffix}"
        if not session.exec(select(Invoice).where(Invoice.invoice_number == number)).first():
            return number
    raise RuntimeError("Could not generate a unique invoice number")


def log_audit(session: Session, action: str, performed_by: str, details: str | None = None) -> None:
    """Adds an audit row to the pending transaction — does not commit, so callers
    can bundle it with the rest of their action in one commit."""
    session.add(VendorAuditLog(action=action, performed_by=performed_by, details=details))


def notify_vendor(session: Session, vendor_id: int, title: str, message: str, type: str = "info") -> None:
    session.add(VendorNotification(vendor_id=vendor_id, is_admin=False, type=type, title=title, message=message))


def notify_admins(session: Session, title: str, message: str, type: str = "info") -> None:
    session.add(VendorNotification(vendor_id=None, is_admin=True, type=type, title=title, message=message))


def send_notification_email(
    background_tasks: BackgroundTasks,
    settings_row: VendorPlatformSettings,
    to_email: str | None,
    subject: str,
    body_html: str,
) -> None:
    """Backs up an in-app notification with a real email, gated by the
    "Send email notifications" toggle on the settings page — unlike password
    reset emails (always sent; security-critical, not a notification preference),
    these are all optional status-update style notices."""
    if not to_email or not settings_row.email_notifications:
        return
    background_tasks.add_task(try_send_email, to_email, subject, render_shell(body_html))
