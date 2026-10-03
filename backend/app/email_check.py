"""Checks the SMTP settings and, optionally, sends a test email.

Usage (locally or on the server):
    python -m app.email_check                 # connect + log in only, sends nothing
    python -m app.email_check you@example.com # also send a test message

On the VPS:
    docker compose exec backend python -m app.email_check you@example.com
"""
import smtplib
import sys

from .config import get_settings
from .email import render_shell, send_email


def main() -> int:
    s = get_settings()
    print(f"SMTP_HOST      {s.smtp_host or '(empty — emails are skipped!)'}")
    print(f"SMTP_PORT      {s.smtp_port}  ({'implicit TLS' if s.smtp_port == 465 else 'STARTTLS' if s.smtp_use_tls else 'no TLS'})")
    print(f"SMTP_USER      {s.smtp_user or '(none)'}")
    print(f"From           {s.smtp_from_name} <{s.smtp_from_email}>")
    print(f"Alerts go to   {s.resolved_alert_email}")
    if not s.smtp_host:
        return 1
    try:
        cls = smtplib.SMTP_SSL if s.smtp_port == 465 else smtplib.SMTP
        with cls(s.smtp_host, s.smtp_port, timeout=15) as server:
            if s.smtp_use_tls and s.smtp_port != 465:
                server.starttls()
            if s.smtp_user:
                server.login(s.smtp_user, s.smtp_password)
        print("OK: connected and logged in")
    except Exception as exc:  # noqa: BLE001
        print(f"FAILED: {exc}")
        return 1
    if len(sys.argv) > 1:
        send_email(sys.argv[1], "Onction Energy — test email", render_shell("<p>Your email settings work. 🎉</p>"))
        print(f"OK: test email sent to {sys.argv[1]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
