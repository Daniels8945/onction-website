import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from .config import get_settings

settings = get_settings()
logger = logging.getLogger("onction.email")


class EmailNotConfigured(Exception):
    pass


def render_shell(inner_html: str, unsubscribe_url: str | None = None, preheader: str = "") -> str:
    """Wraps email body HTML in the branded Onction shell: navy header with
    the wordmark, white card, teal accent, contact footer. Table layout and
    inline styles only — that's what Outlook/Gmail/Apple Mail all render
    reliably. Marketing sends pass an unsubscribe link (CAN-SPAM/GDPR/NDPA
    require one); transactional mail (confirmations, alerts) doesn't."""
    site = settings.public_site_url.rstrip("/")
    unsubscribe = (
        f'<p style="margin:12px 0 0;font-size:12px;color:#8a98a8;">You\'re receiving this because you subscribed on onctionenergy.com. '
        f'<a href="{unsubscribe_url}" style="color:#8a98a8;text-decoration:underline;">Unsubscribe</a></p>'
        if unsubscribe_url
        else ""
    )
    return f"""<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef2f5;">
  <span style="display:none!important;opacity:0;color:transparent;max-height:0;overflow:hidden;">{preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f5;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;">
        <tr><td style="background:#06121F;padding:22px 32px;">
          <span style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#ffffff;letter-spacing:0.02em;"><strong>ONCTION</strong> ENERGY</span>
        </td></tr>
        <tr><td style="height:3px;background:#13C2B6;line-height:3px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1B2A3D;">
          {inner_html}
        </td></tr>
        <tr><td style="padding:20px 32px 28px;border-top:1px solid #e6ebef;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#5B6B80;">
          Onction Services Limited · NERC-licensed bulk electricity trader<br>
          5C, Adekunle Lawal Road, Off Second Avenue, Ikoyi, Lagos · +234 708 058 2578<br>
          <a href="{site}" style="color:#0FB5A6;text-decoration:none;">onctionenergy.com</a>
          {unsubscribe}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""


def button(label: str, href: str) -> str:
    return (
        f'<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;"><tr>'
        f'<td style="background:#13C2B6;"><a href="{href}" style="display:inline-block;padding:12px 22px;'
        f'font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#06121F;text-decoration:none;">{label} &rarr;</a></td>'
        f"</tr></table>"
    )


def send_email(to_email: str, subject: str, html_body: str, text_body: str | None = None, reply_to: str | None = None) -> None:
    """Sends one email over SMTP. Raises EmailNotConfigured if SMTP_HOST
    isn't set, and re-raises any smtplib error so callers can decide how to
    handle a failed send (log it, count it, retry it)."""
    if not settings.smtp_host:
        raise EmailNotConfigured("SMTP is not configured (set SMTP_HOST, SMTP_USER, SMTP_PASSWORD)")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
    msg["To"] = to_email
    if reply_to:
        msg["Reply-To"] = reply_to
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


def try_send_email(to_email: str, subject: str, html_body: str, text_body: str | None = None, reply_to: str | None = None) -> bool:
    """Best-effort send for non-critical notifications (admin alerts) —
    logs and swallows failures instead of breaking the request that
    triggered them (e.g. a public enquiry submission shouldn't 500 just
    because the alert email bounced)."""
    try:
        send_email(to_email, subject, html_body, text_body, reply_to)
        return True
    except Exception as exc:  # noqa: BLE001 — deliberately broad: never let email break the caller
        logger.warning("Email send failed to %s: %s", to_email, exc)
        return False
