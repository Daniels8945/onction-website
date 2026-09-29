import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from .config import get_settings

settings = get_settings()
logger = logging.getLogger("onction.email")


class EmailNotConfigured(Exception):
    pass


def render_shell(inner_html: str, unsubscribe_url: str | None = None) -> str:
    """Wraps arbitrary email body HTML in a minimal branded shell. Every
    marketing send includes an unsubscribe link — required for CAN-SPAM/GDPR
    compliance, not optional polish."""
    footer = (
        f'<p style="margin-top:32px;font-size:12px;color:#5B6B80;">'
        f'Onction Energy · <a href="{unsubscribe_url}" style="color:#5B6B80;">Unsubscribe</a></p>'
        if unsubscribe_url
        else ""
    )
    return f"""
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1B2A3D;">
      <p style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#0FB5A6;font-weight:600;">Onction Energy</p>
      {inner_html}
      {footer}
    </div>
    """


def send_email(to_email: str, subject: str, html_body: str, text_body: str | None = None) -> None:
    """Sends one email over SMTP. Raises EmailNotConfigured if SMTP_HOST
    isn't set, and re-raises any smtplib error so callers can decide how to
    handle a failed send (log it, count it, retry it)."""
    if not settings.smtp_host:
        raise EmailNotConfigured("SMTP is not configured (set SMTP_HOST, SMTP_USER, SMTP_PASSWORD)")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
    msg["To"] = to_email
    if text_body:
        msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    # Port 465 is implicit TLS (the connection is encrypted from the start —
    # smtplib.SMTP_SSL); everything else (587, 25, ...) is plaintext upgraded
    # via STARTTLS. Many hosting-provided mailboxes (cPanel, etc.) default to
    # 465, so both need to work rather than assuming STARTTLS everywhere.
    smtp_class = smtplib.SMTP_SSL if settings.smtp_port == 465 else smtplib.SMTP
    with smtp_class(settings.smtp_host, settings.smtp_port, timeout=15) as server:
        if settings.smtp_use_tls and settings.smtp_port != 465:
            server.starttls()
        if settings.smtp_user:
            server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_from_email, [to_email], msg.as_string())


def try_send_email(to_email: str, subject: str, html_body: str, text_body: str | None = None) -> bool:
    """Best-effort send for non-critical notifications (admin alerts) —
    logs and swallows failures instead of breaking the request that
    triggered them (e.g. a public enquiry submission shouldn't 500 just
    because the alert email bounced)."""
    try:
        send_email(to_email, subject, html_body, text_body)
        return True
    except Exception as exc:  # noqa: BLE001 — deliberately broad: never let email break the caller
        logger.warning("Email send failed to %s: %s", to_email, exc)
        return False
